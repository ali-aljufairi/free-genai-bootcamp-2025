"use client"
import { useEffect, useRef, useState, useLayoutEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mic, PhoneOff, PhoneCall, Volume2, X } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
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
    const [callStartTime, setCallStartTime] = useState<Date | null>(null);
    const [isReconnecting, setIsReconnecting] = useState(false);
    const [isFinalizingSession, setIsFinalizingSession] = useState(false);
    const [reconnectAttempts, setReconnectAttempts] = useState(0);
    const vapiRef = useRef<any>(null);
    const hasSavedRef = useRef(false);
    const isFinalizingSessionRef = useRef(false);
    const transcriptEndRef = useRef<HTMLDivElement>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const callStatusRef = useRef<CallStatus>("idle");
    const isReconnectingRef = useRef(false);
    const isMobile = useIsMobile();

    // Zustand store for preferences
    const {
        selectedAssistant,
        showTranscription,
        setSelectedAssistant: setStoreSelectedAssistant
    } = useCompanionStudyStore();

    const cleanup = () => {
        // Clear any pending reconnection attempts
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }
        if (vapiRef.current) {
            try {
                vapiRef.current.stop();
            } catch (error) { }
            vapiRef.current.removeAllListeners && vapiRef.current.removeAllListeners();
            vapiRef.current = null;
        }
        callStatusRef.current = "ended";
        setCallStatus("ended");
        setAssistantIsSpeaking(false);
        setTranscriptMessages([]);
        setCallStartTime(null);
        isReconnectingRef.current = false;
        setIsReconnecting(false);
        setReconnectAttempts(0);
    };

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
    const saveCompanionSession = async () => {
        if (!callStartTime) {
            return; // Don't save if call never started
        }

        // Extract final transcripts from messages (exclude partial messages)
        const finalMessages = transcriptMessages.filter(msg => !msg.isPartial);
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
            const durationSeconds = Math.max(0, Math.floor((endedAt.getTime() - callStartTime.getTime()) / 1000));

            const response = await fetch('/api/companion-study/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    session_id: sessionId,
                    assistant_id: selectedAssistant,
                    user_transcript: userTranscript || '',
                    assistant_transcript: assistantTranscript || '',
                    duration_seconds: durationSeconds,
                    started_at: callStartTime.toISOString(),
                    ended_at: endedAt.toISOString(),
                }),
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: 'Unknown error' }));
                console.error('Failed to save companion study session:', error);
                // Don't show error toast to user as this is a background operation
                // Session data is still valuable even if save fails
            }
        } catch (error) {
            console.error('Error saving companion study session:', error);
            // Don't show error toast to user as this is a background operation
            // Session data is still valuable even if save fails
        }
    };

    const handleCallEnd = async () => {
        if (isFinalizingSessionRef.current) {
            return;
        }

        isFinalizingSessionRef.current = true;
        setIsFinalizingSession(true);

        if (!hasSavedRef.current) {
            hasSavedRef.current = true;
            await saveCompanionSession();
        }

        try {
            cleanup();
            await onComplete?.();
        } catch (error) {
            console.error("Failed to complete companion study flow:", error);
            toast.error("Session Completed", {
                description: "Your session was saved. Please return to the dashboard manually.",
            });
        }
    };

    // Attempt to reconnect after a disconnection
    const attemptReconnection = async () => {
        if (!vapiRef.current || !callStartTime || hasSavedRef.current) {
            return; // Can't reconnect if call never started or already saved
        }

        const maxReconnectAttempts = 3;
        const currentAttempts = reconnectAttempts;
        
        if (currentAttempts >= maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            toast.error("Connection Lost", {
                description: "Unable to reconnect after multiple attempts. Your session will be saved."
            });
            await handleCallEnd();
            return;
        }

        isReconnectingRef.current = true;
        setIsReconnecting(true);
        setReconnectAttempts(prev => prev + 1);
        callStatusRef.current = "connecting";
        setCallStatus("connecting");

        toast.info("Reconnecting...", {
            description: `Attempt ${currentAttempts + 1} of ${maxReconnectAttempts}`,
            duration: 3000,
        });

        // Wait a bit before attempting reconnection
        reconnectTimeoutRef.current = setTimeout(async () => {
            try {
                // Try to restart the call with the same assistant
                if (vapiRef.current && callStartTime && !hasSavedRef.current) {
                    await vapiRef.current.start(selectedAssistant);
                    isReconnectingRef.current = false;
                    setIsReconnecting(false);
                    setReconnectAttempts(0);
                    callStatusRef.current = "active";
                    toast.success("Reconnected", {
                        description: "Connection restored successfully.",
                        duration: 3000,
                    });
                }
            } catch (error: any) {
                console.error('Reconnection attempt failed:', error);
                // If reconnection fails, try again or give up
                const nextAttempt = currentAttempts + 1;
                if (nextAttempt < maxReconnectAttempts && !hasSavedRef.current) {
                    // Try again after a longer delay
                    reconnectTimeoutRef.current = setTimeout(() => {
                        attemptReconnection();
                    }, 2000 * nextAttempt); // Exponential backoff
                } else {
                    // Give up after max attempts
                    isReconnectingRef.current = false;
                    setIsReconnecting(false);
                    toast.error("Connection Lost", {
                        description: "Unable to reconnect. Your session will be saved."
                    });
                    await handleCallEnd();
                }
            }
        }, 1000 * (currentAttempts + 1)); // Exponential backoff
    };

    useEffect(() => {
        if (!VAPI_PUBLIC_KEY) {
            setCallStatus("ended");
            return;
        }
        if (!vapiRef.current && typeof window !== "undefined") {
            import("@vapi-ai/web").then((VapiModule) => {
                try {
                    const Vapi = VapiModule.default;
                    vapiRef.current = new Vapi(VAPI_PUBLIC_KEY);
                    vapiRef.current.on("call-start", () => {
                        callStatusRef.current = "active";
                        setCallStatus("active");
                        setCallStartTime(new Date());
                    });
                    vapiRef.current.on("call-end", async () => {
                        console.log('Vapi call-end event received');
                        await handleCallEnd();
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
                        console.log('Vapi status update:', status);
                        const statusValue = status?.status || status;
                        
                        // Handle disconnection events
                        if (statusValue === 'disconnected' || statusValue === 'failed') {
                            console.warn('Vapi connection issue detected:', status);
                            
                            Sentry.captureMessage('Vapi connection status change', {
                                level: 'warning',
                                tags: {
                                    location: 'companion-study',
                                    status: statusValue,
                                },
                                extra: status,
                            });

                            // Only attempt reconnection if call was active and not already reconnecting
                            if (callStartTime && !isReconnectingRef.current && callStatusRef.current !== 'ended' && !hasSavedRef.current) {
                                console.log('Attempting to reconnect after status update...');
                                attemptReconnection();
                            } else if (callStatusRef.current === 'ended' || hasSavedRef.current) {
                                // Call already ended, don't attempt reconnection
                                console.log('Call already ended, skipping reconnection');
                            }
                        } else if (statusValue === 'connected' && isReconnectingRef.current) {
                            // Successfully reconnected
                            isReconnectingRef.current = false;
                            setIsReconnecting(false);
                            setReconnectAttempts(0);
                            callStatusRef.current = "active";
                            setCallStatus("active");
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
                                        return [...filtered, {
                                            id: messageId,
                                            role: role as "user" | "assistant",
                                            text: transcript,
                                            isPartial
                                        }];
                                    });
                                }
                            }
                        } catch (error) {
                            console.error('Error processing transcription message:', error);
                            // Don't show error to user for transcription issues
                        }
                    });
                    vapiRef.current.on("error", async (err: any) => {
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
                            callStatus: callStatus,
                            hasCallStarted: callStartTime !== null,
                            sessionId: sessionId,
                            assistantId: selectedAssistant,
                            timestamp: err?.timestamp,
                            errorObject: err?.error,
                        };
                        console.error('Vapi error details:', errorDetails);
                        
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
                        if (callStartTime === null) {
                            cleanup();
                            toast.error("Connection Error", { 
                                description: errorMessage !== 'Unknown error' ? errorMessage : "Failed to start call. Please try again." 
                            });
                            return;
                        }
                        
                        // If it's a recoverable error and call was active, attempt reconnection
                        if (recoverable && !isReconnectingRef.current && !hasSavedRef.current) {
                            console.log('Recoverable error detected, attempting reconnection...');
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
                        await handleCallEnd();
                    });
                    setIsVapiInitialized(true);
                } catch (error: any) {
                    setCallStatus("ended");
                    setAssistantIsSpeaking(false);
                    console.error('VAPI initialization error:', error);
                    toast.error("Initialization Error", {
                        description: error?.message || "Failed to initialize Vapi. Please refresh the page and try again."
                    });
                }
            }).catch((error: any) => {
                setCallStatus("ended");
                setAssistantIsSpeaking(false);
                console.error('VAPI module loading error:', error);
                toast.error("Loading Error", {
                    description: error?.message || "Failed to load Vapi module. Please check your internet connection and try again."
                });
            });
        }
        return () => {
            cleanup();
        };
    }, [onComplete, selectedAssistant]);

    const startCall = async () => {
        if (isFinalizingSessionRef.current || hasSavedRef.current) {
            toast.info("Finishing previous session", {
                description: "Please wait while your previous session is being finalized.",
            });
            return;
        }

        if (!selectedAssistant || typeof selectedAssistant !== "string") {
            toast.error("Assistant Required", { description: "Please select an assistant before starting." });
            return;
        }

        if (!isVapiInitialized) {
            toast.error("Initialization Error", { description: "VAPI is not initialized. Please wait a moment and try again." });
            return;
        }
        if (!vapiRef.current) {
            toast.error("Connection Error", { description: "VAPI connection is not available. Please refresh the page." });
            return;
        }

        setCallStatus("connecting");
        try {
            // Check subscription limit with backend before starting the call
            const limit = await subscriptionApi.checkLimit();
            if (!limit.can_start) {
                setCallStatus("idle");
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
            vapiRef.current.start(selectedAssistant);
        } catch (error: any) {
            console.error('Error starting call:', error);
            let errorMessage = "Could not start the call. ";
            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                errorMessage += "Please grant microphone access and try again.";
            } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
                errorMessage += "No microphone found. Please connect a microphone and try again.";
            } else {
                errorMessage += "Please ensure microphone access is granted.";
            }
            toast.error("Call Start Failed", { description: errorMessage });
            setCallStatus("idle");
            setAssistantIsSpeaking(false);
        }
    };

    const handleAssistantChange = (assistantId: string) => {
        setStoreSelectedAssistant(assistantId);
    };

    const endCall = () => {
        if (vapiRef.current) {
            try {
                vapiRef.current.stop();
            } catch (error) {
                // ignore stop errors on manual hangup
            }
        }
        handleCallEnd();
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
                                disabled={!isVapiInitialized || isFinalizingSession}
                            >
                                <PhoneCall className="h-5 w-5" /> {isFinalizingSession ? "Finishing..." : "Start Call"}
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
                                    size={isMobile ? "icon" : "icon"}
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
