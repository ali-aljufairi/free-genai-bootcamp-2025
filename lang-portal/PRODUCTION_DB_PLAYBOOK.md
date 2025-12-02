# Production Database Deployment Playbook

This playbook provides step-by-step procedures for safely deploying database changes to production, ensuring data integrity and minimizing downtime.

## Critical Rules

1. **ALWAYS backup before any production change**
2. **ALWAYS test in staging/dev first**
3. **NEVER skip validation steps**
4. **NEVER run destructive operations without explicit confirmation**
5. **ALWAYS have a rollback plan**

## Pre-Deployment Preparation

### 1. Create Full Backup

```bash
# Set production database URL
export PROD_DB_URL="postgresql://user:pass@host:5432/sorami"

# Create timestamped backup
BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).dump"
pg_dump -Fc "$PROD_DB_URL" > "$BACKUP_FILE"

# Verify backup integrity
pg_restore --list "$BACKUP_FILE" | head -20

# Store backup in safe location (S3, backup server, etc.)
# DO NOT store on production server only
```

### 2. Test in Staging Environment

```bash
# 1. Restore staging DB from production backup
pg_restore -d sorami_staging "$BACKUP_FILE"

# 2. Run migrations
export DATABASE_URL="$STAGING_DB_URL"
make migrate-up

# 3. Run validation
make db-validate

# 4. Test application functionality
# Run integration tests, smoke tests, etc.

# 5. If issues found, fix and repeat
```

### 3. Verify Migration Files

```bash
# Check all 10 migrations exist
ls -la internal/database/migrations/ | grep -E '^0000[1-9]|^00010'

# Verify no syntax errors
for f in internal/database/migrations/*.sql; do
  echo "Checking $f..."
  psql "$STAGING_DB_URL" -f "$f" --dry-run 2>&1 | grep -i error || echo "✓ OK"
done
```

## Production Deployment Steps

### Step 1: Maintenance Window (if needed)

- Notify users of scheduled maintenance
- Set application to maintenance mode
- Stop application servers (or route traffic away)

### Step 2: Final Backup

```bash
# Create one final backup right before migration
FINAL_BACKUP="backup_pre_migration_$(date +%Y%m%d_%H%M%S).dump"
pg_dump -Fc "$PROD_DB_URL" > "$FINAL_BACKUP"

# Verify backup
pg_restore --list "$FINAL_BACKUP" | wc -l  # Should show many objects
```

### Step 3: Check Current Migration Status

```bash
export DATABASE_URL="$PROD_DB_URL"
make migrate-status

# Note current version number
# This helps with rollback if needed
```

### Step 4: Run Migrations

```bash
# Run migrations with verbose output
export DATABASE_URL="$PROD_DB_URL"
go run cmd/migrate/main.go up -v

# OR use make command
make migrate-up
```

### Step 5: Validate Schema

```bash
# Run validation script
make db-validate

# Manual verification
psql "$PROD_DB_URL" << EOF
-- Check critical tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'kanji', 'words', 'jlpt_questions')
ORDER BY table_name;

-- Check critical functions exist
SELECT proname FROM pg_proc 
WHERE proname IN ('import_kanji_data', 'hiragana_to_romaji', 'update_srs_progress')
ORDER BY proname;

-- Check row counts (should match expectations)
SELECT 
  'kanji' as table, COUNT(*) as rows FROM kanji
UNION ALL
SELECT 'words', COUNT(*) FROM words
UNION ALL
SELECT 'jlpt_questions', COUNT(*) FROM jlpt_questions;
EOF
```

### Step 6: Seed Data (if needed)

**IMPORTANT**: Only seed if this is a fresh database or if you're adding new reference data.

```bash
# Option 1: Seed from original JSON files
export DATABASE_URL="$PROD_DB_URL"
make seed

# Option 2: Seed from NDJSON exports (faster)
make seed-ndjson

# Option 3: Selective seeding
go run cmd/seed/main.go -only=kanji,words

# Verify seed data
make db-validate
```

### Step 7: Application Verification

- Start application servers
- Run smoke tests
- Check critical user flows
- Monitor error logs
- Verify API endpoints respond correctly

### Step 8: Post-Deployment Monitoring

Monitor for at least 30 minutes:

- Application error rates
- Database query performance
- User-reported issues
- System resource usage

## Rollback Procedure

### If Migration Fails

```bash
# 1. DO NOT PANIC - you have backups

# 2. Check what failed
make migrate-status

# 3. Rollback last migration
make migrate-down

# 4. Verify database state
make db-validate

# 5. If rollback doesn't work, restore from backup
pg_restore -d sorami --clean --if-exists "$FINAL_BACKUP"
```

### If Application Issues Detected

```bash
# 1. Check if it's a migration issue
make migrate-status
make db-validate

# 2. If migration is the problem, rollback
make migrate-down

# 3. If data corruption suspected, restore from backup
pg_restore -d sorami --clean --if-exists "$FINAL_BACKUP"

# 4. Restart application
```

## Seeding Production Data

### When to Seed

- **Fresh production database**: Seed all data
- **Adding new reference data**: Selective seeding (e.g., new JLPT questions)
- **Data recovery**: Restore from NDJSON exports

### Seeding Best Practices

1. **NEVER truncate production tables** without explicit `--force` flag
2. **Use transactions** when possible (seed command should handle this)
3. **Seed in batches** for large datasets
4. **Verify row counts** after seeding
5. **Keep original JSON files** as backup

### Seeding Commands

```bash
# Full seed (all data types)
export DATABASE_URL="$PROD_DB_URL"
make seed

# Selective seeding
go run cmd/seed/main.go -only=kanji,words

# Fast seeding from NDJSON (recommended for large datasets)
make seed-ndjson

# Seed specific data type
make seed-kanji
make seed-words
make seed-jlpt
```

## Emergency Procedures

### Database Connection Lost

1. Check network connectivity
2. Verify database server is running
3. Check connection string/credentials
4. Review database logs
5. If persistent, restore from backup on new server

### Data Corruption Detected

1. **IMMEDIATELY** stop application
2. Create current state backup (for forensics)
3. Restore from last known good backup
4. Investigate root cause
5. Fix issue before resuming operations

### Migration Stuck/Failed Mid-Way

1. Check migration status: `make migrate-status`
2. Review database logs for errors
3. If safe, rollback: `make migrate-down`
4. Fix migration file
5. Re-test in staging
6. Re-attempt in production

## Post-Deployment Checklist

- [ ] All migrations applied successfully
- [ ] Validation script passes
- [ ] Application starts without errors
- [ ] Critical user flows work
- [ ] No increase in error rates
- [ ] Database performance acceptable
- [ ] Backup of post-migration state created
- [ ] Team notified of successful deployment
- [ ] Documentation updated if schema changed

## Maintenance Windows

Recommended maintenance window schedule:

- **Schema migrations**: 2-4 hour window
- **Data seeding**: 1-2 hour window (can run during low traffic)
- **Index creation**: 30 min - 1 hour (can run concurrently)
- **Function updates**: 15-30 min window

## Communication Template

```
Subject: Database Maintenance - [Date/Time]

We will be performing database maintenance on [date] from [time] to [time].

Expected impact:
- Application will be in maintenance mode
- Users will see maintenance message
- Estimated downtime: [X] minutes

What we're doing:
- Running database migrations
- [Optional: Seeding new data]

Rollback plan:
- If issues occur, we will rollback changes
- Estimated rollback time: [X] minutes

We will notify you when maintenance is complete.
```

## Recovery Time Objectives (RTO)

- **Migration rollback**: < 5 minutes
- **Full database restore**: < 30 minutes
- **Selective data restore**: < 15 minutes

## Backup Retention Policy

- **Daily backups**: Keep for 7 days
- **Weekly backups**: Keep for 4 weeks
- **Monthly backups**: Keep for 12 months
- **Pre-migration backups**: Keep indefinitely until next migration

## Lessons Learned

Based on previous issues:

1. **Always verify migration files** match restored schema exactly
2. **Never skip the 10th migration** - it contains critical tables
3. **Always include all functions** - missing functions break imports
4. **Test with real data volumes** - small test datasets hide issues
5. **Keep NDJSON exports** - faster recovery than original JSON
6. **Validate after every step** - catch issues early

## Support Contacts

- **Database Admin**: [contact]
- **On-Call Engineer**: [contact]
- **Backup Storage**: [location/credentials]

---

**Remember**: When in doubt, restore from backup. Data integrity is more important than deployment speed.

