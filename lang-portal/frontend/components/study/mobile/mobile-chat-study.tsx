"use client"

import { useChat } from '@ai-sdk/react';
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { modelID } from "@/ai/providers";
import { SystemPromptID } from "@/ai/prompts";
import { defaultModel, defaultPrompt } from "@/ai/config";
import { chatApi } from "@/services/api";
import { ChatInput } from "../../chat/chat-input";
import { ChatMessages } from "../../chat/chat-messages";

interface MobileChatStudyProps {
    sessionId: string;
    onComplete: () => void;
}

export function MobileChatStudy({ sessionId, onComplete }: MobileChatStudyProps) {
    const router = useRouter();
    const [selectedModel, setSelectedModel] = useState<modelID>(defaultModel);
    const [selectedPrompt, setSelectedPrompt] = useState<SystemPromptID>(defaultPrompt);
    const [isComplete, setIsComplete] = useState(false);
    const messagesRef = useRef<any[]>([]);
    const hasSavedRef = useRef(false);

    const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
        api: "/api/chat",
        body: {
            selectedModel,
            selectedPrompt
        },
        id: sessionId
    });

    // Keep messages ref updated
    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    // Background submission on unmount (user leaves page)
    useEffect(() => {
        return () => {
            // Save messages in background when component unmounts
            if (messagesRef.current.length > 0 && !hasSavedRef.current) {
                const messagesToSave = messagesRef.current.map(msg => ({
                    id: msg.id,
                    role: msg.role,
                    content: msg.content,
                }));

                // Use sendBeacon for reliable submission on page unload
                const data = JSON.stringify({
                    session_id: sessionId,
                    messages: messagesToSave,
                    model_used: selectedModel,
                    prompt_used: selectedPrompt,
                });

                // Try sendBeacon first (works on page unload)
                if (navigator.sendBeacon) {
                    const blob = new Blob([data], { type: 'application/json' });
                    fetch('/api/langportal/chat/sessions', {
                        method: 'POST',
                        body: blob,
                        keepalive: true,
                    }).catch(() => {
                        // Silently fail - background operation
                    });
                } else {
                    // Fallback to fetch with keepalive
                    fetch('/api/langportal/chat/sessions', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: data,
                        keepalive: true,
                    }).catch(() => {
                        // Silently fail - background operation
                    });
                }
            }
        };
    }, [sessionId, selectedModel, selectedPrompt]);

    // Save chat session function
    const saveChatSession = async () => {
        if (messages.length === 0 || hasSavedRef.current) return;

        try {
            hasSavedRef.current = true;
            await chatApi.saveSession({
                session_id: sessionId,
                messages: messages.map(msg => ({
                    id: msg.id,
                    role: msg.role,
                    content: msg.content,
                })),
                model_used: selectedModel,
                prompt_used: selectedPrompt,
            });
        } catch (error) {
            console.error("Failed to save chat session:", error);
            hasSavedRef.current = false; // Allow retry
        }
    };

    const handleCompleteSession = async () => {
        // Save session before completing
        await saveChatSession();
        toast.success("Chat session completed!");
        onComplete();
    }

    const handleExit = () => {
        // Save before exiting
        saveChatSession();
        router.push("/study");
    }

    if (isComplete) {
        return (
            <div className="fixed inset-0 z-50 bg-background flex flex-col">
                <div className="flex items-center justify-between px-4 py-2 border-b bg-background/95 backdrop-blur-sm">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleExit}
                        className="h-9 w-9 p-0 flex items-center justify-center"
                    >
                        <X className="h-5 w-5" />
                    </Button>
                </div>
                <div className="flex-1 flex items-center justify-center p-8">
                    <div className="text-center space-y-4">
                        <h3 className="text-3xl font-bold">Session Complete!</h3>
                        <p className="text-xl text-muted-foreground">
                            You've completed your language chat practice session.
                        </p>
                        <Button onClick={handleCompleteSession} className="text-lg h-12 px-8">
                            Finish Session
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
            {/* Top Bar */}
            <div className="flex items-center justify-between px-4 py-2 border-b bg-background/95 backdrop-blur-sm">
                <h2 className="text-lg font-semibold">Chat Practice</h2>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleExit}
                    className="h-9 w-9 p-0 flex items-center justify-center"
                >
                    <X className="h-5 w-5" />
                </Button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4">
                <ChatMessages messages={messages} isLoading={isLoading} />
            </div>

            {/* Input Area */}
            <div className="border-t p-4 bg-background/95 backdrop-blur-sm">
                <ChatInput
                    input={input}
                    handleInputChange={handleInputChange}
                    handleSubmit={handleSubmit}
                    isLoading={isLoading}
                    selectedModel={selectedModel}
                    setSelectedModel={setSelectedModel}
                    selectedPrompt={selectedPrompt}
                    setSelectedPrompt={setSelectedPrompt}
                />
            </div>
        </div>
    )
}

