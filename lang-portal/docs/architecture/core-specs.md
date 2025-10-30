# Core Specifications

## Business Goal

A language learning school wants to build a production-grade learning portal which acts as:
- Inventory of possible vocabulary that can be learned (kanji, words)
- Learning record store (LRS), providing correct and wrong scores on practice vocabulary
- A unified launchpad to launch different learning apps
- User management with groups and favorites

## Technical Requirements

- **Backend**: Built using Go with Fiber framework
- **Database**: PostgreSQL (no SQLite/Neo4j)
- **Frontend**: Next.js 15 with React 19, TypeScript
- **API Format**: Always returns JSON
- **Authentication**: Clerk JWT with Bearer token-based flow (prevents 431 errors)
- **API Routes**: All endpoints under `/api/langportal/*` (not `/api/v1/*` or `/api/v2/*`)
- **Multi-user**: Full user authentication and authorization with Clerk