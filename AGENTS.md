# Sorami - Japanese Language Learning Platform

- Follow production-grade code practices and patterns
- Maintain code quality, security, and performance standards
- Respect existing architectural decisions and patterns

### Core Components

- **lang-portal**: Central Go+Next.js web application with PostgreSQL 
- **agent**: AI shopping/search assistant using LangGraph and Groq LLM
- **writing-practice**: Handwriting OCR with AI feedback
- **Database**: Compre  hensive PostgreSQL schema for Japanese learning 



### Authentication & Security

- **Clerk JWT**: Universal authentication across ALL services - never bypass this
- **Production Security**: All services verify Bearer tokens with cached JWKS from Clerk
- **Go services**: Use `golang-jwt/jwt/v5` with middleware for JWT verification
- **Python services**: Shared `auth.py` pattern with `verify_bearer()` function


### Before Making Changes

1. **Understand the existing architecture** - examine table structures, relationships, and patterns
2. **Ask for context** - information when working with database issues or obtain it yoursel
3. **Identify root causes** - don't jump to quick fixes without understanding the problem
4. **Respect existing design** - the database and code patterns are carefully designed

### When Debugging API Issues

2. **Examine authentication flow** - Clerk JWT → user mapping → database operations

### Working with UI Components

1. **Always examine existing component patterns** before proposing changes
2. **Use single glass-card containers** - never create multiple cards for one screen
3. **Organize content with internal sections** using borders, headers, and proper spacing
4. **Follow established design patterns** - don't create custom designs without consultation
5. **Fix existing components** rather than creating new unified solutions

### Working with Database

- Database are found in lang-portal/internal/database/migrations 
- You never edit migration you just add new one 
