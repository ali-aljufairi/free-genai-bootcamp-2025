# Sorami Agent Playbook (Concise)

## Purpose
A short, practical guide for agents to work safely on Sorami. Follow this first; use the reference docs for deeper detail.

## Quick Start (Local)
1. Ensure `.env` (backend) and `frontend/.env.local` are configured.
2. Database setup (from `lang-portal/`):
   - `make db-reset`
   - `make db-migrate-up`
   - `SEED_BUNDLE_PATH=/absolute/path/to/data/cleaned_json/db make db-seed`
   - `make db-validate`
3. Dev servers:
   - `make dev` **requires tmux**.
   - If not in tmux, run `make dev-backend` and `make dev-frontend` in separate terminals.

## Non‑Negotiables
- **Auth**: Never bypass Clerk JWT verification. Use Bearer tokens only.
- **DB**: Review schema in `Database/` before any DB changes. Never add tables without approval.
- **UI**: One glass-card per screen. Organize inside the single card only.
- **Quality**: Production‑grade changes only; no quick fixes or temporary workarounds.

## When Given a Task (Workflow)
1. Clarify the goal, constraints, and success criteria.
2. Inspect existing patterns and reuse them; avoid new abstractions unless requested.
3. Do **not** run `make` targets unless explicitly asked for that task.
4. Before completing any task, **run lint and format** for the areas you changed:
   - **Go**: `gofmt -w <changed files>`
   - **Frontend**: `cd frontend && bun run lint`
   - If a formatter is not configured for a language, do not add one without approval.
5. If you can’t run lint/format, say so and why.

## Reference Docs (Deeper Detail)
- Design system: `SORAMI_DESIGN_LANGUAGE.md`
- Auth flow: `docs/auth/authentication-flow.md`
- Clerk setup: `docs/auth/clerk-setup.md`
- Mobile guidance: `docs/guides/mobile-study-session-guide.md`
- Component refactors: `docs/guides/component-refactoring-guide.md`
