This project includes a schema change to unify source/target embeddings into a single `embedding` vector column and to add `tags` to `romani_lexicon`.

To apply the migration locally (recommended steps):

1) Make sure your DATABASE_URL points to the development DB and you have a backup.
2) Run the included SQL migration (or use Prisma):
   - Option A (Prisma):
     - run `npm run db:migrate` (this will run prisma migrate dev and create a migration)
     - run `npm run db:generate` to regenerate Prisma client
   - Option B (SQL):
     - run the SQL file `prisma/migrations/20250831094500_unify_embeddings_and_tags/migration.sql` against your DB using psql.
3) Regenerate Prisma client: `npm run db:generate`.
4) Rebuild the Next app: `npm run build`.
5) Optionally run the backfill script to populate romani_lexicon.embedding from translation_memory.embedding:
   - `tsx scripts/backfill-tm-to-lexicon.ts`

Vector Index Creation:
- With the migration to 1536-dimensional embeddings, HNSW indexes can now be created successfully in most Postgres/pgvector installations.
- A manual index creation script is provided at `prisma/sql/create_vector_indexes_manual.sql`
- This script contains direct CREATE INDEX commands for HNSW indexes which work with 1536 dimensions
- Run with: `psql "$DATABASE_URL" -f prisma/sql/create_vector_indexes_manual.sql`
- All HNSW indexes have been successfully created as of September 6, 2025

Notes:
- This migration drops the legacy `source_embedding` and `target_embedding` columns if they exist. Ensure you have backups if you need to keep the old vectors.
- If you prefer to backfill embeddings instead of dropping the old columns immediately, skip the DROP statements and run the backfill first.
- HNSW index creation has been successfully tested and is working with 1536-dimensional embeddings
