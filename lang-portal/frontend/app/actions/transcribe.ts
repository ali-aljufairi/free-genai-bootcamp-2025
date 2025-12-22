'use server';

import { revalidatePath } from 'next/cache';

// Type definitions
interface TranscriptionResult {
  text: string;
  language?: string;
  duration?: number;
}

interface TranscriptionError {
  error: string;
  code?: string;
}

type TranscriptionResponse = TranscriptionResult | TranscriptionError;

/**
 * Server action to transcribe audio
 * Proxies request to internal API route which handles Groq API calls
 * This keeps API keys secure and allows for proper logging/rate limiting
 */
export async function transcribeAudio(formData: FormData): Promise<TranscriptionResponse> {
  try {
    // Call internal API route (handles auth and Groq API)
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/transcribe`, {
      method: 'POST',
      body: formData,
      // Cookies are automatically included for auth
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        error: data.error || 'Transcription failed',
        code: data.code || 'API_ERROR',
      };
    }

    // Revalidate cache after successful transcription
    revalidatePath('/');

    return {
      text: data.text,
      language: data.language,
      duration: data.duration,
    };
  } catch (error) {
    console.error('Transcription error:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to transcribe audio',
      code: 'UNKNOWN_ERROR',
    };
  }
}