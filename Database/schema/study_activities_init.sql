-- Study Activities Initialization
-- This ensures all required study activity types exist in the database
-- Safe to run multiple times (uses ON CONFLICT DO NOTHING)

-- Insert all standard study activity types
INSERT INTO
    study_activities (
        name,
        activity_type,
        description,
        is_active
    )
VALUES (
        'SRS Flashcards',
        'flashcard',
        'Practice vocabulary with spaced repetition',
        true
    ),
    (
        'SRS Quiz',
        'grammar_quiz',
        'Test your knowledge with multiple choice questions',
        true
    ),
    (
        'SRS Speech Practice',
        'writing',
        'Practice pronunciation and listening',
        true
    ),
    (
        'SRS AI Agent',
        'speech_image',
        'Interactive learning with AI assistant',
        true
    ),
    (
        'SRS Chat Practice',
        'shadow',
        'Practice conversation skills',
        true
    ),
    (
        'SRS Drawing',
        'stroke',
        'Practice writing kanji characters',
        true
    ) ON CONFLICT (activity_type) DO
UPDATE
SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active;

-- Verify all activities were created
DO $$
DECLARE
    activity_count INT;
BEGIN
    SELECT COUNT(*) INTO activity_count FROM study_activities;
    RAISE NOTICE 'Study activities initialized: % records', activity_count;
END $$;