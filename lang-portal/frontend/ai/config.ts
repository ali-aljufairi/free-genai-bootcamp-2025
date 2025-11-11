import { modelID } from "./providers";
import { SystemPromptID } from "./prompts";

// Available models configuration
export interface ModelConfig {
  id: modelID;
  label: string;
}

export const availableModels: ModelConfig[] = [
  {
    id: "llama-3.3-70b-versatile",
    label: "Llama 3.3 70B (Best Quality)",
  },
  {
    id: "llama-3.1-8b-instant",
    label: "Llama 3.1 8B (Faster)",
  },
  {
    id: "deepseek-r1-distill-llama-70b",
    label: "DeepSeek R1 70B",
  },
];

// Default model
export const defaultModel: modelID = "llama-3.3-70b-versatile";

// Available prompts configuration
export interface PromptConfig {
  id: SystemPromptID;
  label: string;
}

export const availablePrompts: PromptConfig[] = [
  {
    id: "Grammar-Explainer",
    label: "Grammar Explainer",
  },
  {
    id: "sentence-construction",
    label: "Sentence Constructor",
  },
  {
    id: "japanese-only",
    label: "Japanese Only",
  },
  {
    id: "grammar-focus",
    label: "Grammar Focus",
  },
  {
    id: "conversation-partner",
    label: "Conversation Partner",
  },
  {
    id: "speech-analysis-japanese",
    label: "Speech Analysis (Japanese)",
  },
  {
    id: "vocabulary-builder",
    label: "Vocabulary Builder",
  },
];

// Default prompt
export const defaultPrompt: SystemPromptID = "Grammar-Explainer";

