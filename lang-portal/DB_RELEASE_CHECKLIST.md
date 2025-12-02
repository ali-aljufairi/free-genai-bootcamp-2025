# Database Release Checklist

This checklist ensures all critical database components are present before any release or production deployment.

## Pre-Release Validation

### Schema Components

- [ ] **Migrations (00001-00010)**
  - [ ] 00001_extensions.sql (pgcrypto, pg_trgm, ltree, vector)
  - [ ] 00002_enums.sql (all enum types)
  - [ ] 00003_users_rbac.sql (users, roles, settings, subscriptions)
  - [ ] 00004_content_tables.sql (kanji, words, grammar, sentences, groups)
  - [ ] 00005_jlpt_system.sql (all JLPT question tables and types)
  - [ ] 00006_learning_progress.sql (SRS, progress tracking, analytics)
  - [ ] 00007_import_functions.sql (all import functions)
  - [ ] 00008_core_functions.sql (SRS, hiragana, tracking functions)
  - [ ] 00009_indexes.sql (all performance indexes)
  - [ ] 00010_study_activities.sql (study activities, graph relations, courses, chat)

### Core Tables (44 total)

- [ ] Users & RBAC: users, roles, user_roles, user_settings, subscriptions
- [ ] Content: kanji, words, grammar_points, grammar_readings, grammar_examples, grammar_details, grammar_relations, sentences
- [ ] Groups: groups, word_groups, kanji_groups
- [ ] Graph: item_relations
- [ ] Courses: courses, units, unit_items
- [ ] Study Groups: study_groups, study_group_words, word_tags
- [ ] Study Flow: study_activities, study_sessions, review_items, progress
- [ ] Shadowing: shadow_attempts, kanji_traces
- [ ] Chat: chat_sessions, chat_messages
- [ ] JLPT: jlpt_questions, jlpt_grammar_questions, jlpt_listening_questions, jlpt_reading_questions, jlpt_word_questions, jlpt_question_texts
- [ ] Tracking: jlpt_question_attempts, jlpt_question_progress, kanji_learning_progress, vocabulary_learning_progress
- [ ] Analytics: user_learning_analytics, enhanced_study_sessions, user_jlpt_level_history
- [ ] Learning: learning_activities, progression_settings

### Critical Functions

- [ ] **Import Functions**: import_kanji_data, import_words_data, import_grammar_data, import_jlpt_questions, import_kanji_svg_strokes
- [ ] **Core Functions**: hiragana_to_romaji, update_srs_progress, get_due_items, get_learning_stats
- [ ] **Tracking Functions**: record_jlpt_question_attempt, record_kanji_progress, record_vocabulary_progress
- [ ] **Graph Functions**: build_kanji_chain, refresh_kanji_adjacency_map, wire_word_kanji_relations
- [ ] **Helper Functions**: safe_jsonb_extract_text, safe_jsonb_extract_int, safe_jsonb_extract_array

### Indexes

- [ ] User management indexes (users, roles, settings, subscriptions)
- [ ] Graph relationship indexes (item_relations)
- [ ] Content indexes (kanji, words, grammar, JLPT questions)
- [ ] Performance indexes (progress, learning analytics, study sessions)

### Seed Data Requirements

- [ ] **Kanji**: Minimum 10,000 records
- [ ] **Words**: Minimum 20,000 records
- [ ] **JLPT Questions**: Minimum 15,000 records
- [ ] **Grammar Points**: Minimum 500 records
- [ ] **Sentences**: Minimum 20,000 records

## Validation Commands

```bash
# Run full validation
make db-validate

# Or manually
go run cmd/validate/main.go

# Check migration status
make migrate-status

# Verify row counts
psql $DATABASE_URL -c "SELECT 'kanji' as table, COUNT(*) FROM kanji UNION ALL SELECT 'words', COUNT(*) FROM words UNION ALL SELECT 'jlpt_questions', COUNT(*) FROM jlpt_questions;"
```

## Post-Migration Verification

After running migrations, verify:

1. All 10 migrations applied successfully
2. All core tables exist
3. All critical functions are defined
4. Minimum row counts met (if seeding)
5. No foreign key constraint violations
6. Indexes created successfully

## Rollback Procedure

If validation fails:

1. **DO NOT** proceed with release
2. Check migration logs: `make migrate-status`
3. Rollback if needed: `make migrate-down`
4. Fix issues in migration files
5. Re-test in development environment
6. Re-run validation before attempting release again

## Production Deployment Checklist

Before deploying to production:

- [ ] Full backup taken: `pg_dump -Fc sorami > backup_$(date +%Y%m%d).dump`
- [ ] Migrations tested in staging/dev environment
- [ ] Validation script passes in staging
- [ ] Rollback plan documented and tested
- [ ] Database connection strings verified
- [ ] Seed data available (JSON files or NDJSON exports)
- [ ] Maintenance window scheduled (if needed)
- [ ] Team notified of deployment

## Emergency Rollback

If production migration fails:

```bash
# 1. Stop application immediately
# 2. Rollback last migration
make migrate-down

# 3. Restore from backup if needed
pg_restore -d sorami backup_YYYYMMDD.dump

# 4. Verify database state
make db-validate
```

## Notes

- **NEVER** run migrations on production without a recent backup
- **ALWAYS** test migrations in a dev/staging environment first
- **NEVER** skip validation steps
- **ALWAYS** verify row counts match expectations after seeding
- Keep this checklist updated as schema evolves

