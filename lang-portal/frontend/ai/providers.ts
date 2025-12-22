import { createGroq } from "@ai-sdk/groq";
import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from "ai";

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY ,
});

// custom provider with different model settings:
export const model = customProvider({
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

export type modelID = Parameters<(typeof model)["languageModel"]>["0"];