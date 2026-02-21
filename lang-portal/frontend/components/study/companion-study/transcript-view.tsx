"use client";

import { useLayoutEffect, useRef } from "react";
import { motion } from "framer-motion";
import type { TranscriptMessage } from "./types";

interface TranscriptViewProps {
    transcriptMessages: TranscriptMessage[];
}

export function TranscriptView({ transcriptMessages }: TranscriptViewProps) {
    const transcriptEndRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [transcriptMessages]);

    return (
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
                                <div
                                    className={`text-xs font-semibold mb-1 ${message.role === "user"
                                        ? "text-blue-700 dark:text-blue-300"
                                        : "text-purple-700 dark:text-purple-300"
                                    }`}
                                >
                                    {message.role === "user" ? "You" : "Assistant"}
                                </div>
                                <div
                                    className={`text-sm ${message.role === "user"
                                        ? "text-blue-900 dark:text-blue-100"
                                        : "text-purple-900 dark:text-purple-100"
                                    }`}
                                >
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
    );
}
