"use client";

import { PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ASSISTANTS } from "./constants";

interface IdlePanelProps {
    selectedAssistant: string;
    isVapiInitialized: boolean;
    isFinalizingSession: boolean;
    hasSavedSession: boolean;
    onAssistantChange: (assistantId: string) => void;
    onStartCall: () => Promise<void>;
}

export function IdlePanel({
    selectedAssistant,
    isVapiInitialized,
    isFinalizingSession,
    hasSavedSession,
    onAssistantChange,
    onStartCall,
}: IdlePanelProps) {
    return (
        <div className="flex flex-col items-center justify-center gap-4 w-full max-w-md mx-auto h-full">
            <Select value={selectedAssistant} onValueChange={onAssistantChange}>
                <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select an assistant" />
                </SelectTrigger>
                <SelectContent>
                    {Object.entries(ASSISTANTS).map(([assistantKey, assistant]) => (
                        <SelectItem key={assistantKey} value={assistant.id}>
                            {assistant.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Button
                onClick={() => {
                    void onStartCall();
                }}
                className="flex items-center gap-2 w-full"
                size="lg"
                disabled={!isVapiInitialized || isFinalizingSession || hasSavedSession}
                aria-label={hasSavedSession ? "Session saved, restart disabled" : "Start Call"}
            >
                <PhoneCall className="h-5 w-5" />
                {hasSavedSession ? "Session Saved" : isFinalizingSession ? "Finishing..." : "Start Call"}
            </Button>
        </div>
    );
}
