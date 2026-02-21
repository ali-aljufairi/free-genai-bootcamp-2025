import type { AssistantConfig } from "./types";

export const VAPI_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;

export const ASSISTANTS: Record<string, AssistantConfig> = {
    casual: {
        id: "815decc2-cab8-4907-9472-cbd6f882f232",
        name: "Casual Talk",
        description: "Practice casual conversation",
    },
    interview: {
        id: "709d3490-2dbd-414b-9855-84060073fce9",
        name: "Job Interview",
        description: "Practice job interview scenarios",
    },
    keigo: {
        id: "e1a9b76f-c493-4a09-ad6b-5e123184bad2",
        name: "Keigo",
        description: "Practice Keigo",
    },
    angryCustomer: {
        id: "136fcc43-0ba0-4092-999a-d13b871747db",
        name: "Angry Customer",
        description: "Practice handling difficult customer situations",
    },
};

export const MAX_RECONNECT_ATTEMPTS = 3;

const RECOVERABLE_ERROR_PATTERNS = [
    "network",
    "timeout",
    "connection",
    "websocket",
    "disconnected",
    "failed to connect",
    "connection lost",
    "connection closed",
    "socket",
];

const FATAL_ERROR_PATTERNS = [
    "unauthorized",
    "forbidden",
    "invalid",
    "permission",
    "not found",
    "404",
    "401",
    "403",
];

export function isRecoverableError(err: unknown): boolean {
    if (!err) {
        return false;
    }

    const errObj = err as {
        message?: unknown;
        code?: unknown;
        type?: unknown;
        error?: {
            code?: unknown;
            type?: unknown;
        };
    };

    const errorMessage = String(errObj.message ?? "").toLowerCase();
    const errorCode = String(errObj.code ?? errObj.error?.code ?? "").toLowerCase();
    const errorType = String(errObj.type ?? errObj.error?.type ?? "").toLowerCase();

    if (FATAL_ERROR_PATTERNS.some((pattern) =>
        errorMessage.includes(pattern) ||
        errorCode.includes(pattern) ||
        errorType.includes(pattern)
    )) {
        return false;
    }

    return RECOVERABLE_ERROR_PATTERNS.some((pattern) =>
        errorMessage.includes(pattern) ||
        errorCode.includes(pattern) ||
        errorType.includes(pattern)
    );
}
