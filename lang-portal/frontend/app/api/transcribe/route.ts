import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

// Constants
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB (Groq API limit)
const ALLOWED_MIME_TYPES = [
  'audio/webm',
  'audio/wav',
  'audio/mp3',
  'audio/mpeg',
  'audio/ogg',
  'audio/flac',
];

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json(
        { error: 'No audio file provided', code: 'NO_FILE' },
        { status: 400 }
      );
    }

    if (!(file instanceof File || file instanceof Blob)) {
      return NextResponse.json(
        { error: 'Invalid file format', code: 'INVALID_FILE' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`,
          code: 'FILE_TOO_LARGE',
        },
        { status: 413 }
      );
    }

    // Validate MIME type
    if (file instanceof File && !ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Unsupported audio format', code: 'INVALID_FORMAT' },
        { status: 400 }
      );
    }

    // Prepare request to Groq API
    const groqFormData = new FormData();

    if (file instanceof File) {
      groqFormData.append('file', file);
    } else {
      const fileFromBlob = new File([file], 'recording.webm', { type: 'audio/webm' });
      groqFormData.append('file', fileFromBlob);
    }

    // Configure Groq Whisper parameters
    groqFormData.append('model', 'whisper-large-v3');
    groqFormData.append('response_format', 'verbose_json');
    groqFormData.append('language', 'ja'); // Japanese
    groqFormData.append('temperature', '0.0'); // Deterministic output

    // Check API key configuration
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      Sentry.captureMessage('GROQ_API_KEY not configured', 'error');
      return NextResponse.json(
        { error: 'Transcription service not configured', code: 'CONFIG_ERROR' },
        { status: 500 }
      );
    }

    // Call Groq API
    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: groqFormData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown API error' }));

      Sentry.captureException(new Error('Groq API error'), {
        tags: { service: 'groq', userId },
        extra: { status: response.status, errorData },
      });

      return NextResponse.json(
        {
          error: `Transcription failed: ${errorData.error?.message || 'API error'}`,
          code: 'API_ERROR',
        },
        { status: response.status }
      );
    }

    const transcription = await response.json();

    return NextResponse.json({
      text: transcription.text,
      language: transcription.language,
      duration: transcription.duration,
    });
  } catch (error) {
    console.error('Transcription error:', error);

    Sentry.captureException(error, {
      tags: { location: 'transcribe-api' },
    });

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to transcribe audio',
        code: 'UNKNOWN_ERROR',
      },
      { status: 500 }
    );
  }
}
