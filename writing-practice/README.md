# Writing Practice Service

Japanese handwriting practice service with OCR and AI feedback.

## Prerequisites

- Python 3.10+
- Go backend running on port 8080 (see lang-portal README for setup)
- Environment variables configured (see below)

## Environment Variables

Create a `.env` file in the `writing-practice/` directory:

```bash
# Clerk JWT Configuration
CLERK_JWKS_URL=https://clerk.your-domain.com/.well-known/jwks.json
# OR
CLERK_ISSUER=https://clerk.your-domain.com

# Go Backend URL (required)
GO_BACKEND_URL=http://localhost:8080

# Groq API Key (for AI feedback)
GROQ_API_KEY=your_groq_api_key

# Google Cloud Vision API (for OCR)
GOOGLE_API_KEY=your_google_api_key
```

## Starting the Service

1. **Ensure Go backend is running:**
   ```bash
   cd lang-portal
   make dev  # Starts Go backend on port 8080
   ```

2. **Start the writing practice service:**
   ```bash
   cd writing-practice
   uv run fastapi dev api.py --port 8001
   ```

## API Endpoints

- `GET /api/writing/kanji/random` - Get a random kanji with SVG stroke data
- `POST /api/writing/kanji/feedback` - Submit kanji drawing for feedback
- `GET /api/writing/random-sentence` - Get a random sentence for practice
- `POST /api/writing/feedback-sentence` - Submit sentence writing for feedback
- `GET /api/writing/random-word-sentence` - Get a random word and generate sentence
- `POST /api/writing/feedback-word` - Submit word writing for feedback

## Troubleshooting

### "Connection refused" errors

If you see errors like:
```
Failed to call Go backend API: Connection refused
```

This means the Go backend is not running. Start it with:
```bash
cd lang-portal
make dev
```

The Go backend must be running on `http://localhost:8080` (or the URL specified in `GO_BACKEND_URL`).
