import { modelID } from "@/ai/providers";
import { SystemPromptID, defaultPrompt } from "@/ai/prompts";
import { availableModels, availablePrompts } from "@/ai/config";
import { Textarea as ShadcnTextarea } from "@/components/ui/textarea";
import { ArrowUp } from "lucide-react";
import { useState } from "react";

interface ChatInputProps {
    input: string;
    handleInputChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
    isLoading: boolean;
    selectedModel: modelID;
    setSelectedModel: (model: modelID) => void;
    selectedPrompt?: SystemPromptID;
    setSelectedPrompt?: (prompt: SystemPromptID) => void;
}

export function ChatInput({
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    selectedModel,
    setSelectedModel,
    selectedPrompt = defaultPrompt,
    setSelectedPrompt,
}: ChatInputProps) {
    const [showModelPicker, setShowModelPicker] = useState(false);
    const [showPromptPicker, setShowPromptPicker] = useState(false);

    // Get current model label
    const currentModelLabel = availableModels.find(m => m.id === selectedModel)?.label || selectedModel.split('-')[0].charAt(0).toUpperCase() + selectedModel.split('-')[0].slice(1);

    // Get current prompt label
    const currentPromptLabel = availablePrompts.find(p => p.id === selectedPrompt)?.label || selectedPrompt;

    return (
        <form onSubmit={handleSubmit} className="w-full">
            <div className="relative w-full pt-4">
                <ShadcnTextarea
                    className="resize-none bg-secondary w-full rounded-2xl pr-12 pt-4 pb-16"
                    value={input}
                    autoFocus
                    placeholder="Type your message..."
                    onChange={handleInputChange}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            if (input.trim() && !isLoading) {
                                // @ts-expect-error err
                                const form = e.target.closest("form");
                                if (form) form.requestSubmit();
                            }
                        }
                    }}
                    onClick={() => {
                        setShowModelPicker(false);
                        setShowPromptPicker(false);
                    }}
                />
                <div className="absolute left-2 bottom-2 flex space-x-2">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            setShowModelPicker(!showModelPicker);
                            setShowPromptPicker(false);
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
                    >
                        {currentModelLabel} ▾
                    </button>
                    {setSelectedPrompt && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                setShowPromptPicker(!showPromptPicker);
                                setShowModelPicker(false);
                            }}
                            className="text-xs text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
                        >
                            {currentPromptLabel} ▾
                        </button>
                    )}
                    {showModelPicker && (
                        <div className="absolute bottom-10 left-0 bg-background border border-border rounded-md p-2 z-10 w-[200px] shadow-md">
                            <div className="space-y-2">
                                {availableModels.map((model) => (
                                    <button
                                        key={model.id}
                                        type="button"
                                        onClick={() => {
                                            setSelectedModel(model.id);
                                            setShowModelPicker(false);
                                        }}
                                        className={`w-full text-left text-xs px-2 py-1 rounded-md ${selectedModel === model.id ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/50"}`}
                                    >
                                        {model.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    {showPromptPicker && setSelectedPrompt && (
                        <div className="absolute bottom-10 left-[150px] bg-background border border-border rounded-md p-2 z-10 w-[200px] shadow-md">
                            <div className="space-y-2">
                                {availablePrompts.map((prompt) => (
                                    <button
                                        key={prompt.id}
                                        type="button"
                                        onClick={() => {
                                            setSelectedPrompt(prompt.id);
                                            setShowPromptPicker(false);
                                        }}
                                        className={`w-full text-left text-xs px-2 py-1 rounded-md ${selectedPrompt === prompt.id ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/50"}`}
                                    >
                                        {prompt.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className="absolute right-2 bottom-2 rounded-full p-2 bg-primary hover:bg-primary/80 disabled:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {isLoading ? (
                        <div className="animate-spin h-4 w-4">
                            <svg className="h-4 w-4 text-white" viewBox="0 0 24 24">
                                <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                    fill="none"
                                />
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                />
                            </svg>
                        </div>
                    ) : (
                        <ArrowUp className="h-4 w-4 text-white" />
                    )}
                </button>
            </div>
        </form>
    );
}
