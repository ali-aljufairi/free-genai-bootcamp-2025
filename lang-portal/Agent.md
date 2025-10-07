# Sorami Agent Playbook: Mobile Web Experience

## Purpose
- Provide a single source of truth for agents contributing to Sorami when optimizing the mobile experience.
- Preserve production-grade standards across the Go backend, Next.js frontend, and AI microservices while focusing on mobile users.
- Capture expectations derived from the React (19 RC, Sept 2024) and Next.js 15 documentation, filtered through Sorami's architecture and design language.

## Core Principles to Honor
- Always coordinate with the maintainer before proposing or merging changes; document decisions in PR descriptions.
- Maintain the single glass-card layout per screen; use internal sections (headings, dividers, iconography) to organize information.
- Never bypass Clerk authentication or existing JWT verification helpers; reuse shared utilities.
- Respect the mixed SQLite→PostgreSQL migration status; validate data access patterns against the schema in `Database/` before altering storage.
- Favor incremental, well-tested improvements over speculative rewrites; retain compatibility with existing microservice contracts.

## Mobile-First Implementation Guidance
### Layout & Visual Structure
- Start designs at the 360–400 px width breakpoint; scale upward with fluid units (`clamp`, `min`, `max`) and Tailwind responsive variants.
- Leverage CSS container queries (supported in Chromium/Safari 2024) for cards that adapt internal grids without duplicating components.
- Keep the glass-card padding comfortable (24 px mobile, `clamp(24px, 4vw, 40px)` desktop) and enforce a clear vertical rhythm using typography tokens defined in `/frontend/styles`.

### Navigation & Interaction
- Consolidate primary navigation into either a bottom bar or a collapsible drawer triggered by the single card header; avoid multi-level menus on mobile.
- Use Radix primitives (e.g., `Sheet`, `Dialog`) for overlays and ensure they respect safe-area insets via `env(safe-area-inset-*)`.
- Prefer gesture-friendly hit targets (min 44 px) and avoid hover-only affordances; pair icons with compact labels.

### Content & Typography
- Enforce a typographic scale that keeps headlines ≤32 px on mobile while preserving hierarchy (use `clamp` with Tailwind CSS variables).
- Truncate long Japanese strings with semantic tooltips (`<ruby>`/`<rt>`) rather than forcing horizontal scroll; keep romaji/English equivalents collapsible.
- Defer non-critical content below the fold with progressive disclosure components.

### Performance & Asset Delivery
- Utilize Next.js 15 partial prerendering and suspense boundaries to stream above-the-fold content first.
- Wrap image assets with `next/image` and configure device-specific breakpoints (`tailwind.config.ts` → `screens`) to minimize payload.
- Statically analyze imports to keep React Server Components lean; move client-only logic behind `"use client"` boundaries.
- Adopt React 19 transitions (`startTransition`, forthcoming `useTransition` ergonomics) for navigation and form feedback to keep UI responsive.
- Monitor Core Web Vitals using the existing Sentry+Next.js web-vitals integration; set mobile-specific thresholds in alerts.

### Accessibility Baseline
- Honor WCAG 2.2 AA touch target and focus-visible guidelines; test with VoiceOver/ TalkBack in responsive preview.
- Provide language toggles with `aria-live="polite"` updates to announce context changes without disrupting screen readers.
- Keep contrast ratios compliant within the glass-card by adjusting backdrop blur opacity tokens instead of ad-hoc colors.

### Testing & Monitoring
- Add mobile viewport snapshots in Playwright (or the existing E2E suite) for critical journeys before shipping.
- Verify layout across iOS Safari, Android Chrome, and small tablets via `npm run lint`, `npm run test`, and `next lint` in CI prior to deployment.
- Capture post-release metrics (bounce rate, session length) through the analytics hooks exposed in `frontend/services`.

## Settings & Form Persistence Expectations
- Every settings surface must auto-save; eliminate "Save"/"Verify" buttons unless legally required.
- Validate inputs with Zod schemas colocated in `frontend/lib/validation` (or relevant module) and share types through `zod.infer` to maintain parity.
- Use `react-hook-form` with `@hookform/resolvers/zod` or Next.js Server Actions + Zod parsing to trigger validation on change/blur, not submit.
- Implement optimistic UI updates using React 19's `useOptimistic` or the existing Zustand store patterns to provide instant visual confirmation.
- Apply debounced server actions (250–500 ms) and handle persistence errors with toast notifications that do not block navigation.
- Store draft state locally only when network reliability is a concern; sync to the backend as soon as the Clerk session is available.

### Implementation Checklist for Settings Pages
- [ ] Reference the canonical Zod schema and extend cautiously for new fields.
- [ ] Provide inline validation messaging tied to `aria-describedby` for each control.
- [ ] Trigger persistence via Server Actions or tRPC endpoints secured by Clerk JWT middleware.
- [ ] Write unit tests for schema edge cases and Playwright tests covering the auto-save pathway.
- [ ] Log failures to Sentry with enough context (user id, page, field) for triage.

## System Interaction Guidelines

### Clerk Authentication System
Sorami uses Clerk for authentication with the following configuration:
- **Version**: @clerk/nextjs 6.14.1 with @clerk/themes 2.4.19
- **Environment Variables**:
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Public key for client-side authentication
  - `CLERK_SECRET_KEY`: Secret key for server-side operations
- **Middleware Protection**: Routes are protected via `middleware.ts` with public routes explicitly defined
- **Redirect URLs**:
  - After sign-in: `/study`
  - After sign-up: `/study`
  - Sign-in page: `/sign-in`
  - Sign-up page: `/sign-up`
- **Public Routes**: `/`, `/sign-in(.*)`, `/sign-up(.*)`, `/api/v2/words/random`, `/api/v2/kanji/stats`, `/health`

**Agent Guidelines for Authentication**:
- Never bypass Clerk authentication or JWT verification
- Always check middleware configuration before adding new routes
- Use Clerk's `auth()` helper for server-side authentication checks
- Respect the glass-card themed Clerk appearance configuration in `lib/clerk-appearance.ts`
- Test authentication flows with Playwright E2E tests before deployment

### Playwright E2E Testing Framework
Sorami uses Playwright for end-to-end testing with mobile-first focus and Clerk authentication integration:
- **Configuration**: `playwright.config.ts` with mobile viewports (Pixel 5, iPhone 12)
- **Test Directory**: `tests/` with `.spec.ts` files
- **Clerk Integration**: Uses `@clerk/testing` package for authentication testing
- **Global Setup**: `tests/global.setup.ts` initializes Clerk testing tokens
- **Environment Variables**: `.env.test` file with `CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`
- **Available Commands**:
  - `npm run test`: Run all tests in headless mode
  - `npm run test:ui`: Run tests with Playwright UI mode
  - `npm run test:headed`: Run tests in headed mode (visible browser)
- **Base URL**: `http://localhost:3000` (auto-starts dev server)
- **Mobile Testing**: Includes Pixel 5 and iPhone 12 viewport configurations

**Agent Guidelines for Testing**:
- Always use `setupClerkTestingToken({ page })` at the start of each test for Clerk authentication
- Write tests for critical user journeys (authentication, study sessions, dashboard)
- Include mobile viewport snapshots for all critical journeys
- Test authentication flows end-to-end with Clerk integration
- Use `page.setViewportSize()` for custom mobile testing
- Run tests before deployment: `npm run test`
- Debug with UI mode: `npm run test:ui` for interactive test development
- Example test structure: `tests/auth.spec.ts` demonstrates authentication flow testing
- **Important**: Never commit `.env.test` with real API keys - use secrets in CI/CD
- See `tests/README.md` for comprehensive testing documentation

## Immediate Follow-Up Actions
- Audit current app screens against this playbook; log gaps (layout, performance, auto-save) in the backlog with severity and effort.
- Prioritize high-traffic mobile journeys (dashboard, study sessions, onboarding) for optimization sprints.
- Align the design team on any token or component updates required to support the single-card mobile layout before implementation.
