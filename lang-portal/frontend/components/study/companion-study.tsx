"use client";

import { useCallback } from "react";
import { Mic } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useIsMobile } from "@/components/ui/use-mobile";
import { useCompanionStudyStore } from "@/stores/companion-study-store";
import { VAPI_PUBLIC_KEY } from "./companion-study/constants";
import { ActivePanel } from "./companion-study/active-panel";
import { IdlePanel } from "./companion-study/idle-panel";
import { useCompanionCallSession } from "./companion-study/use-companion-call-session";
import type { CompanionStudyProps } from "./companion-study/types";

export function CompanionStudy({ sessionId, onComplete, usageInline }: CompanionStudyProps) {
    const isMobile = useIsMobile();

    const {
        selectedAssistant,
        showTranscription,
        setSelectedAssistant: setStoreSelectedAssistant,
    } = useCompanionStudyStore();

    const {
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
    } = useCompanionCallSession({
        sessionId,
        selectedAssistant,
        onComplete,
    });

    const handleAssistantChange = useCallback((assistantId: string) => {
        setStoreSelectedAssistant(assistantId);
    }, [setStoreSelectedAssistant]);

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

    const showIdlePanel = callStatus === "idle" || callStatus === "ended";

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
                    {usageInline}
                </CardHeader>

                <CardContent className="flex-1 flex flex-col overflow-hidden p-4 sm:p-8">
                    {showIdlePanel ? (
                        <IdlePanel
                            selectedAssistant={selectedAssistant}
                            isVapiInitialized={isVapiInitialized}
                            isFinalizingSession={isFinalizingSession}
                            hasSavedSession={hasSavedSession}
                            onAssistantChange={handleAssistantChange}
                            onStartCall={startCall}
                        />
                    ) : (
                        <ActivePanel
                            callStatus={callStatus}
                            isReconnecting={isReconnecting}
                            reconnectAttempts={reconnectAttempts}
                            assistantIsSpeaking={assistantIsSpeaking}
                            isMobile={isMobile}
                            isFinalizingSession={isFinalizingSession}
                            showTranscription={showTranscription}
                            transcriptMessages={transcriptMessages}
                            onEndCall={endCall}
                        />
                    )}
                </CardContent>

                <CardFooter>
                    <div className="text-xs text-muted-foreground w-full text-center" />
                </CardFooter>
            </Card>
        </div>
    );
}
