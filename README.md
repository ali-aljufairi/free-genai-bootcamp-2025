# Sorami

Sorami is a Japanese learning platform focused on turning study into a connected daily practice loop instead of a collection of isolated tools. The project combines structured language data, progress tracking, and AI-assisted study features in one system.

At the center of the platform is `lang-portal`, the main web app where learners study vocabulary, kanji, groups, and review progress. Around it are smaller services that add specialized experiences such as handwriting feedback, assisted planning, and vocabulary import.

## What Sorami Is Trying To Do

Sorami is designed around a simple idea: learners should be able to discover material, practice it, review it, and see progress without jumping between unrelated apps.

The platform is built to support:

- vocabulary and kanji study
- JLPT-oriented learning flows
- study sessions and progress tracking
- spaced repetition style review data
- AI-assisted writing and planning features

## Main Learning Experience

The core user journey lives in `lang-portal`.

Inside the portal, the product is structured around:

- searchable Japanese content such as words and kanji
- study activities and study sessions
- learner progress, streaks, and dashboard summaries
- grouped content for more guided practice
- APIs that allow supporting services to reuse the same user and progress model

This makes `lang-portal` both the main application and the source of truth for learning data.

## Services In This Repository

### `lang-portal/`

The main Sorami application. It contains:

- Go backend APIs
- Next.js frontend
- PostgreSQL-backed learning data
- dashboard, study, vocabulary, kanji, and group workflows

If you want to understand the product, start here.

### `writing-practice/`

A focused service for handwriting practice. It adds:

- OCR-based handwriting recognition
- AI feedback on written Japanese
- integration with the main backend for shared user and study context

### `agent/`

An AI service built around guided recommendations and external information gathering. In the current repository, it is positioned as a supporting assistant that can help with search, planning, and recommendation flows around learning.

### `vocab-importer/`

A support tool for bringing vocabulary into the platform from outside sources so learning content can be expanded and organized more efficiently.

### `k8s/`

Deployment manifests for running the platform in Kubernetes environments.

## How The Pieces Fit Together

Sorami uses a shared platform model instead of separate disconnected apps:

- `lang-portal` owns the main data model, user progress, and primary web experience
- supporting services provide narrow features without replacing the main app
- Clerk authentication is shared across services
- PostgreSQL stores the core learning and progress data

That means the extra services are meant to deepen the main learning experience, not compete with it.

## Technology Overview

- `lang-portal`: Go, Next.js, PostgreSQL
- `writing-practice`: FastAPI-based Python service
- `agent`: Python service using LangGraph-based workflows
- `vocab-importer`: Python service for import workflows
- shared authentication: Clerk JWT verification across services

## Quick Start For Development

If you want to run the project locally, the main path is:

```bash
just secrets-template
just init
just doctor
cd lang-portal
just docker-up
just db-setup
just dev-backend
just dev-frontend
```

Supporting services can be started separately:

```bash
cd writing-practice && uv run fastapi dev api.py --port 8001
cd agent && uv run fastapi dev api.py
cd vocab-importer && uv run fastapi dev api.py
```

## Important Project Rules

- Clerk JWT authentication is mandatory across services
- add new database migrations instead of changing old ones
- treat `lang-portal` as the authority for user, progress, and core learning data
- extend existing architecture instead of creating parallel systems

## Where To Read More

- [`lang-portal/README.md`](/Users/ali/.codex/worktrees/7d4c/free-genai-bootcamp-2025/lang-portal/README.md)
- [`lang-portal/docs/README.md`](/Users/ali/.codex/worktrees/7d4c/free-genai-bootcamp-2025/lang-portal/docs/README.md)
- [`writing-practice/README.md`](/Users/ali/.codex/worktrees/7d4c/free-genai-bootcamp-2025/writing-practice/README.md)
- [`agent/README.md`](/Users/ali/.codex/worktrees/7d4c/free-genai-bootcamp-2025/agent/README.md)
