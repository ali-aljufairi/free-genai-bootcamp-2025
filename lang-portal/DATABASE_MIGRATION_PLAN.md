# Database Migration Plan: Moving to Goose

## Overview

This plan outlines how to reorganize the database structure, move it into `lang-portal`, and implement Goose for proper migration management. It also covers moving the `import-client` to become a seed command.

## Current State

```
free-genai-bootcamp-2025/
├── Database/                          # ❌ Separate folder at root
│   ├── schema/
│   │   ├── pg.sql                     # Main schema (1500+ lines)
│   │   ├── import_functions.sql
│   │   ├── import_functions/          # 11 files
│   │   ├── migration_*.sql            # 3 migration files
│   │   └── study_activities_init.sql
│   ├── functions/                     # 3 files
│   ├── indexes/                       # 2 files
│   ├── import-client/                 # Go CLI to seed data
│   │   ├── main.go
│   │   ├── importer.go
│   │   ├── jlpt.go
│   │   ├── graph.go
│   │   └── ...
│   └── cleaned_json/                  # Data files (kanji, words, JLPT questions)
│       ├── kanji_svg_strokes.json
│       ├── jlpt_organized/
│       └── ...
└── lang-portal/
    └── internal/
        └── database/
            ├── database.go            # Connection logic
            └── models/                # Go models
```

## Target State

```
lang-portal/
├── internal/
│   └── database/
│       ├── database.go                # Connection logic + Goose integration
│       ├── models/                    # Go models
│       └── migrations/                # ✅ Goose migrations (schema only)
│           ├── 00001_extensions.sql
│           ├── 00002_enums.sql
│           ├── 00003_users_rbac.sql
│           ├── 00004_content_tables.sql
│           ├── 00005_jlpt_system.sql
│           ├── 00006_learning_progress.sql
│           ├── 00007_import_functions.sql
│           ├── 00008_core_functions.sql
│           ├── 00009_indexes.sql
│           └── 00010_study_activities.sql
├── cmd/
│   ├── api/                           # Main API server (existing)
│   │   └── main.go
│   ├── migrate/                       # ✅ Migration CLI tool (new)
│   │   └── main.go
│   └── seed/                          # ✅ Data seeding CLI (from import-client)
│       ├── main.go                    # Entry point
│       ├── config.go
│       ├── importer.go                # Kanji, words, grammar import
│       ├── jlpt.go                    # JLPT questions import
│       ├── graph.go                   # Graph relationships
│       └── types.go
└── data/                              # ✅ JSON data files (moved)
    └── cleaned_json/
        ├── kanji_svg_strokes.json
        ├── jlpt_organized/
        └── ...
```

## Implementation Steps

### Phase 1: Setup Goose in lang-portal

#### Step 1.1: Add Goose dependency

```bash
cd lang-portal
go get github.com/pressly/goose/v3
```

#### Step 1.2: Create migrations directory

```bash
mkdir -p internal/database/migrations
```

#### Step 1.3: Create migration CLI tool

Create `cmd/migrate/main.go`:

```go
package main

import (
    "database/sql"
    "flag"
    "log"
    "os"

    "github.com/pressly/goose/v3"
    _ "github.com/lib/pq"
)

var (
    flags   = flag.NewFlagSet("migrate", flag.ExitOnError)
    dir     = flags.String("dir", "internal/database/migrations", "directory with migration files")
    verbose = flags.Bool("v", false, "enable verbose mode")
)

func main() {
    flags.Parse(os.Args[1:])
    args := flags.Args()

    if len(args) < 1 {
        flags.Usage()
        return
    }

    command := args[0]

    dbString := os.Getenv("DATABASE_URL")
    if dbString == "" {
        log.Fatal("DATABASE_URL environment variable is required")
    }

    db, err := sql.Open("postgres", dbString)
    if err != nil {
        log.Fatalf("failed to open database: %v", err)
    }
    defer db.Close()

    if *verbose {
        goose.SetVerbose(true)
    }

    if err := goose.Run(command, db, *dir, args[1:]...); err != nil {
        log.Fatalf("migrate %v: %v", command, err)
    }
}
```

### Phase 2: Convert SQL Files to Goose Migrations

#### Migration File Format

Each migration file uses Goose annotations:

```sql
-- +goose Up
-- SQL to apply migration

-- +goose Down
-- SQL to rollback migration (optional but recommended)
```

#### Migration Breakdown (Schema Only - No Data)

| # | File | Content | Source |
|---|------|---------|--------|
| 00001 | extensions.sql | PostgreSQL extensions | pg.sql (extensions section) |
| 00002 | enums.sql | All ENUM types | pg.sql (enums section) |
| 00003 | users_rbac.sql | Users, roles, settings | pg.sql (users section) |
| 00004 | content_tables.sql | Kanji, words, grammar, sentences | pg.sql (content section) |
| 00005 | jlpt_system.sql | JLPT questions and tests | pg.sql (JLPT section) |
| 00006 | learning_progress.sql | Progress tracking, SRS | pg.sql (progress section) |
| 00007 | import_functions.sql | All import functions | import_functions/*.sql |
| 00008 | core_functions.sql | SRS, hiragana, tracking | functions/*.sql |
| 00009 | indexes.sql | All indexes | indexes/*.sql |
| 00010 | study_activities.sql | Study activities table setup | study_activities_init.sql |

### Phase 3: Move import-client to cmd/seed

The `import-client` becomes `cmd/seed` for data seeding (separate from schema migrations).

#### Step 3.1: Create cmd/seed directory

```bash
mkdir -p cmd/seed
```

#### Step 3.2: Move import-client files

```bash
# Copy files from import-client
cp Database/import-client/*.go cmd/seed/

# Update package name from main to main (should be same)
# Update import paths if needed
```

#### Step 3.3: Update seed command structure

The seed command will:
1. Import kanji data from JSON
2. Import kanji SVG strokes
3. Create JLPT kanji groups
4. Import words data
5. Create JLPT word groups
6. Import grammar data
7. Import example sentences
8. Generate multi-kanji compounds
9. Import JLPT questions

#### Step 3.4: Update data paths

Update `cmd/seed/config.go` to use new data paths:

```go
const (
    DataDir = "data/cleaned_json"
    KanjiSVGPath = DataDir + "/kanji_svg_strokes.json"
    JLPTDataDir = DataDir + "/jlpt_organized"
    // etc.
)
```

### Phase 4: Move Data Files

```bash
mkdir -p lang-portal/data
mv Database/cleaned_json lang-portal/data/
```

### Phase 5: Update Makefile

Add migration and seed commands to `lang-portal/Makefile`:

```makefile
# Database Migrations
.PHONY: migrate-up migrate-down migrate-status migrate-create

migrate-up:
	go run cmd/migrate/main.go up

migrate-down:
	go run cmd/migrate/main.go down

migrate-status:
	go run cmd/migrate/main.go status

migrate-create:
	@read -p "Migration name: " name; \
	goose -dir internal/database/migrations create $$name sql

# Database Seeding
.PHONY: seed seed-kanji seed-words seed-jlpt

seed:
	go run cmd/seed/main.go

seed-kanji:
	go run cmd/seed/main.go -only=kanji

seed-words:
	go run cmd/seed/main.go -only=words

seed-jlpt:
	go run cmd/seed/main.go -only=jlpt

# Full database setup (migrate + seed)
.PHONY: db-setup

db-setup: migrate-up seed
	@echo "Database setup complete!"
```

### Phase 6: Cleanup Old Structure

After verification:

```bash
# Archive old Database folder (or delete after confirmation)
mv Database Database.old

# Or just remove specific directories
rm -rf Database/schema
rm -rf Database/functions
rm -rf Database/indexes
rm -rf Database/import-client
# Keep Database/cleaned_json if not moved yet
```

## Command Reference

### Migration Commands

```bash
# Run all pending migrations
make migrate-up

# Rollback last migration
make migrate-down

# Check migration status
make migrate-status

# Create new migration
make migrate-create
# Enter: add_user_preferences

# Run specific version
go run cmd/migrate/main.go up-to 00005

# Rollback to specific version  
go run cmd/migrate/main.go down-to 00003
```

### Seed Commands

```bash
# Run full seed (all data)
make seed

# Seed only kanji data
make seed-kanji

# Seed only words data
make seed-words

# Seed only JLPT questions
make seed-jlpt

# Full setup (migrate + seed)
make db-setup
```

## Checklist

### Phase 1: Setup Goose
- [ ] Add Goose dependency to go.mod
- [ ] Create `internal/database/migrations/` directory
- [ ] Create `cmd/migrate/main.go`

### Phase 2: Convert SQL to Migrations
- [ ] Create `00001_extensions.sql`
- [ ] Create `00002_enums.sql`
- [ ] Create `00003_users_rbac.sql`
- [ ] Create `00004_content_tables.sql`
- [ ] Create `00005_jlpt_system.sql`
- [ ] Create `00006_learning_progress.sql`
- [ ] Create `00007_import_functions.sql`
- [ ] Create `00008_core_functions.sql`
- [ ] Create `00009_indexes.sql`
- [ ] Create `00010_study_activities.sql`
- [ ] Test migrations up/down locally

### Phase 3: Move import-client
- [ ] Create `cmd/seed/` directory
- [ ] Move import-client files to cmd/seed
- [ ] Update package imports
- [ ] Update data file paths
- [ ] Add command-line flags for selective seeding
- [ ] Test seed command

### Phase 4: Move Data Files
- [ ] Create `lang-portal/data/` directory
- [ ] Move `cleaned_json/` to `data/`
- [ ] Update all path references

### Phase 5: Update Makefile
- [ ] Add migrate-* commands
- [ ] Add seed-* commands
- [ ] Add db-setup command

### Phase 6: Cleanup
- [ ] Verify everything works
- [ ] Archive/remove old Database folder
- [ ] Update documentation

## Rollback Strategy

Each migration should have a `-- +goose Down` section:

```sql
-- +goose Up
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    clerk_id TEXT UNIQUE NOT NULL
);

-- +goose Down
DROP TABLE IF EXISTS users;
```

For complex migrations (functions, extensions):

```sql
-- +goose Up
-- +goose StatementBegin
CREATE FUNCTION my_function() RETURNS void AS $$
BEGIN
    -- function body
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd

-- +goose Down
DROP FUNCTION IF EXISTS my_function;
```

## Benefits After Migration

1. **Version Control** - Know exactly what schema version is deployed
2. **Easy Rollback** - `make migrate-down` if something breaks
3. **Separation of Concerns** - Schema migrations vs data seeding
4. **Reproducibility** - Same migrations run everywhere
5. **Team Collaboration** - Clear migration history
6. **Testing** - Can spin up test DB with exact schema
7. **Selective Seeding** - Can re-seed specific data without affecting schema

## Timeline Estimate

| Phase | Time |
|-------|------|
| Phase 1: Setup Goose | 30 min |
| Phase 2: Convert SQL files | 2-3 hours |
| Phase 3: Move import-client | 1-2 hours |
| Phase 4: Move data files | 15 min |
| Phase 5: Update Makefile | 15 min |
| Phase 6: Cleanup & testing | 30 min |
| **Total** | **~5-6 hours** |

---

Ready to start implementation? Let me know which phase to begin with!
