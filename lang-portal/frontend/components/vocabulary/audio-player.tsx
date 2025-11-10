"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface AudioPlayerProps {
    audioPath?: string | null;
    text: string;
    className?: string;
}

export function AudioPlayer({ audioPath, text, className }: AudioPlayerProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            // Stop audio playback
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
            // Stop speech synthesis
            if (window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
            if (speechRef.current) {
                speechRef.current = null;
            }
        };
    }, []);

    const handlePlay = async () => {
        // If already playing, stop it
        if (isPlaying) {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }
            if (window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
            setIsPlaying(false);
            setIsLoading(false);
            return;
        }

        // If we have an audio path, try to play it
        if (audioPath && audioPath.trim()) {
            try {
                setIsLoading(true);
                setIsPlaying(true);

                // Create audio element if it doesn't exist
                if (!audioRef.current) {
                    audioRef.current = new Audio(audioPath);
                } else {
                    audioRef.current.src = audioPath;
                }

                // Set up event handlers
                audioRef.current.onended = () => {
                    setIsPlaying(false);
                    setIsLoading(false);
                };

                audioRef.current.onerror = (error) => {
                    console.error("Audio playback error:", error);
                    setIsPlaying(false);
                    setIsLoading(false);
                    // Fallback to TTS on error
                    playTTS();
                };

                audioRef.current.onloadstart = () => {
                    setIsLoading(true);
                };

                audioRef.current.oncanplay = () => {
                    setIsLoading(false);
                };

                // Play the audio
                await audioRef.current.play();
            } catch (error) {
                console.error("Failed to play audio:", error);
                setIsPlaying(false);
                setIsLoading(false);
                // Fallback to TTS on error
                playTTS();
            }
        } else {
            // No audio path, use TTS
            playTTS();
        }
    };

    const playTTS = () => {
        // Check if Web Speech API is supported
        if (!window.speechSynthesis) {
            toast.error("Text-to-speech not supported", {
                description: "Your browser doesn't support text-to-speech.",
            });
            return;
        }

        try {
            setIsLoading(true);
            setIsPlaying(true);

            // Cancel any ongoing speech
            window.speechSynthesis.cancel();

            // Create utterance
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = "ja-JP";
            utterance.rate = 0.9; // Slightly slower for clarity
            utterance.pitch = 1.0;
            utterance.volume = 1.0;

            // Set up event handlers
            utterance.onend = () => {
                setIsPlaying(false);
                setIsLoading(false);
                speechRef.current = null;
            };

            utterance.onerror = (error) => {
                console.error("TTS error:", error);
                setIsPlaying(false);
                setIsLoading(false);
                toast.error("Failed to play audio", {
                    description: "Could not generate speech. Please try again.",
                });
                speechRef.current = null;
            };

            speechRef.current = utterance;
            window.speechSynthesis.speak(utterance);
            setIsLoading(false);
        } catch (error) {
            console.error("TTS failed:", error);
            setIsPlaying(false);
            setIsLoading(false);
            toast.error("Failed to play audio", {
                description: "Could not generate speech. Please try again.",
            });
        }
    };

    return (
        <Button
            variant="ghost"
            size="icon"
            className={`h-9 w-9 ${className || ""}`}
            onClick={handlePlay}
            disabled={isLoading}
            aria-label={isPlaying ? "Stop audio" : "Play audio"}
        >
            {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-green-600 dark:text-green-400" />
            ) : (
                <Volume2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            )}
        </Button>
    );
}

