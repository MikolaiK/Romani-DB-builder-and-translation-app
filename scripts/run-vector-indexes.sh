#!/bin/bash

# Script to run manual vector index creation
# This script executes the SQL file that attempts to create vector indexes
# for high-dimensional embeddings (3072D) that were skipped by automated scripts

set -e  # Exit on any error

echo "🔧 Running manual vector index creation script..."
echo "This script will attempt to create HNSW and ivfflat indexes for 3072-dimensional embeddings."
echo "Some commands may fail if your Postgres/pgvector setup doesn't support high-dimensional indexes."
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL environment variable is not set"
    echo "Please set it before running this script:"
    echo "  export DATABASE_URL='postgresql://user:password@host:port/database'"
    echo ""
    echo "Or run with:"
    echo "  DATABASE_URL='postgresql://user:password@host:port/database' ./scripts/run-vector-indexes.sh"
    exit 1
fi

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "❌ Error: psql is not installed or not in PATH"
    echo "Please install PostgreSQL client tools:"
    echo "  Ubuntu/Debian: sudo apt install postgresql-client"
    echo "  macOS: brew install libpq (then add to PATH)"
    echo "  Windows: Install PostgreSQL or use WSL"
    exit 1
fi

# Check if the SQL file exists
if [ ! -f "prisma/sql/create_vector_indexes_manual.sql" ]; then
    echo "❌ Error: SQL file not found at prisma/sql/create_vector_indexes_manual.sql"
    echo "Please make sure you're running this script from the project root directory."
    exit 1
fi

echo "✅ Prerequisites check passed"
echo ""
echo "🚀 Executing vector index creation script..."
echo ""

# Run the SQL file
psql "$DATABASE_URL" -f prisma/sql/create_vector_indexes_manual.sql

echo ""
echo "✅ Script execution completed"
echo "Check the output above to see which indexes were created successfully."
echo ""
echo "💡 Tips:"
echo "  - If you see errors about dimension limits, your Postgres/pgvector setup"
echo "    doesn't support high-dimensional indexes"
echo "  - Consider upgrading your Postgres/pgvector installation if possible"
echo "  - You can also try running individual commands from the SQL file to"
echo "    identify which specific indexes work in your environment"
