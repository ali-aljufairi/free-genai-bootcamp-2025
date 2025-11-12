# Data Import/Export System Features

## Overview
Comprehensive data import/export system for managing content migration, data backup, external integrations, and bulk operations.

## Core Tables
- `import_jobs` - Import job tracking
- `export_jobs` - Export job tracking
- `data_migrations` - Migration history
- `external_integrations` - Third-party integrations
- `backup_schedules` - Automated backup configuration

## Key Features

### 1. Import Functions
```sql
-- Import kanji data with SVG strokes
SELECT import_kanji_complete($1::jsonb, $2::jsonb);

-- Import words data
SELECT import_words_data($1::jsonb);

-- Import grammar data
SELECT import_grammar_data($1::jsonb);

-- Import JLPT questions
SELECT import_jlpt_questions($1::jsonb);

-- Import user data (for migrations)
SELECT import_user_data($1::jsonb);
```

### 2. Import Job Management
```sql
-- Create import job
INSERT INTO import_jobs (job_type, source_file, status, created_by)
VALUES ($1, $2, 'pending', $3) RETURNING id;

-- Update import job status
UPDATE import_jobs 
SET status = $1, 
    processed_records = $2, 
    total_records = $3,
    completed_at = CASE WHEN $1 = 'completed' THEN NOW() ELSE NULL END
WHERE id = $4;

-- Get import job history
SELECT id, job_type, source_file, status, 
       processed_records, total_records,
       created_at, completed_at,
       CASE 
           WHEN total_records > 0 THEN 
               ROUND(processed_records::numeric / total_records * 100, 2)
           ELSE 0 
       END as progress_percentage
FROM import_jobs 
ORDER BY created_at DESC;
```

### 3. Data Validation Functions
```sql
-- Validate kanji data before import
CREATE OR REPLACE FUNCTION validate_kanji_import(json_data JSONB)
RETURNS TABLE(record_id INT, validation_status TEXT, errors TEXT[]) AS $$
DECLARE
    record_data JSONB;
    errors TEXT[];
BEGIN
    FOR record_data IN SELECT jsonb_array_elements(json_data)
    LOOP
        errors := ARRAY[]::TEXT[];
        
        -- Check required fields
        IF safe_jsonb_extract_text(record_data, 'character') IS NULL THEN
            errors := array_append(errors, 'Missing character');
        END IF;
        
        IF safe_jsonb_extract_int(record_data, 'jlpt') IS NULL THEN
            errors := array_append(errors, 'Missing JLPT level');
        END IF;
        
        -- Validate JLPT level
        IF safe_jsonb_extract_int(record_data, 'jlpt') NOT BETWEEN 1 AND 5 THEN
            errors := array_append(errors, 'Invalid JLPT level (must be 1-5)');
        END IF;
        
        -- Validate stroke count
        IF safe_jsonb_extract_int(record_data, 'stroke_count') <= 0 THEN
            errors := array_append(errors, 'Invalid stroke count');
        END IF;
        
        RETURN QUERY SELECT 
            safe_jsonb_extract_int(record_data, 'id'),
            CASE WHEN array_length(errors, 1) IS NULL THEN 'valid' ELSE 'invalid' END,
            errors;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
```

### 4. Export Functions
```sql
-- Export kanji data
CREATE OR REPLACE FUNCTION export_kanji_data(p_jlpt_level INT DEFAULT NULL)
RETURNS JSONB AS $$
BEGIN
    RETURN (
        SELECT jsonb_agg(
            jsonb_build_object(
                'id', k.id,
                'character', k.character,
                'meanings', k.meanings,
                'onyomi', k.onyomi,
                'kunyomi', k.kunyomi,
                'jlpt', k.jlpt,
                'stroke_count', k.stroke_count,
                'frequency', k.frequency,
                'components', k.components,
                'strokes_svg', k.strokes_svg
            )
        )
        FROM kanji k
        WHERE p_jlpt_level IS NULL OR k.jlpt = p_jlpt_level
    );
END;
$$ LANGUAGE plpgsql;

-- Export words data
CREATE OR REPLACE FUNCTION export_words_data(p_jlpt_level INT DEFAULT NULL)
RETURNS JSONB AS $$
BEGIN
    RETURN (
        SELECT jsonb_agg(
            jsonb_build_object(
                'id', w.id,
                'kanji', w.kanji,
                'kana', w.kana,
                'english', w.english,
                'jlpt', w.jlpt,
                'part_of_speech', w.part_of_speech,
                'frequency', w.frequency
            )
        )
        FROM words w
        WHERE p_jlpt_level IS NULL OR w.jlpt = p_jlpt_level
    );
END;
$$ LANGUAGE plpgsql;

-- Export user progress data
CREATE OR REPLACE FUNCTION export_user_progress(p_user_id BIGINT)
RETURNS JSONB AS $$
BEGIN
    RETURN (
        SELECT jsonb_build_object(
            'user_id', p_user_id,
            'export_date', NOW(),
            'progress_data', (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'item_type', p.item_type,
                        'item_id', p.item_id,
                        'seen_count', p.seen_cnt,
                        'correct_count', p.correct_cnt,
                        'last_seen', p.last_seen,
                        'next_due', p.next_due
                    )
                )
                FROM progress p
                WHERE p.user_id = p_user_id
            ),
            'study_sessions', (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'session_id', ss.id,
                        'activity_id', ss.activity_id,
                        'duration_minutes', ss.duration_minutes,
                        'created_at', ss.created_at
                    )
                )
                FROM study_sessions ss
                WHERE ss.user_id = p_user_id
            )
        )
    );
END;
$$ LANGUAGE plpgsql;
```

### 5. Backup and Restore
```sql
-- Create database backup
CREATE OR REPLACE FUNCTION create_backup(p_backup_name TEXT)
RETURNS TEXT AS $$
DECLARE
    backup_path TEXT;
    backup_command TEXT;
BEGIN
    backup_path := '/backups/' || p_backup_name || '_' || 
                   TO_CHAR(NOW(), 'YYYYMMDD_HH24MISS') || '.sql';
    
    backup_command := 'pg_dump -h localhost -U postgres -d japanese_learning > ' || backup_path;
    
    -- Execute backup command (requires appropriate permissions)
    PERFORM dblink_exec('host=localhost user=postgres dbname=japanese_learning', backup_command);
    
    -- Log backup creation
    INSERT INTO backup_schedules (backup_name, backup_path, status, created_at)
    VALUES (p_backup_name, backup_path, 'completed', NOW());
    
    RETURN backup_path;
END;
$$ LANGUAGE plpgsql;

-- Restore from backup
CREATE OR REPLACE FUNCTION restore_backup(p_backup_path TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    restore_command TEXT;
BEGIN
    restore_command := 'psql -h localhost -U postgres -d japanese_learning < ' || p_backup_path;
    
    -- Execute restore command
    PERFORM dblink_exec('host=localhost user=postgres dbname=japanese_learning', restore_command);
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql;
```

## API Endpoints (Example)

### Import Management
```javascript
// POST /api/import/kanji - Import kanji data
// POST /api/import/words - Import words data
// POST /api/import/grammar - Import grammar data
// GET /api/import/jobs - Get import job status
// GET /api/import/validate - Validate import data
```

### Export Management
```javascript
// GET /api/export/kanji - Export kanji data
// GET /api/export/words - Export words data
// GET /api/export/progress/:userId - Export user progress
// POST /api/export/schedule - Schedule export job
// GET /api/export/jobs - Get export job status
```

### Backup Management
```javascript
// POST /api/backup/create - Create backup
// POST /api/backup/restore - Restore from backup
// GET /api/backup/list - List available backups
// DELETE /api/backup/:id - Delete backup
```

## Advanced Import/Export Features

### 1. Incremental Import
```sql
-- Import only new or updated records
CREATE OR REPLACE FUNCTION import_kanji_incremental(json_data JSONB)
RETURNS TABLE(inserted_count INT, updated_count INT) AS $$
DECLARE
    record_data JSONB;
    inserted_count INT := 0;
    updated_count INT := 0;
    existing_id INT;
BEGIN
    FOR record_data IN SELECT jsonb_array_elements(json_data)
    LOOP
        existing_id := safe_jsonb_extract_int(record_data, 'id');
        
        IF existing_id IS NULL THEN
            -- Insert new record
            INSERT INTO kanji (
                "character", heisig_en, meanings, unicode, onyomi, kunyomi,
                detail, jlpt, frequency, components, stroke_count, strokes_svg
            ) VALUES (
                safe_jsonb_extract_text(record_data, 'character'),
                safe_jsonb_extract_text(record_data, 'heisig_en'),
                safe_jsonb_extract_text_array(record_data, 'meanings'),
                safe_jsonb_extract_text(record_data, 'unicode'),
                safe_jsonb_extract_text(record_data, 'onyomi'),
                safe_jsonb_extract_text(record_data, 'kunyomi'),
                safe_jsonb_extract_text(record_data, 'detail'),
                safe_jsonb_extract_int(record_data, 'jlpt'),
                safe_jsonb_extract_int(record_data, 'frequency'),
                safe_jsonb_extract_text(record_data, 'components'),
                safe_jsonb_extract_int(record_data, 'stroke_count'),
                safe_jsonb_extract_svg(record_data, 'strokes_svg')
            );
            inserted_count := inserted_count + 1;
        ELSE
            -- Update existing record
            UPDATE kanji SET
                "character" = safe_jsonb_extract_text(record_data, 'character'),
                heisig_en = safe_jsonb_extract_text(record_data, 'heisig_en'),
                meanings = safe_jsonb_extract_text_array(record_data, 'meanings'),
                unicode = safe_jsonb_extract_text(record_data, 'unicode'),
                onyomi = safe_jsonb_extract_text(record_data, 'onyomi'),
                kunyomi = safe_jsonb_extract_text(record_data, 'kunyomi'),
                detail = safe_jsonb_extract_text(record_data, 'detail'),
                jlpt = safe_jsonb_extract_int(record_data, 'jlpt'),
                frequency = safe_jsonb_extract_int(record_data, 'frequency'),
                components = safe_jsonb_extract_text(record_data, 'components'),
                stroke_count = safe_jsonb_extract_int(record_data, 'stroke_count'),
                strokes_svg = safe_jsonb_extract_svg(record_data, 'strokes_svg')
            WHERE id = existing_id;
            updated_count := updated_count + 1;
        END IF;
    END LOOP;
    
    RETURN QUERY SELECT inserted_count, updated_count;
END;
$$ LANGUAGE plpgsql;
```

### 2. Data Migration Tools
```sql
-- Migrate data between schema versions
CREATE OR REPLACE FUNCTION migrate_schema_v1_to_v2()
RETURNS VOID AS $$
BEGIN
    -- Add new columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'kanji' AND column_name = 'strokes_svg') THEN
        ALTER TABLE kanji ADD COLUMN strokes_svg TEXT;
    END IF;
    
    -- Migrate existing data
    UPDATE kanji SET strokes_svg = NULL WHERE strokes_svg IS NULL;
    
    -- Log migration
    INSERT INTO data_migrations (migration_name, from_version, to_version, status, executed_at)
    VALUES ('add_strokes_svg', '1.0', '2.0', 'completed', NOW());
END;
$$ LANGUAGE plpgsql;
```

### 3. External Integration
```sql
-- Import from external API
CREATE OR REPLACE FUNCTION import_from_external_api(p_api_url TEXT, p_api_key TEXT)
RETURNS INT AS $$
DECLARE
    response_data JSONB;
    imported_count INT := 0;
BEGIN
    -- Make API request (requires http extension)
    SELECT content::jsonb INTO response_data
    FROM http((
        'GET',
        p_api_url,
        ARRAY[http_header('Authorization', 'Bearer ' || p_api_key)],
        NULL,
        NULL
    ));
    
    -- Process response data
    IF response_data IS NOT NULL THEN
        SELECT import_kanji_data(response_data) INTO imported_count;
    END IF;
    
    RETURN imported_count;
END;
$$ LANGUAGE plpgsql;
```

### 4. Data Quality Checks
```sql
-- Comprehensive data quality validation
CREATE OR REPLACE FUNCTION validate_data_quality()
RETURNS TABLE(table_name TEXT, issue_type TEXT, issue_count INT, details TEXT) AS $$
BEGIN
    -- Check for duplicate kanji characters
    RETURN QUERY
    SELECT 
        'kanji'::TEXT,
        'duplicate_characters'::TEXT,
        COUNT(*)::INT,
        'Duplicate kanji characters found'::TEXT
    FROM (
        SELECT "character", COUNT(*) as cnt
        FROM kanji
        GROUP BY "character"
        HAVING COUNT(*) > 1
    ) duplicates;
    
    -- Check for missing required fields
    RETURN QUERY
    SELECT 
        'kanji'::TEXT,
        'missing_required_fields'::TEXT,
        COUNT(*)::INT,
        'Kanji missing required fields'::TEXT
    FROM kanji
    WHERE "character" IS NULL OR jlpt IS NULL;
    
    -- Check for invalid JLPT levels
    RETURN QUERY
    SELECT 
        'kanji'::TEXT,
        'invalid_jlpt_levels'::TEXT,
        COUNT(*)::INT,
        'Invalid JLPT levels found'::TEXT
    FROM kanji
    WHERE jlpt NOT BETWEEN 1 AND 5;
END;
$$ LANGUAGE plpgsql;
```

## Import/Export Formats

### 1. Supported Formats
- **JSON**: Primary format for data exchange
- **CSV**: Tabular data export
- **XML**: Legacy system compatibility
- **SQL**: Database dumps and migrations

### 2. Data Compression
- Gzip compression for large exports
- Streaming import/export for memory efficiency
- Chunked processing for large datasets

### 3. Validation and Error Handling
- Pre-import validation
- Error logging and reporting
- Rollback capabilities
- Partial import support

## Performance Optimization

### 1. Bulk Operations
```sql
-- Optimize bulk inserts
SET session_replication_role = replica;
-- Perform bulk operations
SET session_replication_role = DEFAULT;
```

### 2. Index Management
```sql
-- Disable indexes during import
DROP INDEX CONCURRENTLY IF EXISTS idx_kanji_character;
-- Import data
CREATE INDEX CONCURRENTLY idx_kanji_character ON kanji("character");
```

### 3. Parallel Processing
- Multi-threaded import processing
- Parallel export generation
- Concurrent job execution
- Load balancing for large operations 