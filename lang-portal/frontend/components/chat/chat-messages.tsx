import { UIMessage } from "ai";
import { Skeleton } from "@/components/ui/skeleton";
import { useLayoutEffect, useRef } from "react";
import { Markdown } from "@/components/ui/markdown";

interface ChatMessageProps {
    messages: UIMessage[];
    isLoading: boolean;
}

// Helper function to extract text content from a message
function getMessageContent(message: UIMessage): string {
    // If content is a string, return it directly
    if (typeof message.content === 'string') {
        return message.content;
    }

    // If content is an array of parts, extract text from text parts
    if (Array.isArray(message.content)) {
        return message.content
            .filter((part: any) => part.type === 'text')
            .map((part: any) => part.text)
            .join('');
    }

    // Fallback: try to get text from parts property (new AI SDK format)
    if (message.parts && Array.isArray(message.parts)) {
        return message.parts
            .filter((part: any) => part.type === 'text')
            .map((part: any) => part.text)
            .join('');
    }

    return '';
}

export function ChatMessages({ messages, isLoading }: ChatMessageProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Using useLayoutEffect instead of useEffect for DOM manipulation
    // This runs synchronously after DOM mutations but before browser paint
    useLayoutEffect(() => {
        // Scroll to bottom whenever messages or loading state changes
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading]);

    return (
        <div className="space-y-4 py-4">
            {messages.length === 0 && (
                <div className="text-center py-8">
                    <p className="text-muted-foreground">
                        Start chatting to practice your language skills. The AI will respond in the language you're learning.
                    </p>
                </div>
            )}

            {messages.map((message) => {
                const content = getMessageContent(message);

                return (
                    <div
                        key={message.id}
                        className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                        <div
                            className={`
                  max-w-[80%] rounded-lg px-4 py-2
                  ${message.role === "user"
                                    ? "bg-primary/10 text-foreground"
                                    : "bg-muted text-foreground"
                                }
                `}
                        >
                            <div className="text-xs text-muted-foreground mb-1">
                                {message.role === "user" ? "You" : "Language Tutor"}
                            </div>
                            <div className="text-sm">
                                <Markdown>{content}</Markdown>
                            </div>
                        </div>
                    </div>
                );
            })}

            {isLoading && (
                <div className="flex justify-start">
                    <div className="max-w-[80%] rounded-lg px-4 py-2 bg-muted">
                        <Skeleton className="h-4 w-[200px] mb-2" />
                        <Skeleton className="h-4 w-[150px]" />
                    </div>
                </div>
            )}

            {/* Invisible element to scroll to */}
            <div ref={messagesEndRef} />
        </div>
    );
}
