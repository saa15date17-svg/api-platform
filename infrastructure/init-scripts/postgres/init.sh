#!/bin/bash
# =============================================================================
# PostgreSQL Initialization Script
# Runs automatically when the postgres container starts for the first time.
# =============================================================================
set -euo pipefail

echo "[postgres-init] Running database initialization..."

# Create extensions if needed
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Extensions
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";
    
    -- Initial schema version tracking table
    CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
EOSQL

echo "[postgres-init] Database initialization complete."
