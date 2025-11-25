'use client';

import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Image as ImageIcon, FileText, Loader2, FileSearch } from "lucide-react";
import { useSpeechStudy } from "@/hooks/api/use-speech-study";
import { Skeleton } from "@/components/ui/skeleton";
import { Markdown } from "@/components/ui/markdown";

interface SpeechStudyProps {
    sessionId: string;
    onComplete: () => void;
}

export function SpeechStudy({ sessionId, onComplete }: SpeechStudyProps) {
    const {
        transcription,
        generatedImage,
        analysisResult,
        isProcessing,
        isRecording,
        isAnalyzing,
        recordingTime,
        audioLevel,
        error,
        startRecording,
        stopRecording,
        formatTime
    } = useSpeechStudy(sessionId);

    return (
        <div className="space-y-6 min-h-screen w-full p-4 md:p-6 lg:p-8">
            <Card className="glass-card w-full">
                <CardContent className="pt-6">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Mic className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            <h3 className="text-xl font-bold">Speech to Image Study</h3>
                        </div>

                        <p className="text-sm text-muted-foreground">
                            Speak into your microphone to describe a scenario in Japanese or English.
                            Our AI will transcribe your speech, analyze it, and generate an image based on your description.
                        </p>

                        <div className="grid gap-4 pt-4">
                            <div className="flex flex-col items-center gap-4">
                                <div className="relative w-full max-w-md">
                                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg blur-xl"></div>
                                    <div className="relative bg-background/80 backdrop-blur-sm rounded-lg p-6 border border-border/50">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-full h-24 flex items-center justify-center">
                                                {isRecording ? (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <div className="w-full h-16 bg-muted rounded-lg overflow-hidden">
                                                            <div
                                                                className="h-full bg-blue-500 transition-all duration-100"
                                                                style={{
                                                                    width: `${audioLevel * 100}%`,
                                                                    opacity: 0.5 + (audioLevel * 0.5)
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-4xl font-mono text-muted-foreground">
                                                        {formatTime(recordingTime)}
                                                    </div>
                                                )}
                                            </div>

                                            <Button
                                                onClick={isRecording ? stopRecording : startRecording}
                                                disabled={isProcessing}
                                                variant={isRecording ? "destructive" : "default"}
                                                size="lg"
                                                className="w-full md:w-auto min-w-[200px]"
                                            >
                                                {isProcessing ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        Processing...
                                                    </>
                                                ) : isRecording ? (
                                                    <>
                                                        <MicOff className="mr-2 h-4 w-4" />
                                                        Stop Recording
                                                    </>
                                                ) : (
                                                    <>
                                                        <Mic className="mr-2 h-4 w-4" />
                                                        Start Recording
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {error && (
                                    <p className="text-sm text-destructive">{error}</p>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {transcription && (
                <Card className="glass-card w-full">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2 mb-4">
                            <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            <h3 className="text-xl font-bold">Your Transcription</h3>
                        </div>
                        <p className="text-sm bg-muted p-4 rounded-md">{transcription}</p>
                    </CardContent>
                </Card>
            )}

            {(isAnalyzing || analysisResult) && (
                <Card className="glass-card w-full">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2 mb-4">
                            <FileSearch className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            <h3 className="text-xl font-bold">Speech Analysis</h3>
                            {isAnalyzing && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                        </div>
                        {isAnalyzing && !analysisResult ? (
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-[90%]" />
                                <Skeleton className="h-4 w-[85%]" />
                            </div>
                        ) : (
                            <div className="text-sm bg-muted p-4 rounded-md">
                                <Markdown>{analysisResult}</Markdown>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {generatedImage && (
                <Card className="glass-card w-full">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2 mb-4">
                            <ImageIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            <h3 className="text-xl font-bold">Generated Image</h3>
                        </div>
                        <div className="relative rounded-lg overflow-hidden">
                            <img
                                src={generatedImage}
                                alt="Generated scenario"
                                className="w-full h-auto object-cover"
                            />
                        </div>
                        <div className="mt-4 flex justify-end">
                            <Button
                                onClick={onComplete}
                                variant="outline"
                            >
                                Complete Session
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}