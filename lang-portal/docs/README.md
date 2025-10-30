# Documentation Index

This directory contains comprehensive documentation for the Sorami language learning platform.

## Directory Structure

### [auth/](./auth/)
Authentication and authorization documentation.
- [Authentication Flow](./auth/authentication-flow.md) - Complete Bearer token-based auth architecture
- [Clerk Setup Guide](./auth/clerk-setup.md) - Clerk configuration and setup

### [api/](./api/)
API endpoint documentation.
- [Dashboard API](./api/dashboard.md)
- [Groups API](./api/groups.md)
- [Study API](./api/study.md)
- [Words API](./api/words.md)

### [architecture/](./architecture/)
System architecture and design decisions.
- [Core Specifications](./architecture/core-specs.md) - Core system architecture

### [development/](./development/)
Development guides and workflows.
- [Issues and Tasks](./development/issues-and-tasks.md) - Known issues and task tracking

### [guides/](./guides/)
Feature-specific guides and best practices.
- [Component Refactoring Guide](./guides/component-refactoring-guide.md) - How to refactor large components
- [Mobile Study Session Guide](./guides/mobile-study-session-guide.md) - Mobile-first implementation
- [New React Features Guide](./guides/new-react-features-guide.md) - React 19 features usage

## Quick Links

### Getting Started
- [Main README](../README.md) - Project overview and quick start
- [Agent Playbook](../Agent.md) - Development guidelines and principles

### Key Concepts
- **Authentication**: See [auth/authentication-flow.md](./auth/authentication-flow.md) for Bearer token flow
- **API Endpoints**: All endpoints under `/api/langportal/*` (not `/api/v2/*`)
- **Database**: PostgreSQL only (no SQLite/Neo4j)
- **Frontend**: Next.js 15 with React 19, mobile-first design

### Development Workflow
1. Start development: `make dev` (backend + frontend)
2. Database setup: `make db-reset && make db-seed`
3. Test authentication: See [auth/authentication-flow.md](./auth/authentication-flow.md)
4. API calls: Use `/api/langportal/*` endpoints with Bearer tokens

## Contributing

When adding new documentation:
- Place in appropriate category directory
- Follow existing markdown structure
- Include code examples where relevant
- Link to related documentation
- Update this index if adding new categories

