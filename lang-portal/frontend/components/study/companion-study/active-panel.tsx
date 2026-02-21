"use client";

import { PhoneOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FluidVisualization } from "./fluid-visualization";
import { TranscriptView } from "./transcript-view";
import type { CallStatus, TranscriptMessage } from "./types";

interface ActivePanelProps {
    callStatus: CallStatus;
    isReconnecting: boolean;
    reconnectAttempts: number;
    assistantIsSpeaking: boolean;
    isMobile: boolean;
    isFinalizingSession: boolean;
    showTranscription: boolean;
    transcriptMessages: TranscriptMessage[];
    onEndCall: () => Promise<void>;
}

function getStatusLabel(callStatus: CallStatus, isReconnecting: boolean, reconnectAttempts: number): string {
    if (isReconnecting) {
        return `Reconnecting... (${reconnectAttempts}/3)`;
    }
    if (callStatus === "connecting") {
        return "Connecting...";
    }
    if (callStatus === "active") {
        return "Connected";
    }
    if (callStatus === "listening") {
        return "Listening...";
    }
    if (callStatus === "speaking") {
        return "Speaking...";
    }
    return "";
}

export function ActivePanel({
    callStatus,
    isReconnecting,
    reconnectAttempts,
    assistantIsSpeaking,
    isMobile,
    isFinalizingSession,
    showTranscription,
    transcriptMessages,
    onEndCall,
}: ActivePanelProps) {
    return (
        <div className="flex flex-col h-full gap-4">
            <div className="text-center text-muted-foreground text-base min-h-[2em] flex items-center justify-center">
                {getStatusLabel(callStatus, isReconnecting, reconnectAttempts)}
            </div>

            <div className={`flex items-center justify-center ${isMobile ? "w-32 h-32 mx-auto" : "w-48 h-48 mx-auto"}`}>
                <FluidVisualization
                    isActive
                    isListening={callStatus === "listening"}
                    isSpeaking={assistantIsSpeaking}
                    size={isMobile ? 128 : 192}
                />
            </div>

            {showTranscription ? <TranscriptView transcriptMessages={transcriptMessages} /> : null}

            <div className="flex items-center justify-center pt-4">
                <Button
                    onClick={() => {
                        if (isFinalizingSession) {
                            return;
                        }

                        onEndCall().catch((error) => {
                            console.error("Failed to end call:", error);
                            toast.error("Call End Failed", {
                                description: "Unable to finalize the call. Please try again.",
                            });
                        });
                    }}
                    disabled={isFinalizingSession}
                    variant="destructive"
                    size="icon"
                    className={`${isMobile ? "h-12 w-12 rounded-full" : "h-14 w-14 rounded-full"} shadow-lg`}
                    aria-label="End Call"
                >
                    <PhoneOff className={isMobile ? "h-6 w-6" : "h-7 w-7"} />
                </Button>
            </div>
        </div>
    );
}
