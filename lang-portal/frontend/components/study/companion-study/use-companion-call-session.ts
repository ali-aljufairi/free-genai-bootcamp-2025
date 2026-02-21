"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import * as Sentry from "@sentry/nextjs";
import type { SeverityLevel } from "@sentry/core";
import { subscriptionApi } from "@/services/api";
import { MAX_RECONNECT_ATTEMPTS, VAPI_PUBLIC_KEY, isRecoverableError } from "./constants";
import type { CallStatus, TranscriptMessage, VapiClient } from "./types";

interface UseCompanionCallSessionArgs {
    sessionId: string;
    selectedAssistant: string;
    onComplete: () => void;
}

interface UseCompanionCallSessionResult {
    callStatus: CallStatus;
    isVapiInitialized: boolean;
    assistantIsSpeaking: boolean;
    transcriptMessages: TranscriptMessage[];
    isReconnecting: boolean;
    isFinalizingSession: boolean;
    hasSavedSession: boolean;
    reconnectAttempts: number;
    startCall: () => Promise<void>;
    endCall: () => Promise<void>;
}

function extractVapiErrorMessage(err: unknown): string {
    if (err instanceof Error) {
        return err.message;
    }

    if (typeof err === "string") {
        return err;
    }

    const errObj = err as {
        message?: unknown;
        error?: {
            errorMsg?: unknown;
            message?: unknown;
        };
    };

    if (typeof errObj.error?.errorMsg === "string") {
        return errObj.error.errorMsg;
    }

    if (typeof errObj.error?.message === "string") {
        return errObj.error.message;
    }

    if (typeof errObj.message === "string") {
        return errObj.message;
    }

    return "Unknown error";
}

export function useCompanionCallSession({
    sessionId,
    selectedAssistant,
    onComplete,
}: UseCompanionCallSessionArgs): UseCompanionCallSessionResult {
    const [callStatus, setCallStatus] = useState<CallStatus>("idle");
    const [isVapiInitialized, setIsVapiInitialized] = useState(false);
    const [assistantIsSpeaking, setAssistantIsSpeaking] = useState(false);
    const [transcriptMessages, setTranscriptMessages] = useState<TranscriptMessage[]>([]);
    const [isReconnecting, setIsReconnecting] = useState(false);
    const [isFinalizingSession, setIsFinalizingSession] = useState(false);
    const [hasSavedSession, setHasSavedSession] = useState(false);
    const [reconnectAttempts, setReconnectAttempts] = useState(0);

    const vapiRef = useRef<VapiClient | null>(null);
    const hasSavedRef = useRef(false);
    const isFinalizingSessionRef = useRef(false);
    const callStartTimeRef = useRef<Date | null>(null);
    const transcriptMessagesRef = useRef<TranscriptMessage[]>([]);
    const reconnectAttemptsRef = useRef(0);
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const callStatusRef = useRef<CallStatus>("idle");
    const isReconnectingRef = useRef(false);
    const selectedAssistantRef = useRef<string>(selectedAssistant);
    const onCompleteRef = useRef(onComplete);
    const manualHangupRef = useRef(false);
    const callCompletionHandledRef = useRef(false);

    const setStatus = useCallback((nextStatus: CallStatus) => {
        callStatusRef.current = nextStatus;
        setCallStatus(nextStatus);
    }, []);

    const clearReconnectState = useCallback(() => {
        isReconnectingRef.current = false;
        setIsReconnecting(false);
        reconnectAttemptsRef.current = 0;
        setReconnectAttempts(0);
    }, []);

    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    useEffect(() => {
        selectedAssistantRef.current = selectedAssistant;
    }, [selectedAssistant]);

    const getCallContext = useCallback(() => ({
        sessionId,
        assistantId: selectedAssistantRef.current,
        callStatus: callStatusRef.current,
        hasCallStarted: callStartTimeRef.current !== null,
        reconnectAttempts: reconnectAttemptsRef.current,
        isReconnecting: isReconnectingRef.current,
        hasSaved: hasSavedRef.current,
        manualHangup: manualHangupRef.current,
    }), [sessionId]);

    const addCallBreadcrumb = useCallback((
        message: string,
        data: Record<string, unknown> = {},
        level: SeverityLevel = "info",
    ) => {
        Sentry.addBreadcrumb({
            category: "companion-call",
            message,
            level,
            data: {
                ...getCallContext(),
                ...data,
            },
        });
    }, [getCallContext]);

    const cleanup = useCallback((reason = "cleanup") => {
        addCallBreadcrumb("cleanup", { reason });

        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        if (vapiRef.current) {
            try {
                vapiRef.current.stop();
            } catch {
                // Ignore stop errors during cleanup paths.
            }

            if (reason === "component-unmount") {
                vapiRef.current.removeAllListeners?.();
                vapiRef.current = null;
            }
        }

        const shouldUpdateUiState = reason !== "component-unmount";
        callStatusRef.current = "ended";
        if (shouldUpdateUiState) {
            setCallStatus("ended");
            setAssistantIsSpeaking(false);
            setTranscriptMessages([]);
            clearReconnectState();
        }

        transcriptMessagesRef.current = [];
        callStartTimeRef.current = null;
        isReconnectingRef.current = false;
        reconnectAttemptsRef.current = 0;
        manualHangupRef.current = false;
        hasSavedRef.current = false;
    }, [addCallBreadcrumb, clearReconnectState]);

    const saveCompanionSession = useCallback(async () => {
        const startedAt = callStartTimeRef.current;
        if (!startedAt) {
            addCallBreadcrumb("save-session-skipped", { reason: "missing-start-time" }, "warning");
            return;
        }

        const finalMessages = transcriptMessagesRef.current.filter((message) => !message.isPartial);
        const userTranscript = finalMessages
            .filter((message) => message.role === "user")
            .map((message) => message.text)
            .join(" ");
        const assistantTranscript = finalMessages
            .filter((message) => message.role === "assistant")
            .map((message) => message.text)
            .join(" ");

        try {
            const endedAt = new Date();
            const durationSeconds = Math.max(0, Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000));

            addCallBreadcrumb("save-session-started", {
                durationSeconds,
                userTranscriptLength: userTranscript.length,
                assistantTranscriptLength: assistantTranscript.length,
            });

            const response = await fetch("/api/companion-study/save", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    session_id: sessionId,
                    assistant_id: selectedAssistantRef.current,
                    user_transcript: userTranscript,
                    assistant_transcript: assistantTranscript,
                    duration_seconds: durationSeconds,
                    started_at: startedAt.toISOString(),
                    ended_at: endedAt.toISOString(),
                }),
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: "Unknown error" }));
                console.error("Failed to save companion study session:", error);
                Sentry.captureMessage("Companion session save failed", {
                    level: "error",
                    tags: {
                        location: "companion-study",
                        component: "save-session",
                    },
                    extra: {
                        ...getCallContext(),
                        status: response.status,
                        saveError: error,
                    },
                });
                return;
            }

            addCallBreadcrumb("save-session-success", { status: response.status });
        } catch (error) {
            console.error("Error saving companion study session:", error);
            Sentry.captureException(error, {
                tags: {
                    location: "companion-study",
                    component: "save-session",
                },
                extra: getCallContext(),
            });
        }
    }, [addCallBreadcrumb, getCallContext, sessionId]);

    const handleCallEnd = useCallback(async (reason = "unknown") => {
        if (callCompletionHandledRef.current) {
            addCallBreadcrumb("call-end-ignored", { reason, ignored: true });
            return;
        }

        callCompletionHandledRef.current = true;
        isFinalizingSessionRef.current = true;
        setIsFinalizingSession(true);

        addCallBreadcrumb("call-end", { reason }, manualHangupRef.current ? "info" : "warning");

        const shouldCaptureEndEvent = reason !== "manual-hangup" && reason !== "manual-hangup-event";
        if (shouldCaptureEndEvent) {
            Sentry.captureMessage("Companion call ended", {
                level: "warning",
                tags: {
                    location: "companion-study",
                    component: "call-lifecycle",
                    reason,
                },
                extra: getCallContext(),
            });
        }

        try {
            if (!hasSavedRef.current) {
                hasSavedRef.current = true;
                await saveCompanionSession();
            }

            setHasSavedSession(true);
            cleanup(reason);
            onCompleteRef.current?.();
        } finally {
            isFinalizingSessionRef.current = false;
            setIsFinalizingSession(false);
        }
    }, [addCallBreadcrumb, cleanup, getCallContext, saveCompanionSession]);

    const attemptReconnection = useCallback(async () => {
        if (!vapiRef.current || !callStartTimeRef.current || hasSavedRef.current) {
            addCallBreadcrumb("reconnect-skipped", {
                hasVapi: Boolean(vapiRef.current),
                hasCallStarted: callStartTimeRef.current !== null,
                hasSaved: hasSavedRef.current,
            });
            return;
        }

        const currentAttempts = reconnectAttemptsRef.current;
        if (currentAttempts >= MAX_RECONNECT_ATTEMPTS) {
            console.error("Max reconnection attempts reached");
            Sentry.captureMessage("Companion reconnect attempts exhausted", {
                level: "warning",
                tags: {
                    location: "companion-study",
                    component: "reconnect",
                },
                extra: getCallContext(),
            });
            toast.error("Connection Lost", {
                description: "Unable to reconnect after multiple attempts. Your session will be saved.",
            });
            await handleCallEnd("reconnect-exhausted");
            return;
        }

        isReconnectingRef.current = true;
        setIsReconnecting(true);
        reconnectAttemptsRef.current = currentAttempts + 1;
        setReconnectAttempts(reconnectAttemptsRef.current);
        setStatus("connecting");

        addCallBreadcrumb("reconnect-attempt", {
            attempt: reconnectAttemptsRef.current,
            maxReconnectAttempts: MAX_RECONNECT_ATTEMPTS,
        }, "warning");

        toast.info("Reconnecting...", {
            description: `Attempt ${currentAttempts + 1} of ${MAX_RECONNECT_ATTEMPTS}`,
            duration: 3000,
        });

        reconnectTimeoutRef.current = setTimeout(async () => {
            try {
                if (vapiRef.current && callStartTimeRef.current && !hasSavedRef.current) {
                    await vapiRef.current.start(selectedAssistantRef.current);

                    if (isReconnectingRef.current) {
                        clearReconnectState();
                        addCallBreadcrumb("reconnect-success", {}, "info");
                        toast.success("Reconnected", {
                            description: "Connection restored successfully.",
                            duration: 3000,
                        });
                    }
                }
            } catch (error) {
                console.error("Reconnection attempt failed:", error);
                Sentry.captureException(error, {
                    tags: {
                        location: "companion-study",
                        component: "reconnect",
                    },
                    extra: getCallContext(),
                });

                const nextAttempt = currentAttempts + 1;
                if (nextAttempt < MAX_RECONNECT_ATTEMPTS && !hasSavedRef.current) {
                    reconnectTimeoutRef.current = setTimeout(() => {
                        void attemptReconnection();
                    }, 2000 * nextAttempt);
                    return;
                }

                clearReconnectState();
                toast.error("Connection Lost", {
                    description: "Unable to reconnect. Your session will be saved.",
                });
                await handleCallEnd("reconnect-failed");
            }
        }, 1000 * (currentAttempts + 1));
    }, [
        addCallBreadcrumb,
        clearReconnectState,
        getCallContext,
        handleCallEnd,
        setStatus,
    ]);

    const handleTranscriptMessage = useCallback((message: unknown) => {
        const transcriptMessage = message as {
            type?: unknown;
            transcript?: unknown;
            role?: unknown;
            transcriptType?: unknown;
        };

        if (transcriptMessage.type !== "transcript") {
            return;
        }

        const transcript = typeof transcriptMessage.transcript === "string" ? transcriptMessage.transcript : "";
        if (!transcript) {
            return;
        }

        const role = transcriptMessage.role;
        if (role !== "user" && role !== "assistant") {
            return;
        }

        const isPartial = transcriptMessage.transcriptType !== "final";
        const messageId = `${role}-${Date.now()}-${Math.random()}`;

        setTranscriptMessages((previousMessages) => {
            const withoutExistingPartial = previousMessages.filter(
                (existingMessage) => !(existingMessage.role === role && existingMessage.isPartial),
            );

            const nextMessages = [
                ...withoutExistingPartial,
                {
                    id: messageId,
                    role,
                    text: transcript,
                    isPartial,
                },
            ];

            transcriptMessagesRef.current = nextMessages;
            return nextMessages;
        });
    }, []);

    useEffect(() => {
        addCallBreadcrumb("sdk-effect-mount");

        if (!VAPI_PUBLIC_KEY) {
            setStatus("ended");
            return;
        }

        if (!vapiRef.current && typeof window !== "undefined") {
            import("@vapi-ai/web").then((vapiModule) => {
                try {
                    const Vapi = vapiModule.default as unknown as new (publicKey: string) => VapiClient;
                    vapiRef.current = new Vapi(VAPI_PUBLIC_KEY);
                    addCallBreadcrumb("sdk-initialized");

                    vapiRef.current.on("call-start", () => {
                        const hasExistingSession = callStartTimeRef.current !== null;
                        const isReconnectStart = isReconnectingRef.current || hasExistingSession;

                        setStatus("active");

                        if (!isReconnectStart) {
                            const startedAt = new Date();
                            callStartTimeRef.current = startedAt;
                            manualHangupRef.current = false;
                            callCompletionHandledRef.current = false;
                            addCallBreadcrumb("call-start", { startedAt: startedAt.toISOString() });
                            return;
                        }

                        addCallBreadcrumb("call-start-reconnect", {
                            existingStartedAt: callStartTimeRef.current?.toISOString(),
                            wasReconnecting: isReconnectingRef.current,
                        });
                    });

                    vapiRef.current.on("call-end", () => {
                        const reason = manualHangupRef.current ? "manual-hangup-event" : "vapi-call-end-event";
                        addCallBreadcrumb("call-end-event", { reason }, manualHangupRef.current ? "info" : "warning");
                        void handleCallEnd(reason);
                    });

                    vapiRef.current.on("speech-start", () => {
                        setAssistantIsSpeaking(true);
                        setStatus("speaking");
                    });

                    vapiRef.current.on("speech-end", () => {
                        setAssistantIsSpeaking(false);
                        setStatus("listening");
                    });

                    vapiRef.current.on("status-update", (statusPayload: unknown) => {
                        const statusValue =
                            typeof statusPayload === "object" && statusPayload !== null && "status" in statusPayload
                                ? String((statusPayload as { status?: unknown }).status ?? "")
                                : String(statusPayload ?? "");

                        addCallBreadcrumb("status-update", { status: statusValue });

                        if (statusValue === "disconnected" || statusValue === "failed") {
                            Sentry.captureMessage("Vapi connection status change", {
                                level: "warning",
                                tags: {
                                    location: "companion-study",
                                    status: statusValue,
                                },
                                extra: {
                                    ...getCallContext(),
                                    statusPayload,
                                },
                            });

                            if (
                                callStartTimeRef.current &&
                                !isReconnectingRef.current &&
                                callStatusRef.current !== "ended" &&
                                !hasSavedRef.current
                            ) {
                                addCallBreadcrumb("status-triggered-reconnect", { status: statusValue }, "warning");
                                void attemptReconnection();
                                return;
                            }

                            if (callStatusRef.current === "ended" || hasSavedRef.current) {
                                addCallBreadcrumb("status-reconnect-skipped", {
                                    status: statusValue,
                                    skipped: true,
                                });
                            }
                            return;
                        }

                        if (statusValue === "connected" && isReconnectingRef.current) {
                            clearReconnectState();
                            setStatus("active");
                            addCallBreadcrumb("status-reconnected");
                            toast.success("Reconnected", {
                                description: "Connection restored successfully.",
                                duration: 3000,
                            });
                        }
                    });

                    vapiRef.current.on("message", (messagePayload: unknown) => {
                        try {
                            handleTranscriptMessage(messagePayload);
                        } catch (error) {
                            console.error("Error processing transcription message:", error);
                            Sentry.captureException(error, {
                                tags: {
                                    location: "companion-study",
                                    component: "transcription",
                                },
                                extra: getCallContext(),
                            });
                        }
                    });

                    vapiRef.current.on("error", async (err: unknown) => {
                        try {
                            console.error("Vapi SDK error:", err);
                            const errorMessage = extractVapiErrorMessage(err);

                            const errObj = err as {
                                code?: unknown;
                                type?: unknown;
                                timestamp?: unknown;
                                error?: {
                                    code?: unknown;
                                    type?: unknown;
                                };
                            };

                            const errorDetails = {
                                originalError: err,
                                message: errorMessage,
                                code: errObj.code ?? errObj.error?.code,
                                type: errObj.type ?? errObj.error?.type,
                                callStatus: callStatusRef.current,
                                hasCallStarted: callStartTimeRef.current !== null,
                                sessionId,
                                assistantId: selectedAssistantRef.current,
                                reconnectAttempts: reconnectAttemptsRef.current,
                                timestamp: errObj.timestamp,
                                errorObject: errObj.error,
                            };

                            console.error("Vapi error details:", errorDetails);

                            addCallBreadcrumb("vapi-error", {
                                message: errorMessage,
                                code: typeof errorDetails.code === "string" ? errorDetails.code : undefined,
                                type: typeof errorDetails.type === "string" ? errorDetails.type : undefined,
                            }, "error");

                            const recoverable = isRecoverableError(err);
                            const sentryError = err instanceof Error ? err : new Error(errorMessage);

                            Sentry.captureException(sentryError, {
                                tags: {
                                    location: "companion-study",
                                    component: "VapiSDK",
                                    errorType: recoverable ? "vapi-recoverable-error" : "vapi-fatal-error",
                                    recoverable: recoverable.toString(),
                                },
                                extra: errorDetails,
                            });

                            if (callStartTimeRef.current === null) {
                                cleanup("vapi-error-before-call-start");
                                toast.error("Connection Error", {
                                    description: errorMessage !== "Unknown error"
                                        ? errorMessage
                                        : "Failed to start call. Please try again.",
                                });
                                return;
                            }

                            if (recoverable && !isReconnectingRef.current && !hasSavedRef.current) {
                                addCallBreadcrumb("recoverable-error-reconnect", {
                                    message: errorMessage,
                                }, "warning");
                                await attemptReconnection();
                                return;
                            }

                            setStatus("ended");
                            setAssistantIsSpeaking(false);

                            const userErrorMessage = recoverable
                                ? "Connection lost after reconnection attempts. Your session will be saved."
                                : (errorMessage !== "Unknown error"
                                    ? errorMessage
                                    : "Connection error. Your session will be saved.");

                            toast.error("Call Error", {
                                description: userErrorMessage,
                            });

                            await handleCallEnd(recoverable ? "vapi-error-recovery-failed" : "vapi-fatal-error");
                        } catch (handlerErr) {
                            console.error("Unhandled error in vapi error handler", handlerErr);
                            Sentry.captureException(handlerErr, {
                                tags: {
                                    location: "companion-study",
                                    component: "VapiSDK-handler",
                                },
                                extra: {
                                    ...getCallContext(),
                                    handlerErr,
                                    originalErr: err,
                                },
                            });

                            setStatus("ended");
                            setAssistantIsSpeaking(false);

                            try {
                                await handleCallEnd("vapi-error-handler-failure");
                            } catch (finalizeErr) {
                                console.error("Failed to finalize vapi error handler failure", finalizeErr);
                                Sentry.captureException(finalizeErr, {
                                    tags: {
                                        location: "companion-study",
                                        component: "VapiSDK-handler-finalize",
                                    },
                                    extra: {
                                        ...getCallContext(),
                                        finalizeErr,
                                        originalErr: err,
                                    },
                                });
                                cleanup("vapi-error-handler-failure");
                            }

                            toast.error("Internal error", {
                                description: "An unexpected error occurred while handling a connection error.",
                            });
                        }
                    });

                    setIsVapiInitialized(true);
                } catch (error) {
                    setStatus("ended");
                    setAssistantIsSpeaking(false);
                    console.error("VAPI initialization error:", error);
                    Sentry.captureException(error, {
                        tags: {
                            location: "companion-study",
                            component: "vapi-init",
                        },
                        extra: getCallContext(),
                    });
                    const message = error instanceof Error
                        ? error.message
                        : "Failed to initialize Vapi. Please refresh the page and try again.";
                    toast.error("Initialization Error", {
                        description: message,
                    });
                }
            }).catch((error) => {
                setStatus("ended");
                setAssistantIsSpeaking(false);
                console.error("VAPI module loading error:", error);
                Sentry.captureException(error, {
                    tags: {
                        location: "companion-study",
                        component: "vapi-module-load",
                    },
                    extra: getCallContext(),
                });
                const message = error instanceof Error
                    ? error.message
                    : "Failed to load Vapi module. Please check your internet connection and try again.";
                toast.error("Loading Error", {
                    description: message,
                });
            });
        }

        return () => {
            const isUnexpectedUnmount =
                callStartTimeRef.current !== null &&
                callStatusRef.current !== "ended" &&
                !hasSavedRef.current;

            if (isUnexpectedUnmount) {
                Sentry.captureMessage("Companion component unmounted while call active", {
                    level: "warning",
                    tags: {
                        location: "companion-study",
                        component: "lifecycle",
                    },
                    extra: getCallContext(),
                });
            }

            cleanup("component-unmount");
        };
    }, [
        addCallBreadcrumb,
        attemptReconnection,
        cleanup,
        clearReconnectState,
        getCallContext,
        handleCallEnd,
        handleTranscriptMessage,
        sessionId,
        setStatus,
    ]);

    const startCall = useCallback(async () => {
        if (isFinalizingSessionRef.current) {
            toast.info("Finishing previous session", {
                description: "Please wait while your previous session is being finalized.",
            });
            return;
        }

        if (hasSavedRef.current || hasSavedSession) {
            toast.info("Session already saved", {
                description: "Previous session was saved. Please return to the dashboard to start a new session.",
            });
            return;
        }

        if (!selectedAssistant || typeof selectedAssistant !== "string") {
            toast.error("Assistant Required", {
                description: "Please select an assistant before starting.",
            });
            return;
        }

        if (!isVapiInitialized) {
            toast.error("Initialization Error", {
                description: "VAPI is not initialized. Please wait a moment and try again.",
            });
            return;
        }

        if (!vapiRef.current) {
            toast.error("Connection Error", {
                description: "VAPI connection is not available. Please refresh the page.",
            });
            return;
        }

        callCompletionHandledRef.current = false;
        manualHangupRef.current = false;
        hasSavedRef.current = false;
        callStartTimeRef.current = null;
        setHasSavedSession(false);
        setStatus("connecting");
        addCallBreadcrumb("start-call-clicked");

        try {
            const limit = await subscriptionApi.checkLimit();
            addCallBreadcrumb("limit-check-result", limit as Record<string, unknown>);

            if (!limit.can_start) {
                setStatus("idle");
                Sentry.captureMessage("Companion call blocked by limit check", {
                    level: "warning",
                    tags: {
                        location: "companion-study",
                        component: "limit-check",
                        plan: limit.plan,
                    },
                    extra: {
                        ...getCallContext(),
                        limitResponse: limit,
                    },
                });

                if (limit.plan === "basic") {
                    toast.error("Monthly limit reached", {
                        description: "You've used all your Basic plan companion study sessions for this month. Upgrade to Pro for unlimited access.",
                    });
                } else {
                    toast.error("Subscription required", {
                        description: "Companion Study is available on Basic and Pro plans. Please subscribe to continue.",
                    });
                }
                return;
            }

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            stream.getTracks().forEach((track) => track.stop());

            addCallBreadcrumb("starting-vapi-call", { assistantId: selectedAssistantRef.current });
            await vapiRef.current.start(selectedAssistantRef.current);
        } catch (error) {
            console.error("Error starting call:", error);
            Sentry.captureException(error, {
                tags: {
                    location: "companion-study",
                    component: "start-call",
                },
                extra: getCallContext(),
            });

            let errorMessage = "Could not start the call. ";
            const errObj = error as { name?: string };

            if (errObj.name === "NotAllowedError" || errObj.name === "PermissionDeniedError") {
                errorMessage += "Please grant microphone access and try again.";
            } else if (errObj.name === "NotFoundError" || errObj.name === "DevicesNotFoundError") {
                errorMessage += "No microphone found. Please connect a microphone and try again.";
            } else {
                errorMessage += "Please ensure microphone access is granted.";
            }

            toast.error("Call Start Failed", { description: errorMessage });
            setStatus("idle");
            setAssistantIsSpeaking(false);
        }
    }, [
        addCallBreadcrumb,
        getCallContext,
        hasSavedSession,
        isVapiInitialized,
        selectedAssistant,
        setStatus,
    ]);

    const endCall = useCallback(async () => {
        manualHangupRef.current = true;
        addCallBreadcrumb("manual-end-call-clicked");

        if (vapiRef.current) {
            try {
                vapiRef.current.stop();
            } catch {
                // Ignore stop errors on manual hangup.
            }
        }

        await handleCallEnd("manual-hangup");
    }, [addCallBreadcrumb, handleCallEnd]);

    return {
        callStatus,
        isVapiInitialized,
        assistantIsSpeaking,
        transcriptMessages,
        isReconnecting,
        isFinalizingSession,
        hasSavedSession,
        reconnectAttempts,
        startCall,
        endCall,
    };
}
