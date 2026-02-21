export interface CompanionStudyProps {
    sessionId: string;
    onComplete: () => void;
}

export type CallStatus = "idle" | "connecting" | "active" | "speaking" | "listening" | "ended";

export interface TranscriptMessage {
    id: string;
    role: "user" | "assistant";
    text: string;
    isPartial: boolean;
}

export interface AssistantConfig {
    id: string;
    name: string;
    description: string;
}

export interface VapiClient {
    start: (assistantId: string) => Promise<void>;
    stop: () => void;
    on: (event: string, handler: (...args: any[]) => void) => void;
    removeAllListeners?: () => void;
}
