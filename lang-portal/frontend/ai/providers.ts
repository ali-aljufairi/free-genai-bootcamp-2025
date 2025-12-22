import { createGroq } from "@ai-sdk/groq";
import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from "ai";

// Lazy initialization of Groq client to ensure runtime env var access
// Based on AI SDK best practices: environment variables should be accessed at runtime, not module load time
// See: https://sdk.vercel.ai/providers/ai-sdk-providers/groq
let _groqInstance: ReturnType<typeof createGroq> | null = null;

function getGroq() {
  if (!_groqInstance) {
    const apiKey = process.env.GROQ_API_KEY;
    
    if (!apiKey) {
      console.error('GROQ_API_KEY is not set in environment variables');
      throw new Error('GROQ_API_KEY environment variable is required');
    }
    
    _groqInstance = createGroq({
      apiKey: apiKey,
    });
  }
  
  return _groqInstance;
}

// custom provider with different model settings:
export const model = customProvider({
  languageModels: {
    "llama-3.1-8b-instant": getGroq()("llama-3.1-8b-instant"),
    "meta-llama/llama-4-maverick-17b-128e-instruct": getGroq()("meta-llama/llama-4-maverick-17b-128e-instruct"),
    "qwen-qwq-32b": getGroq()("qwen-qwq-32b"),
    "deepseek-r1-distill-llama-70b": wrapLanguageModel({
      middleware: extractReasoningMiddleware({
        tagName: "think",
      }),
      model: getGroq()("deepseek-r1-distill-llama-70b"),
    }),
    "llama-3.3-70b-versatile": getGroq()("llama-3.3-70b-versatile"),
  },
});

export type modelID = Parameters<(typeof model)["languageModel"]>["0"];