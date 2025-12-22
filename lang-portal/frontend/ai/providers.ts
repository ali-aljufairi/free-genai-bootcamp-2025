import { groq } from "@ai-sdk/groq";
import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from "ai";

// Lazy provider initialization to avoid build-time errors
// The provider is only created when actually accessed (at runtime)
// See: https://sdk.vercel.ai/providers/ai-sdk-providers/groq

let _model: ReturnType<typeof customProvider> | null = null;

function getModel() {
  if (!_model) {
    _model = customProvider({
      languageModels: {
        "llama-3.1-8b-instant": groq("llama-3.1-8b-instant"),
        "meta-llama/llama-4-maverick-17b-128e-instruct": groq("meta-llama/llama-4-maverick-17b-128e-instruct"),
        "qwen-qwq-32b": groq("qwen-qwq-32b"),
        "deepseek-r1-distill-llama-70b": wrapLanguageModel({
          middleware: extractReasoningMiddleware({
            tagName: "think",
          }),
          model: groq("deepseek-r1-distill-llama-70b"),
        }),
        "llama-3.3-70b-versatile": groq("llama-3.3-70b-versatile"),
      },
    });
  }
  return _model;
}

// Export a proxy object that lazily initializes the model
export const model = {
  languageModel: (id: modelID) => getModel().languageModel(id),
};

export type modelID = 
  | "llama-3.1-8b-instant"
  | "meta-llama/llama-4-maverick-17b-128e-instruct"
  | "qwen-qwq-32b"
  | "deepseek-r1-distill-llama-70b"
  | "llama-3.3-70b-versatile";