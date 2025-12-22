import { model, modelID } from "@/ai/providers";
import { systemPrompts, SystemPromptID } from "@/ai/prompts";
import { defaultModel, defaultPrompt } from "@/ai/config";
import { streamText, UIMessage, convertToModelMessages } from 'ai';
import { auth } from '@clerk/nextjs/server';
import { getBackendUrl } from '@/lib/api-utils';
import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

// Grammar-focused prompts that should include grammar context
const GRAMMAR_PROMPTS: SystemPromptID[] = ["Grammar-Explainer", "grammar-focus"];

async function getRecentGrammarContext(): Promise<string> {
  try {
    const authResult = await auth();
    if (!authResult.userId) return "";
    
    const token = await authResult.getToken();
    if (!token) return "";

    const backendUrl = getBackendUrl();
    const response = await fetch(`${backendUrl}/api/langportal/grammar/recent?limit=10`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) return "";

    const recentGrammar = await response.json();
    
    if (!Array.isArray(recentGrammar) || recentGrammar.length === 0) {
      return "";
    }

    // Format grammar points for context
    const grammarList = recentGrammar
      .map((g: any) => `- ${g.key}${g.base_form !== g.key ? ` (${g.base_form})` : ''} (${g.level})${g.structure ? `: ${g.structure}` : ''}`)
      .join('\n');

    return `\n\nRecently Studied Grammar Points:\n${grammarList}\n\nWhen the user asks about grammar, prioritize these recently studied points and use them as examples when relevant.`;
  } catch (error) {
    console.error('Failed to fetch recent grammar context:', error);
    return "";
  }
}

function addGrammarGuardrails(basePrompt: string, isGrammarPrompt: boolean): string {
  if (!isGrammarPrompt) return basePrompt;

  const guardrails = `

IMPORTANT GUIDELINES:
- You MUST only discuss Japanese grammar topics. If the user asks about non-grammar topics (vocabulary meanings, kanji readings, general conversation, etc.), politely redirect them to grammar-related questions.
- Focus on grammar patterns, structures, usage, and examples.
- If asked about vocabulary, explain how it relates to grammar patterns instead.
- Keep all explanations grammar-focused and educational.`;

  return basePrompt + guardrails;
}

export async function POST(req: Request) {
  // Check API key configuration before processing request
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    Sentry.captureMessage('GROQ_API_KEY not configured', 'error');
    return NextResponse.json(
      { error: 'AI service not configured', code: 'CONFIG_ERROR' },
      { status: 500 }
    );
  }

  const {
    messages,
    selectedModel = defaultModel, // Default model from config
    selectedPrompt = defaultPrompt, // Default prompt from config
  }: { 
    messages: UIMessage[]; 
    selectedModel?: modelID;
    selectedPrompt?: SystemPromptID;
  } = await req.json();

  // Get the system prompt text based on the selected prompt ID
  let systemPromptText = systemPrompts[selectedPrompt];

  // Check if this is a grammar-focused prompt
  const isGrammarPrompt = GRAMMAR_PROMPTS.includes(selectedPrompt);

  // Add grammar guardrails for grammar prompts
  systemPromptText = addGrammarGuardrails(systemPromptText, isGrammarPrompt);

  // Add user's recent grammar context for grammar prompts
  if (isGrammarPrompt) {
    try {
      const grammarContext = await getRecentGrammarContext();
      if (grammarContext) {
        systemPromptText = systemPromptText + grammarContext;
      }
    } catch (error) {
      console.error('Failed to add grammar context:', error);
      // Continue without context if it fails
    }
  }

  const result = streamText({
    model: model.languageModel(selectedModel),
    system: systemPromptText,
    messages: convertToModelMessages(messages),
    experimental_telemetry: {
      isEnabled: true,
    },
  });

  return result.toUIMessageStreamResponse({
    sendReasoning: true,
    onError: (error) => {
      if (error instanceof Error) {
        if (error.message.includes("Rate limit")) {
          return "Rate limit exceeded. Please try again later.";
        }
      }
      console.error(error);
      return "An error occurred.";
    },
  });
}
