"use client"

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, UIMessage } from 'ai';
import { useState, useEffect, useRef, useMemo } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { modelID } from "@/ai/providers";
import { SystemPromptID } from "@/ai/prompts";
import { defaultModel, defaultPrompt } from "@/ai/config";
import { useIsMobile } from "@/hooks/use-mobile";
import { chatApi } from "@/services/api";
import { ChatInput } from "../chat/chat-input";
import { ChatMessages } from "../chat/chat-messages";
import { MobileChatStudy } from "./mobile/mobile-chat-study";

interface ChatProps {
    sessionId: string;
    onComplete: () => void;
}

// Helper function to extract text content from a message
function getMessageContent(message: UIMessage): string {
    // Check for parts property (new AI SDK format)
    if (message.parts && Array.isArray(message.parts)) {
        return message.parts
            .filter((part: any) => part.type === 'text')
            .map((part: any) => part.text)
            .join('');
    }

    // Fallback for any other format
    return '';
}

export function Chat({ sessionId, onComplete }: ChatProps) {
    const isMobile = useIsMobile();
    const [selectedModel, setSelectedModel] = useState<modelID>(defaultModel);
    const [selectedPrompt, setSelectedPrompt] = useState<SystemPromptID>(defaultPrompt);
    const [isComplete, setIsComplete] = useState(false);
    const [input, setInput] = useState("");
    const initialized = useRef(false);
    const messagesRef = useRef<UIMessage[]>([]);
    const hasSavedRef = useRef(false);

    // Create transport with the API endpoint and body data
    const transport = useMemo(() => new DefaultChatTransport({
        api: "/api/chat",
        body: {
            selectedModel,
            selectedPrompt
        }
    }), [selectedModel, selectedPrompt]);

    // Use the new AI SDK API
    const { messages, status, stop, sendMessage, error } = useChat({
        id: sessionId,
        transport,
        onError: (err) => {
            toast.error(
                err.message.length > 0
                    ? err.message
                    : "An error occurred, please try again later.",
                { position: "top-center", richColors: true }
            );
        },
    });

    const isLoading = status === "streaming" || status === "submitted";

    // Keep messages ref updated
    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    // Add this useEffect to prevent unnecessary re-renders on first use
    useEffect(() => {
        initialized.current = true;
    }, []);

    // Background submission on unmount (user leaves page)
    useEffect(() => {
        return () => {
            // Save messages in background when component unmounts
            if (messagesRef.current.length > 0 && !hasSavedRef.current) {
                const messagesToSave = messagesRef.current.map(msg => ({
                    id: msg.id,
                    role: msg.role,
                    content: getMessageContent(msg),
                }));

                // Use sendBeacon for reliable submission on page unload
                const data = JSON.stringify({
                    session_id: sessionId,
                    messages: messagesToSave,
                    model_used: selectedModel,
                    prompt_used: selectedPrompt,
                });

                // Try fetch with keepalive for reliable submission
                fetch('/api/langportal/chat/sessions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: data,
                    keepalive: true,
                }).catch(() => {
                    // Silently fail - background operation
                });
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
                    content: getMessageContent(msg),
                })),
                model_used: selectedModel,
                prompt_used: selectedPrompt,
            });
        } catch (err) {
            console.error("Failed to save chat session:", err);
            hasSavedRef.current = false; // Allow retry
        }
    };

    const handleCompleteSession = async () => {
        // Save session before completing
        await saveChatSession();
        toast.success("Chat session completed!");
        onComplete();
    }

    // Handle input change
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setInput(e.target.value);
    };

    // Handle form submit - use new sendMessage API
    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (input.trim() && !isLoading) {
            sendMessage({ text: input });
            setInput("");
        }
    };

    // Early return for mobile - use separate mobile component
    if (isMobile) {
        return <MobileChatStudy sessionId={sessionId} onComplete={handleCompleteSession} />;
    }

    if (isComplete) {
        return (
            <div className="text-center py-8 space-y-4">
                <h3 className="text-xl font-bold">Session Complete!</h3>
                <p className="text-muted-foreground">
                    You've completed your language chat practice session.
                </p>
                <Button onClick={handleCompleteSession}>Finish Session</Button>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)]">
            <Card className="flex-1 glass-card flex flex-col h-full overflow-hidden border-0 shadow-lg bg-background/60 backdrop-blur-sm">
                <CardContent className="flex-1 overflow-y-auto p-4 pt-6 pb-0">
                    <ChatMessages messages={messages} isLoading={isLoading} />
                </CardContent>

                <CardFooter className="border-t p-4 mt-auto">
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
                </CardFooter>
            </Card>

        </div>
    )
}
