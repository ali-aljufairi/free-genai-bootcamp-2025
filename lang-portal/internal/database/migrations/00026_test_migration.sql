-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS migration_test (
    id SERIAL PRIMARY KEY,
    test_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    test_value TEXT
);

-- Insert a test records
INSERT INTO migration_test (test_name, test_value) 
VALUES ('GitHub Actions Migration Test', 'Migration workflow is working correctly!');

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS migration_test;
-- +goose StatementEnd
