# Sorami Agent Playbook (Concise)

## Purpose
A short, practical guide for agents to work safely on Sorami. Follow this first; use the reference docs for deeper detail.

## Non‑Negotiables
- **Auth**: Never bypass Clerk JWT verification. Use Bearer tokens only.
- **DB**: Review schema in `Database/` before any DB changes. Never add tables without approval.
- **UI**: One glass-card per screen. Organize inside the single card only.
- **Quality**: Production‑grade changes only; no quick fixes or temporary workarounds.

## When Given a Task (Workflow)
1. Clarify the goal, constraints, and success criteria.
2. Inspect existing patterns and reuse them; avoid new abstractions unless requested.

## Reference Docs (Deeper Detail)
- Design system: `SORAMI_DESIGN_LANGUAGE.md`
- Auth flow: `docs/auth/authentication-flow.md`
- Clerk setup: `docs/auth/clerk-setup.md`
- Mobile guidance: `docs/guides/mobile-study-session-guide.md`
- Component refactors: `docs/guides/component-refactoring-guide.md`
