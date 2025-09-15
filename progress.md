# Project Progress — Romani Translation App

Last updated: 2025-09-09

This document tracks implementation progress against `dev-spec-romani-trans-app.md`. It gives a quick, practical overview of what is built, how to run it, and what remains. Use it alongside the spec to plan next work.

## Overview

- Stack: Next.js (App Router), TypeScript, Tailwind, Prisma, PostgreSQL (pgvector + pg_trgm), Vercel AI SDK (Gemini), minimal local UI primitives.
- Core features live: Translation UI with expert-in-the-loop, hybrid retrieval over translation memory, review and scoring workflow (batch + per-item) with inline corrections, dataset export, ingestion pipeline for adding new corpora.
- Dev-friendly: Optional Clerk auth (off by default), auth fallback for local, deterministic embedding fallback, seeding endpoint for pending items.

## Implemented vs Spec

- Data model (Prisma + Postgres)
  - Models: `TranslationMemory`, `Correction`, `ReviewItem` (reserved), `KnowledgeItem`, `RomaniLexicon`, `RomaniGrammar`, `RomaniStyle`, `IngestionJob`, `IngestionRecord`.
  - Vector columns stored via `pgvector` and written using raw SQL (`Unsupported("vector(1536)")` + `$executeRawUnsafe`).
  - Trigram extension (`pg_trgm`) used for lexical similarity.
  - Unified embedding strategy: Single `embedding` column instead of separate `source_embedding` and `target_embedding` columns.

- Retrieval
  - Hybrid search: semantic (cosine over embedding) + lexical (trigram) + boosts (quality, recency) in `lib/retrieval.ts`.
  - Prefers corrected entries: lexical similarity uses `COALESCE(corrected_text, target_text)`. Adds a corrected boost so corrected items surface more often.
  - Updated to use single embedding column for semantic similarity.

- AI translation
  - `lib/ai.ts` builds prompts and supports examples from similar corrected translations (expert-in-the-loop guidance).
  - Uses Gemini via Vercel AI SDK; graceful local fallback if no key.
  - `lib/embedding.ts` generates embeddings with provider + deterministic fallback.

- APIs
  - Translation: `POST /api/translate` (retrieves similar items first, passes examples to AI, returns guidance + confidence + similar list)
  - Save correction/approval: `POST /api/correct` (persists text, sets quality/status, updates embeddings, logs `Correction`)
  - Review actions:
    - `POST /api/review` (single approve/reject/needs-revision, optional score)
    - `POST /api/review/batch` (batch approve/reject/needs-revision, optional score)
    - `POST /api/review/correct` (inline edit + approve, optional score; updates target embedding and logs `Correction`)
    - NEW scoring-only API: `POST /api/review/score` (persist per-item or batch scores without changing reviewStatus)
  - Export: `GET /api/export?format=jsonl|csv&minQuality=A|B|C|D` (defaults jsonl, C)
  - Dev seeding: `POST /api/dev/seed-pending` (adds PENDING items for testing)
  - Ingestion pipeline:
    - `POST /api/ingest/prepare` (parse and prepare text for ingestion)
    - `POST /api/ingest/commit` (commit prepared text with embeddings)
    - `GET /api/ingest/status/:jobId` (get ingestion job status)
    - `GET /api/ingest/history` (get ingestion job history)

- UI (App Router)
  - Layout: `app/layout.tsx` with simple nav (Translate, Review, Export, Ingestion) and Toast provider.
  - Translate: `components/translation/TranslationInterface.tsx`
    - Input (source text, context, optional domain), AI translation, similar examples, correction column with save.
  - Review: `app/review/page.tsx` + `components/review/ReviewList.tsx`
    - Per-row scoring buttons (A/B/C/D) with captions; toggleable; selecting a score also selects the row.
    - Batch toolbar: select all/none, optional batch score, primary Save (persist scores), secondary Reject/Needs revision.
    - Inline edit hidden by default; revealed via "Edit translation"; Save (persists edit + score), Reject.
    - Compact layout (more rows visible); source/target wrap; condensed metadata.
    - After saving a score, items disappear (filter by `reviewedAt = null` + reload).
  - Export: `app/export/page.tsx` + `components/export/ExportInterface.tsx`
    - Shows counts + quality breakdown; download JSONL or CSV.
  - Ingestion: `app/ingest/page.tsx`
    - Upload area for files or text input
    - Preview of parsed content with inline editing
    - Job tracking and history

- Auth
  - Local dev: `lib/auth.ts` fallback user. If Clerk keys exist, pages/API enforce auth; otherwise, open for dev.

- Dev & infra
  - `docker-compose.yml` for Postgres with `pgvector` + `pg_trgm` enabled.
  - Prisma migrations and seed script present.
  - Deterministic embedding fallback for offline/local dev.
  - Dev seeder endpoint for PENDING items.
  - Vector index creation utilities for handling high-dimensional embeddings.

## How to run (dev)

```bash
# 1) Start DB (if using Docker Compose)
docker compose up -d

# 2) Generate Prisma client and migrate
yarn prisma generate || npm run db:generate
npm run db:migrate

# 3) Start dev server
npm run dev
```

Optional utilities:

```bash
# Open Prisma Studio to inspect tables
npx prisma studio

# Seed pending review items (dev)
curl -sS -X POST http://localhost:3000/api/dev/seed-pending

# Create vector indexes manually (for high-dimensional embeddings)
npm run db:indexes
```

## Current behavior (E2E)

- Translate flow
  - Retrieves similar translations; builds examples preferring corrected text.
  - AI returns translation + confidence; user can approve or correct. Saving persists embeddings and optional correction.

- Review/Scoring flow
  - Primary: scoring (A/B/C/D). Click score on rows, they auto-select; use batch Save to persist scores.
  - Secondary: inline edit. Open per-row edit, change text, Save (persists edit + score) or Reject.
  - Batch actions: Reject or Needs revision for selected; Save for scores only.
  - After Save, scored items disappear from the queue.

- Export
  - Download JSONL/CSV of approved items, filtered by minimum quality.

- Ingestion flow
  - Upload text or files through the Ingestion UI
  - System parses content into appropriate formats (grammar chunks, vocabulary pairs, parallel sentences)
  - Preview parsed content with inline editing capability
  - Commit approved content with embeddings generation
  - Track ingestion progress and view history

## Data model quick reference

- `TranslationMemory`
  - source_text, target_text, corrected_text?
  - quality_score: A/B/C/D
  - review_status: PENDING/APPROVED/REJECTED/NEEDS_REVISION
  - reviewed_at?, reviewed_by?, review_notes?
  - embedding? (pgvector via raw SQL)
- `Correction`: original_text, corrected_text, type, severity, explanation, translation_id
- `KnowledgeItem`: optional RAG content, embedding
- `RomaniLexicon`: vocabulary pairs, embedding, tags
- `RomaniGrammar`: grammar content, embedding, tags
- `RomaniStyle`: style content, embedding, tags
- `ReviewItem`: reserved for advanced queueing/assignments (not yet used)
- `IngestionJob`: tracks ingestion jobs
- `IngestionRecord`: tracks individual items in ingestion jobs

## Quality gates

- Type-check: PASS (`tsc --noEmit`)
- Lint: Configured; mild suggestions; no blocking errors
- Smoke: Dev server starts, review/translate/export routes load, APIs respond

## Known considerations

- Prisma + pgvector: Prisma client doesn't support `vector` directly; we update embeddings via raw SQL.
- Retrieval parameters: Tuned conservatively; can be adjusted in `lib/config.ts`.
- Clerk integration: Local uses fallback; production paths ready once keys provided.
- Vector indexes: Successfully created HNSW indexes for all vector columns with 1536-dimensional embeddings, enabling high-quality vector search.

## Next prioritized work (aligned to spec)

1) Ingestion pipeline enhancements
   - Support for additional file formats (PDF, DOCX)
   - Improved parsing heuristics for different content types
   - Preview enhancements and better editing capabilities
2) Review UX improvements
   - Keyboard shortcuts (A/B/C/D to score, S to save); optimistic updates (no full reload after save).
   - Pagination + filters (domain, date, score, status) for large queues.
3) Retrieval/learning
   - Store and leverage corrected-target embeddings distinctly; experiment with per-domain boosts.
   - Add usage feedback loop (increment usage on hits) to reinforce strong examples.
4) Export & dataset
   - Add export filters in UI (date range, domain, score bounds, include corrected-only).
   - Streaming export for large datasets; background job if needed.
5) Auth & multi-user
   - Wire Clerk fully in production; add reviewer identity on edits and scoring.
   - Team assignments (`ReviewItem`), priorities, SLA metrics (nice-to-have).
6) Tests & CI
   - Unit tests for retrieval scoring and API payloads; basic E2E for review & export.
   - Integration tests for ingestion pipeline

## Changelog (highlights)

- Hybrid retrieval implemented with corrected boost; vector + trigram queries fixed.
- Translation API updated to include examples from corrected entries.
- Corrections saved with embeddings via raw SQL.
- Review: per-item scoring buttons + captions; batch Save; compact UI; inline edit only on demand; items disappear after saving.
- Export: JSONL/CSV endpoints + UI; quality breakdown stats.
- Dev seeder endpoint for PENDING items.
- Ingestion pipeline: UI, API endpoints, and backend processing for adding new corpora
- Unified embedding strategy: Single `embedding` column instead of separate `source_embedding` and `target_embedding` columns
- Vector index creation utilities for handling high-dimensional embeddings

### 2025-09-06 — Successful migration to 1536-dimensional embeddings with HNSW indexes

- Successfully migrated from 3072 to 1536 embedding dimensions
- Fixed embedding storage format issues and ensured all embeddings are correctly stored with 1536 dimensions
- Updated verification script to use proper cosine similarity for accurate comparison
- Successfully created HNSW indexes for all vector columns, enabling high-quality vector search
- All vector indexes are now working correctly with the new 1536-dimensional embeddings

### 2025-09-05 — Ingestion pipeline and unified embedding strategy

- Implemented full ingestion pipeline with UI and API endpoints
- Added support for multiple content types: grammar chunks, vocabulary pairs, parallel sentences
- Implemented unified embedding strategy with single `embedding` column
- Added vector index creation utilities for handling high-dimensional embeddings
- Created dedicated documentation for vector index creation (VECTOR_INDEX_CREATION.md)
- Attempted to run vector index creation script (failed due to dimension limits as expected)

### 2025-08-27 — Gemini resilience and translate-key wiring

- Implemented robust handling in `lib/ai.ts` for sporadic Gemini schema edge-cases where the Google response can omit `content.parts` when `finishReason` is `MAX_TOKENS`.
 - Prompt constraints added to discourage hidden/internal reasoning and to keep outputs concise.
  - Immediate remedial retries: if a response looks like the schema-edge-case, the client now attempts an immediate fallback to a secondary model (configurable) and reduced output tokens before applying exponential backoff.
  - Primary and fallback model names are configurable via env: `GEMINI_PRIMARY_MODEL`, `GEMINI_FALLBACK_MODEL`.

- Added support for a dedicated translate API key so embedding and translation calls can use separate credentials:
  - Env vars supported: `GOOGLE_GENERATIVE_AI_API_KEY_TRANSLATE` (preferred) or `GEMINI_TRANSLATE_API_KEY`.
  - If provided, the translate calls will use that key; otherwise the default `GOOGLE_GENERATIVE_AI_API_KEY` is used.

- Tests performed:
  - Local smoke test: POST `/api/translate` returned 200 and valid JSON (example translation for "Hej" -> "Sastipe!").
  - Dev server boot verified after edits; TypeScript checks passed for the modified file.

- Notes & next steps:
 - Rotate the API key if it was shared in public chat and store keys in `.env.local` or your secret manager.
  - Consider adding a lightweight health endpoint that reports which key is active (dev-only), and a metrics/counter for the number of fallback occurrences to monitor stability.
  - Optionally add a second provider fallback (OpenAI-compatible) behind a feature flag for higher availability.

---
Use this file to orient before coding. Update it when you add features or change flows so it stays a reliable companion to `dev-spec-romani-trans-app.md`.
