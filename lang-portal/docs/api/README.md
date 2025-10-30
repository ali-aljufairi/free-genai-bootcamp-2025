# API Endpoints Documentation

## Base URL

All API endpoints are under `/api/langportal/*` (not `/api/v1/*` or `/api/v2/*`).

## Authentication

All endpoints require authentication via Bearer token:
```
Authorization: Bearer <clerk-jwt-token>
```

## Available Endpoints

- **[Words API](./words.md)** - `/api/langportal/words`
- **[Kanji API](./kanji.md)** - `/api/langportal/kanji`  
- **[Groups API](./groups.md)** - `/api/langportal/groups`
- **[Dashboard API](./dashboard.md)** - `/api/langportal/dashboard`
- **[Study Sessions API](./study.md)** - `/api/langportal/study_sessions`
- **[Flashcards API](./flashcards.md)** - `/api/langportal/flashcards`

## Note

⚠️ **Legacy endpoints (`/api/v1/*` and `/api/v2/*`) are deprecated and removed.** All new endpoints use `/api/langportal/*`.

