"use client"
import { useCallback, useEffect, useRef, useState, useLayoutEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mic, PhoneOff, PhoneCall } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCompanionStudyStore } from "@/stores/companion-study-store";
import { useIsMobile } from "@/components/ui/use-mobile";
import { subscriptionApi } from "@/services/api";
import * as Sentry from "@sentry/nextjs";

// Get Vapi public key from environment variable
const VAPI_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;

// Assistant configurations
const ASSISTANTS = {
    casual: {
        id: "815decc2-cab8-4907-9472-cbd6f882f232",
        name: "Casual Talk",
        description: "Practice casual conversation"
    },
    interview: {
        id: "709d3490-2dbd-414b-9855-84060073fce9",
        name: "Job Interview",
        description: "Practice job interview scenarios"
    },
    keigo: {
        id: "e1a9b76f-c493-4a09-ad6b-5e123184bad2",
        name: "Keigo",
        description: "Practice Keigo"
    },
    angryCustomer: {
        id: "136fcc43-0ba0-4092-999a-d13b871747db",
        name: "Angry Customer",
        description: "Practice handling difficult customer situations"
    }
};

interface CompanionStudyProps {
    sessionId: string;
    onComplete: () => void;
}

type CallStatus = "idle" | "connecting" | "active" | "speaking" | "listening" | "ended";

interface TranscriptMessage {
    id: string;
    role: "user" | "assistant";
    text: string;
    isPartial: boolean;
}

interface FluidVisualizationProps {
    isActive: boolean;
    isListening: boolean;
    isSpeaking: boolean;
    size?: number;
}

type SentryBreadcrumbLevel = "fatal" | "error" | "warning" | "log" | "info" | "debug";

function FluidVisualization({ isActive, isListening, isSpeaking, size = 300 }: FluidVisualizationProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let animationFrameId: number;
        let particles: Array<{
            x: number;
            y: number;
            radius: number;
            color: string;
            vx: number;
            vy: number;
            life: number;
            maxLife: number;
        }> = [];

        const createParticles = () => {
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;

            if (isActive && particles.length < 100) {
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * 30 + 20;
                const speed = Math.random() * 0.5 + 0.2;

                let color;
                if (isSpeaking) {
                    color = `rgba(100, 180, 255, ${Math.random() * 0.3 + 0.2})`;
                } else if (isListening) {
                    color = `rgba(120, 200, 255, ${Math.random() * 0.3 + 0.2})`;
                } else {
                    color = `rgba(150, 220, 255, ${Math.random() * 0.3 + 0.2})`;
                }

                particles.push({
                    x: centerX + Math.cos(angle) * distance,
                    y: centerY + Math.sin(angle) * distance,
                    radius: Math.random() * 8 + 2,
                    color,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    life: 0,
                    maxLife: Math.random() * 100 + 50,
                });
            }
        };

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const gradient = ctx.createRadialGradient(
                canvas.width / 2,
                canvas.height / 2,
                0,
                canvas.width / 2,
                canvas.height / 2,
                canvas.width / 2,
            );

            if (isSpeaking) {
                gradient.addColorStop(0, "rgba(220, 240, 255, 0.8)");
                gradient.addColorStop(0.5, "rgba(100, 180, 255, 0.4)");
                gradient.addColorStop(1, "rgba(50, 120, 220, 0)");
            } else if (isListening) {
                gradient.addColorStop(0, "rgba(230, 245, 255, 0.8)");
                gradient.addColorStop(0.5, "rgba(120, 200, 255, 0.4)");
                gradient.addColorStop(1, "rgba(70, 140, 230, 0)");
            } else {
                gradient.addColorStop(0, "rgba(240, 250, 255, 0.7)");
                gradient.addColorStop(0.5, "rgba(150, 220, 255, 0.3)");
                gradient.addColorStop(1, "rgba(100, 160, 240, 0)");
            }

            ctx.beginPath();
            ctx.arc(canvas.width / 2, canvas.height / 2, canvas.width / 2 - 10, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();

            if (isActive) {
                createParticles();
            }

            particles = particles.filter((p) => p.life < p.maxLife);

            particles.forEach((particle) => {
                particle.life += 1;
                particle.x += particle.vx;
                particle.y += particle.vy;

                const opacity = 1 - particle.life / particle.maxLife;

                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
                ctx.fillStyle = particle.color.replace(/[\d.]+\)$/, `${opacity})`);
                ctx.fill();
            });

            animationFrameId = requestAnimationFrame(animate);
        };

        const resizeCanvas = () => {
            const canvasSize = Math.min(size, window.innerWidth - 40);
            canvas.width = canvasSize;
            canvas.height = canvasSize;
        };

        resizeCanvas();
        window.addEventListener("resize", resizeCanvas);

        animate();

        return () => {
            window.removeEventListener("resize", resizeCanvas);
            cancelAnimationFrame(animationFrameId);
        };
    }, [isActive, isListening, isSpeaking]);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
                opacity: isActive ? 1 : 0.7,
                scale: isActive ? 1 : 0.9,
            }}
            transition={{ duration: 0.5 }}
            className="relative flex items-center justify-center"
        >
            <canvas
                ref={canvasRef}
                className="rounded-full"
                style={{
                    filter: `blur(${isActive ? 4 : 2}px)`,
                    transition: "filter 0.5s ease",
                }}
            />
        </motion.div>
    );
}

export function CompanionStudy({ sessionId, onComplete }: CompanionStudyProps) {
    const [callStatus, setCallStatus] = useState<CallStatus>("idle");
    const [isVapiInitialized, setIsVapiInitialized] = useState(false);
    const [assistantIsSpeaking, setAssistantIsSpeaking] = useState(false);
    const [transcriptMessages, setTranscriptMessages] = useState<TranscriptMessage[]>([]);
    const [isReconnecting, setIsReconnecting] = useState(false);
    const [reconnectAttempts, setReconnectAttempts] = useState(0);
    const vapiRef = useRef<any>(null);
    const hasSavedRef = useRef(false);
    const transcriptEndRef = useRef<HTMLDivElement>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const callStatusRef = useRef<CallStatus>("idle");
    const isReconnectingRef = useRef(false);
    const callStartTimeRef = useRef<Date | null>(null);
    const reconnectAttemptsRef = useRef(0);
    const transcriptMessagesRef = useRef<TranscriptMessage[]>([]);
    const selectedAssistantRef = useRef<string>(ASSISTANTS.casual.id);
    const onCompleteRef = useRef(onComplete);
    const manualHangupRef = useRef(false);
    const callCompletionHandledRef = useRef(false);
    const isMobile = useIsMobile();

    // Zustand store for preferences
    const {
        selectedAssistant,
        showTranscription,
        setSelectedAssistant: setStoreSelectedAssistant
    } = useCompanionStudyStore();

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
        level: SentryBreadcrumbLevel = "info",
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

    const cleanup = useCallback((reason: string = "cleanup") => {
        addCallBreadcrumb("cleanup", { reason });

        // Clear any pending reconnection attempts
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }
        if (vapiRef.current) {
            try {
                vapiRef.current.stop();
            } catch (error) { }
            // Keep client instance for in-page restart flows; dispose only on unmount.
            if (reason === "component-unmount") {
                vapiRef.current.removeAllListeners && vapiRef.current.removeAllListeners();
                vapiRef.current = null;
            }
        }
        callStatusRef.current = "ended";
        setCallStatus("ended");
        setAssistantIsSpeaking(false);
        setTranscriptMessages([]);
        callStartTimeRef.current = null;
        isReconnectingRef.current = false;
        setIsReconnecting(false);
        setReconnectAttempts(0);
        reconnectAttemptsRef.current = 0;
        transcriptMessagesRef.current = [];
        manualHangupRef.current = false;
        hasSavedRef.current = false;
    }, [addCallBreadcrumb, getCallContext]);

    // Check if an error is recoverable (can attempt reconnection)
    const isRecoverableError = (err: any): boolean => {
        if (!err) return false;
        
        const errorMessage = (err?.message || '').toLowerCase();
        const errorCode = err?.code || '';
        const errorType = err?.type || '';
        
        // Recoverable errors: network issues, timeouts, connection drops
        const recoverablePatterns = [
            'network',
            'timeout',
            'connection',
            'websocket',
            'disconnected',
            'failed to connect',
            'connection lost',
            'connection closed',
            'socket',
        ];
        
        // Fatal errors: authentication, invalid config, permission denied
        const fatalPatterns = [
            'unauthorized',
            'forbidden',
            'invalid',
            'permission',
            'not found',
            '404',
            '401',
            '403',
        ];
        
        // Check if it's a fatal error first
        if (fatalPatterns.some(pattern => 
            errorMessage.includes(pattern) || 
            errorCode.toString().includes(pattern) ||
            errorType.toLowerCase().includes(pattern)
        )) {
            return false;
        }
        
        // Check if it's a recoverable error
        return recoverablePatterns.some(pattern => 
            errorMessage.includes(pattern) || 
            errorCode.toString().includes(pattern) ||
            errorType.toLowerCase().includes(pattern)
        );
    };

    // Function to save companion study session to database
    const saveCompanionSession = useCallback(async () => {
        const startedAt = callStartTimeRef.current;
        if (!startedAt) {
            addCallBreadcrumb("save-session-skipped", { reason: "missing-start-time" }, "warning");
            return; // Don't save if call never started
        }

        // Extract final transcripts from messages (exclude partial messages)
        const finalMessages = transcriptMessagesRef.current.filter(msg => !msg.isPartial);
        const userTranscript = finalMessages
            .filter(msg => msg.role === 'user')
            .map(msg => msg.text)
            .join(' ');
        const assistantTranscript = finalMessages
            .filter(msg => msg.role === 'assistant')
            .map(msg => msg.text)
            .join(' ');

        // Save even with empty transcripts to track session attempts
        try {
            const endedAt = new Date();
            const durationSeconds = Math.max(0, Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000));

            addCallBreadcrumb("save-session-started", {
                durationSeconds,
                userTranscriptLength: userTranscript.length,
                assistantTranscriptLength: assistantTranscript.length,
            });

            const response = await fetch('/api/companion-study/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    session_id: sessionId,
                    assistant_id: selectedAssistantRef.current,
                    user_transcript: userTranscript || '',
                    assistant_transcript: assistantTranscript || '',
                    duration_seconds: durationSeconds,
                    started_at: startedAt.toISOString(),
                    ended_at: endedAt.toISOString(),
                }),
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: 'Unknown error' }));
                console.error('Failed to save companion study session:', error);
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
                // Don't show error toast to user as this is a background operation
                // Session data is still valuable even if save fails
            } else {
                addCallBreadcrumb("save-session-success", { status: response.status });
            }
        } catch (error) {
            console.error('Error saving companion study session:', error);
            Sentry.captureException(error, {
                tags: {
                    location: "companion-study",
                    component: "save-session",
                },
                extra: getCallContext(),
            });
            // Don't show error toast to user as this is a background operation
            // Session data is still valuable even if save fails
        }
    }, [addCallBreadcrumb, getCallContext, sessionId]);

    const handleCallEnd = useCallback(async (reason: string = "unknown") => {
        if (callCompletionHandledRef.current) {
            addCallBreadcrumb("call-end-ignored", { reason, ignored: true });
            return;
        }

        callCompletionHandledRef.current = true;
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

        if (!hasSavedRef.current) {
            hasSavedRef.current = true;
            await saveCompanionSession();
        }
        cleanup(reason);
        onCompleteRef.current && onCompleteRef.current();
    }, [addCallBreadcrumb, cleanup, getCallContext, saveCompanionSession]);

    // Attempt to reconnect after a disconnection
    const attemptReconnection = useCallback(async () => {
        if (!vapiRef.current || !callStartTimeRef.current || hasSavedRef.current) {
            addCallBreadcrumb("reconnect-skipped", {
                hasVapi: Boolean(vapiRef.current),
                hasCallStarted: callStartTimeRef.current !== null,
                hasSaved: hasSavedRef.current,
            });
            return; // Can't reconnect if call never started or already saved
        }

        const maxReconnectAttempts = 3;
        const currentAttempts = reconnectAttemptsRef.current;
        
        if (currentAttempts >= maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            Sentry.captureMessage("Companion reconnect attempts exhausted", {
                level: "warning",
                tags: {
                    location: "companion-study",
                    component: "reconnect",
                },
                extra: getCallContext(),
            });
            toast.error("Connection Lost", {
                description: "Unable to reconnect after multiple attempts. Your session will be saved."
            });
            await handleCallEnd("reconnect-exhausted");
            return;
        }

        isReconnectingRef.current = true;
        setIsReconnecting(true);
        reconnectAttemptsRef.current = currentAttempts + 1;
        setReconnectAttempts(reconnectAttemptsRef.current);
        callStatusRef.current = "connecting";
        setCallStatus("connecting");
        addCallBreadcrumb("reconnect-attempt", {
            attempt: reconnectAttemptsRef.current,
            maxReconnectAttempts,
        }, "warning");

        toast.info("Reconnecting...", {
            description: `Attempt ${currentAttempts + 1} of ${maxReconnectAttempts}`,
            duration: 3000,
        });

        // Wait a bit before attempting reconnection
        reconnectTimeoutRef.current = setTimeout(async () => {
            try {
                // Try to restart the call with the same assistant
                if (vapiRef.current && callStartTimeRef.current && !hasSavedRef.current) {
                    await vapiRef.current.start(selectedAssistantRef.current);
                    isReconnectingRef.current = false;
                    setIsReconnecting(false);
                    setReconnectAttempts(0);
                    reconnectAttemptsRef.current = 0;
                    addCallBreadcrumb("reconnect-success", {}, "info");
                    toast.success("Reconnected", {
                        description: "Connection restored successfully.",
                        duration: 3000,
                    });
                }
            } catch (error: any) {
                console.error('Reconnection attempt failed:', error);
                Sentry.captureException(error, {
                    tags: {
                        location: "companion-study",
                        component: "reconnect",
                    },
                    extra: getCallContext(),
                });
                // If reconnection fails, try again or give up
                const nextAttempt = currentAttempts + 1;
                if (nextAttempt < maxReconnectAttempts && !hasSavedRef.current) {
                    // Try again after a longer delay
                    reconnectTimeoutRef.current = setTimeout(() => {
                        void attemptReconnection();
                    }, 2000 * nextAttempt); // Exponential backoff
                } else {
                    // Give up after max attempts
                    isReconnectingRef.current = false;
                    setIsReconnecting(false);
                    reconnectAttemptsRef.current = nextAttempt;
                    toast.error("Connection Lost", {
                        description: "Unable to reconnect. Your session will be saved."
                    });
                    await handleCallEnd("reconnect-failed");
                }
            }
        }, 1000 * (currentAttempts + 1)); // Exponential backoff
    }, [addCallBreadcrumb, getCallContext, handleCallEnd]);

    // Keep this effect session-scoped. Do not add transient runtime state deps here;
    // re-running this effect mid-call tears down Vapi listeners and can drop active calls.
    useEffect(() => {
        addCallBreadcrumb("sdk-effect-mount");

        if (!VAPI_PUBLIC_KEY) {
            callStatusRef.current = "ended";
            setCallStatus("ended");
            return;
        }

        if (!vapiRef.current && typeof window !== "undefined") {
            import("@vapi-ai/web").then((VapiModule) => {
                try {
                    const Vapi = VapiModule.default;
                    vapiRef.current = new Vapi(VAPI_PUBLIC_KEY);
                    addCallBreadcrumb("sdk-initialized");

                    vapiRef.current.on("call-start", () => {
                        const hasExistingSession = callStartTimeRef.current !== null;
                        const isReconnectStart = isReconnectingRef.current || hasExistingSession;

                        callStatusRef.current = "active";
                        setCallStatus("active");

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
                        callStatusRef.current = "speaking";
                        setCallStatus("speaking");
                    });

                    vapiRef.current.on("speech-end", () => {
                        setAssistantIsSpeaking(false);
                        callStatusRef.current = "listening";
                        setCallStatus("listening");
                    });

                    // Listen for connection status changes
                    vapiRef.current.on("status-update", (status: any) => {
                        const statusValue = status?.status || status;
                        addCallBreadcrumb("status-update", { status: statusValue });

                        // Handle disconnection events
                        if (statusValue === 'disconnected' || statusValue === 'failed') {
                            Sentry.captureMessage('Vapi connection status change', {
                                level: 'warning',
                                tags: {
                                    location: 'companion-study',
                                    status: statusValue,
                                },
                                extra: {
                                    ...getCallContext(),
                                    statusPayload: status,
                                },
                            });

                            // Only attempt reconnection if call was active and not already reconnecting
                            if (callStartTimeRef.current && !isReconnectingRef.current && callStatusRef.current !== 'ended' && !hasSavedRef.current) {
                                addCallBreadcrumb("status-triggered-reconnect", { status: statusValue }, "warning");
                                void attemptReconnection();
                            } else if (callStatusRef.current === 'ended' || hasSavedRef.current) {
                                // Call already ended, don't attempt reconnection
                                addCallBreadcrumb("status-reconnect-skipped", {
                                    status: statusValue,
                                    skipped: true,
                                });
                            }
                        } else if (statusValue === 'connected' && isReconnectingRef.current) {
                            // Successfully reconnected
                            isReconnectingRef.current = false;
                            setIsReconnecting(false);
                            setReconnectAttempts(0);
                            reconnectAttemptsRef.current = 0;
                            callStatusRef.current = "active";
                            setCallStatus("active");
                            addCallBreadcrumb("status-reconnected");
                            toast.success("Reconnected", {
                                description: "Connection restored successfully.",
                                duration: 3000,
                            });
                        }
                    });

                    // Add message event listener for transcription
                    vapiRef.current.on("message", (message: any) => {
                        try {
                            if (message && message.type === 'transcript') {
                                const transcript = message.transcript || "";
                                const role = message.role || "";

                                if (!transcript) return; // Skip empty transcripts

                                const isPartial = message.transcriptType !== 'final';
                                const messageId = `${role}-${Date.now()}-${Math.random()}`;

                                if (role === 'user' || role === 'assistant') {
                                    setTranscriptMessages(prev => {
                                        // Remove any existing partial message for this role
                                        const filtered = prev.filter(msg => !(msg.role === role && msg.isPartial));

                                        // Add the new message
                                        const nextMessages = [...filtered, {
                                            id: messageId,
                                            role: role as "user" | "assistant",
                                            text: transcript,
                                            isPartial
                                        }];
                                        transcriptMessagesRef.current = nextMessages;
                                        return nextMessages;
                                    });
                                }
                            }
                        } catch (error) {
                            console.error('Error processing transcription message:', error);
                            Sentry.captureException(error, {
                                tags: {
                                    location: 'companion-study',
                                    component: 'transcription',
                                },
                                extra: getCallContext(),
                            });
                            // Don't show error to user for transcription issues
                        }
                    });

                    vapiRef.current.on("error", async (err: any) => {
                        try {
                            console.error('Vapi SDK error:', err);

                            // Extract error message from various possible structures
                            let errorMessage = 'Unknown error';
                            if (err instanceof Error) {
                                errorMessage = err.message;
                            } else if (err?.error?.errorMsg) {
                                errorMessage = err.error.errorMsg;
                            } else if (err?.error?.message) {
                                errorMessage = err.error.message;
                            } else if (err?.message) {
                                errorMessage = err.message;
                            } else if (typeof err === 'string') {
                                errorMessage = err;
                            }

                            // Log error details for debugging
                            const errorDetails = {
                                originalError: err,
                                message: errorMessage,
                                code: err?.code || err?.error?.code,
                                type: err?.type || err?.error?.type,
                                callStatus: callStatusRef.current,
                                hasCallStarted: callStartTimeRef.current !== null,
                                sessionId: sessionId,
                                assistantId: selectedAssistantRef.current,
                                reconnectAttempts: reconnectAttemptsRef.current,
                                timestamp: err?.timestamp,
                                errorObject: err?.error,
                            };
                            console.error('Vapi error details:', errorDetails);

                            addCallBreadcrumb("vapi-error", {
                                message: errorMessage,
                                code: errorDetails.code as string | undefined,
                                type: errorDetails.type as string | undefined,
                            }, "error");

                            // Check if this is a recoverable error (use original err for pattern matching)
                            const recoverable = isRecoverableError(err);

                            // Convert to proper Error instance for Sentry
                            const sentryError = err instanceof Error
                                ? err
                                : new Error(errorMessage);

                            // Log to Sentry for production debugging
                            Sentry.captureException(sentryError, {
                                tags: {
                                    location: 'companion-study',
                                    component: 'VapiSDK',
                                    errorType: recoverable ? 'vapi-recoverable-error' : 'vapi-fatal-error',
                                    recoverable: recoverable.toString(),
                                },
                                extra: errorDetails,
                            });

                            // If call was never started, just cleanup
                            if (callStartTimeRef.current === null) {
                                cleanup("vapi-error-before-call-start");
                                toast.error("Connection Error", {
                                    description: errorMessage !== 'Unknown error' ? errorMessage : "Failed to start call. Please try again."
                                });
                                return;
                            }

                            // If it's a recoverable error and call was active, attempt reconnection
                            if (recoverable && !isReconnectingRef.current && !hasSavedRef.current) {
                                addCallBreadcrumb("recoverable-error-reconnect", {
                                    message: errorMessage,
                                }, "warning");
                                await attemptReconnection();
                                return;
                            }

                            // For fatal errors or if reconnection failed, end the call
                            callStatusRef.current = "ended";
                            setCallStatus("ended");
                            setAssistantIsSpeaking(false);

                            const userErrorMessage = recoverable
                                ? "Connection lost after reconnection attempts. Your session will be saved."
                                : (errorMessage !== 'Unknown error' ? errorMessage : "Connection error. Your session will be saved.");

                            toast.error("Call Error", {
                                description: userErrorMessage
                            });

                            // Save session before cleanup
                            await handleCallEnd(recoverable ? "vapi-error-recovery-failed" : "vapi-fatal-error");
                        } catch (handlerErr) {
                            console.error('Unhandled error in vapi error handler', handlerErr);
                            Sentry.captureException(handlerErr, {
                                tags: {
                                    location: 'companion-study',
                                    component: 'VapiSDK-handler',
                                },
                                extra: {
                                    ...getCallContext(),
                                    handlerErr,
                                    originalErr: err,
                                },
                            });

                            callStatusRef.current = "ended";
                            setCallStatus("ended");
                            setAssistantIsSpeaking(false);

                            try {
                                await handleCallEnd("vapi-error-handler-failure");
                            } catch (finalizeErr) {
                                console.error('Failed to finalize vapi error handler failure', finalizeErr);
                                Sentry.captureException(finalizeErr, {
                                    tags: {
                                        location: 'companion-study',
                                        component: 'VapiSDK-handler-finalize',
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
                                description: "An unexpected error occurred while handling a connection error."
                            });
                        }
                    });

                    setIsVapiInitialized(true);
                } catch (error: any) {
                    callStatusRef.current = "ended";
                    setCallStatus("ended");
                    setAssistantIsSpeaking(false);
                    console.error('VAPI initialization error:', error);
                    Sentry.captureException(error, {
                        tags: {
                            location: "companion-study",
                            component: "vapi-init",
                        },
                        extra: getCallContext(),
                    });
                    toast.error("Initialization Error", {
                        description: error?.message || "Failed to initialize Vapi. Please refresh the page and try again."
                    });
                }
            }).catch((error: any) => {
                callStatusRef.current = "ended";
                setCallStatus("ended");
                setAssistantIsSpeaking(false);
                console.error('VAPI module loading error:', error);
                Sentry.captureException(error, {
                    tags: {
                        location: "companion-study",
                        component: "vapi-module-load",
                    },
                    extra: getCallContext(),
                });
                toast.error("Loading Error", {
                    description: error?.message || "Failed to load Vapi module. Please check your internet connection and try again."
                });
            });
        }

        return () => {
            const isUnexpectedUnmount = callStartTimeRef.current !== null && callStatusRef.current !== "ended" && !hasSavedRef.current;
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
    }, [addCallBreadcrumb, attemptReconnection, cleanup, getCallContext, handleCallEnd, sessionId]);

    const startCall = async () => {
        if (!isVapiInitialized) {
            toast.error("Initialization Error", { description: "VAPI is not initialized. Please wait a moment and try again." });
            return;
        }
        if (!vapiRef.current) {
            toast.error("Connection Error", { description: "VAPI connection is not available. Please refresh the page." });
            return;
        }

        callCompletionHandledRef.current = false;
        manualHangupRef.current = false;
        hasSavedRef.current = false;
        callStartTimeRef.current = null;
        callStatusRef.current = "connecting";
        setCallStatus("connecting");
        addCallBreadcrumb("start-call-clicked");

        try {
            // Check subscription limit with backend before starting the call
            const limit = await subscriptionApi.checkLimit();
            addCallBreadcrumb("limit-check-result", limit);
            if (!limit.can_start) {
                callStatusRef.current = "idle";
                setCallStatus("idle");
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

            // Request microphone permission first
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            stream.getTracks().forEach(track => track.stop());

            // Start the call
            addCallBreadcrumb("starting-vapi-call", { assistantId: selectedAssistantRef.current });
            await vapiRef.current.start(selectedAssistantRef.current);
        } catch (error: any) {
            console.error('Error starting call:', error);
            Sentry.captureException(error, {
                tags: {
                    location: "companion-study",
                    component: "start-call",
                },
                extra: getCallContext(),
            });
            let errorMessage = "Could not start the call. ";
            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                errorMessage += "Please grant microphone access and try again.";
            } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
                errorMessage += "No microphone found. Please connect a microphone and try again.";
            } else {
                errorMessage += "Please ensure microphone access is granted.";
            }
            toast.error("Call Start Failed", { description: errorMessage });
            callStatusRef.current = "idle";
            setCallStatus("idle");
            setAssistantIsSpeaking(false);
        }
    };

    const handleAssistantChange = (assistantId: string) => {
        setStoreSelectedAssistant(assistantId);
    };

    const endCall = () => {
        manualHangupRef.current = true;
        addCallBreadcrumb("manual-end-call-clicked");
        if (vapiRef.current) {
            try {
                vapiRef.current.stop();
            } catch (error) {
                // ignore stop errors on manual hangup
            }
        }
        void handleCallEnd("manual-hangup");
    };

    // Auto-scroll to bottom when new messages arrive
    useLayoutEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [transcriptMessages]);

    if (!VAPI_PUBLIC_KEY) {
        return (
            <div className="flex flex-col h-[calc(100vh-8rem)]">
                <Card className="flex-1 glass-card flex flex-col h-full overflow-hidden border-0 shadow-lg bg-background/60 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-red-500">Configuration Error</CardTitle>
                        <CardDescription>
                            Missing Vapi configuration. Please check your environment variables.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)]">
            <Card className="flex-1 glass-card flex flex-col h-full overflow-hidden border-0 shadow-lg bg-background/60 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Mic className="h-5 w-5 text-blue-500" />
                        Voice Companion
                    </CardTitle>
                    <CardDescription>
                        Practice speaking with your AI language companion
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col overflow-hidden p-4 sm:p-8">
                    {(callStatus === "idle" || callStatus === "ended") && (
                        <div className="flex flex-col items-center justify-center gap-4 w-full max-w-md mx-auto h-full">
                            <Select
                                value={selectedAssistant}
                                onValueChange={handleAssistantChange}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select an assistant" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(ASSISTANTS).map(([key, assistant]) => (
                                        <SelectItem key={key} value={assistant.id}>
                                            {assistant.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button
                                onClick={startCall}
                                className="flex items-center gap-2 w-full"
                                size="lg"
                                disabled={!isVapiInitialized}
                            >
                                <PhoneCall className="h-5 w-5" /> Start Call
                            </Button>
                        </div>
                    )}
                    {(callStatus !== "idle" && callStatus !== "ended") && (
                        <div className="flex flex-col h-full gap-4">
                            {/* Status text - above animation */}
                            <div className="text-center text-muted-foreground text-base min-h-[2em] flex items-center justify-center">
                                {isReconnecting && `Reconnecting... (${reconnectAttempts}/3)`}
                                {!isReconnecting && callStatus === "connecting" && "Connecting..."}
                                {!isReconnecting && callStatus === "active" && "Connected"}
                                {!isReconnecting && callStatus === "listening" && "Listening..."}
                                {!isReconnecting && callStatus === "speaking" && "Speaking..."}
                            </div>

                            {/* Animation */}
                            <div className={`flex items-center justify-center ${isMobile ? 'w-32 h-32 mx-auto' : 'w-48 h-48 mx-auto'}`}>
                                <FluidVisualization
                                    isActive={true}
                                    isListening={callStatus === "listening"}
                                    isSpeaking={assistantIsSpeaking}
                                    size={isMobile ? 128 : 192}
                                />
                            </div>

                            {/* Scrollable Transcript Area */}
                            {showTranscription && (
                                <div className="flex-1 overflow-y-auto min-h-0 px-2 sm:px-4">
                                    <div className="space-y-3 max-w-4xl mx-auto py-2">
                                        {transcriptMessages.length === 0 ? (
                                            <div className="text-center text-muted-foreground text-sm py-8">
                                                Waiting for conversation to start...
                                            </div>
                                        ) : (
                                            transcriptMessages.map((message) => (
                                                <motion.div
                                                    key={message.id}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                                                >
                                                    <div
                                                        className={`
                                                            max-w-[85%] sm:max-w-[75%] rounded-lg px-4 py-2
                                                            ${message.role === "user"
                                                                ? "bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800"
                                                                : "bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800"
                                                            }
                                                            ${message.isPartial ? "opacity-70" : ""}
                                                        `}
                                                    >
                                                        <div className={`text-xs font-semibold mb-1 ${message.role === "user"
                                                            ? "text-blue-700 dark:text-blue-300"
                                                            : "text-purple-700 dark:text-purple-300"
                                                            }`}>
                                                            {message.role === "user" ? "You" : "Assistant"}
                                                        </div>
                                                        <div className={`text-sm ${message.role === "user"
                                                            ? "text-blue-900 dark:text-blue-100"
                                                            : "text-purple-900 dark:text-purple-100"
                                                            }`}>
                                                            {message.text}
                                                            {message.isPartial && <span className="opacity-50">...</span>}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))
                                        )}
                                        <div ref={transcriptEndRef} />
                                    </div>
                                </div>
                            )}

                            {/* End Call Button - Icon Only */}
                            <div className="flex items-center justify-center pt-4">
                                <Button
                                    onClick={endCall}
                                    variant="destructive"
                                    size="icon"
                                    className={`${isMobile ? "h-12 w-12 rounded-full" : "h-14 w-14 rounded-full"} shadow-lg`}
                                    aria-label="End Call"
                                >
                                    <PhoneOff className={isMobile ? "h-6 w-6" : "h-7 w-7"} />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
                <CardFooter>
                    <div className="text-xs text-muted-foreground w-full text-center">
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}
