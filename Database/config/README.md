# Database Configuration

This directory contains PostgreSQL configuration files and Docker setup for the Sorami database.

## Files

- `postgresql.conf` - PostgreSQL server configuration
- `pg_hba.conf` - PostgreSQL client authentication configuration
- `Dockerfile.postgres` - Docker image for PostgreSQL with custom configuration

## Usage

These files are used by the `docker-compose.yml` in the parent directory to set up the PostgreSQL database with proper configuration for the Sorami application.