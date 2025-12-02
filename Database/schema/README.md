# Database Schema

This directory contains the core PostgreSQL database schema and import functions for the Sorami platform.

## Files

- `pg.sql` - Main database schema with all tables, constraints, and relationships
- `import_functions.sql` - Database functions for importing JLPT data and content

## Schema Overview

The schema includes:

- **User Management**: Users, roles, subscriptions, settings
- **Content**: Kanji, words, grammar points, sentences
- **JLPT System**: Questions, tests, progress tracking
- **Learning Features**: Spaced repetition, study sessions, analytics
 
## Deployment

Run these files in order:
1. `pg.sql` - Creates all tables and basic structure
2. `import_functions.sql` - Adds import utility functions

The import client in `../import-client/` uses these functions to populate the database.
