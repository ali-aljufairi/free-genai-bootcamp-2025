"use client"

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, UIMessage } from 'ai';
import { useState, useEffect, useRef, useMemo } from "react";
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

export function MobileChatStudy({ sessionId, onComplete }: MobileChatStudyProps) {
    const router = useRouter();
    const [selectedModel, setSelectedModel] = useState<modelID>(defaultModel);
    const [selectedPrompt, setSelectedPrompt] = useState<SystemPromptID>(defaultPrompt);
    const [isComplete, setIsComplete] = useState(false);
    const [input, setInput] = useState("");
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

                // Use fetch with keepalive for reliable submission
                const data = JSON.stringify({
                    session_id: sessionId,
                    messages: messagesToSave,
                    model_used: selectedModel,
                    prompt_used: selectedPrompt,
                });

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

    const handleExit = () => {
        // Save before exiting
        saveChatSession();
        router.push("/study");
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
