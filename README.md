# Romani Translation App

Advanced AI-powered Swedish to Romani translation platform with expert-in-the-loop workflow for high-quality dataset generation.

## Overview

This application provides a sophisticated translation system that combines AI-powered translation with human expert corrections to continuously improve translation quality. The system uses hybrid search (semantic + lexical) over a vector database to provide context-aware translations.

## Key Features

- **AI Translation**: Powered by Google Gemini with context-aware suggestions
- **Expert-in-the-loop**: Human corrections improve future translations
- **Hybrid Search**: Combines semantic (embeddings) and lexical search for better results
- **Ingestion Pipeline**: Upload and process various text formats (TXT, CSV, PDF, DOCX)
- **Review Workflow**: Score and review translations with batch operations
- **Dataset Export**: Export high-quality translation datasets in JSONL or CSV format
- **Advanced Embedding System**: 1536-dimensional embeddings with HNSW vector indexes for high-quality search

## Documentation

- [Development Specification](dev-spec-romani-trans-app.md) - Complete technical specification
- [Progress Report](progress.md) - Current implementation status and changelog
- [Resource Ingestion Plan](Resource-Ingestion-plan.md) - Ingestion pipeline specification
- [Vector Index Creation Guide](VECTOR_INDEX_CREATION.md) - Instructions for creating vector indexes
- [Migration Support](SUPPORT-MIGRATION.md) - Database migration instructions
- [Intelligent Feedback Loop](INTELLIGENT_FEEDBACK_LOOP.md) - Implementation of the intelligent feedback loop

## Quick Start

1. **Start the database**:
   ```bash
   docker compose up -d
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up the database**:
   ```bash
   npm run db:generate
   npm run db:migrate
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

5. **Open the application**:
   Visit `http://localhost:3000` in your browser

## Environment Variables

Copy `.env.example` to `.env` and configure your settings:
- `DATABASE_URL` - PostgreSQL connection string
- `GOOGLE_GENERATIVE_AI_API_KEY` - Google AI API key for embeddings and translation
- `GOOGLE_GENERATIVE_AI_API_KEY_TRANSLATE` - Optional separate key for translation

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:generate` - Generate Prisma client
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Prisma Studio
- `npm run db:indexes` - Create vector indexes manually
- `npm run test` - Run tests
- `npm run test:embedding` - Test embedding generation
- `npm run type-check` - Run TypeScript type checking

## Project Structure

```
romani-trans-app/
├── app/                 # Next.js App Router pages and API routes
├── components/          # React UI components
├── lib/                 # Business logic and utilities
├── prisma/              # Database schema and migrations
├── scripts/             # Utility scripts
└── types/               # TypeScript type definitions
```

## Contributing

Please refer to the [Development Specification](dev-spec-romani-trans-app.md) for detailed information about the architecture and implementation guidelines.

## License

This project is licensed under the MIT License.

### Seeding and moving a local database to Supabase

If you want to populate your Supabase project from your local development database, follow these steps carefully:

1. Ensure `DATABASE_URL` in `.env` points to your Supabase connection string. Prisma reads `./.env` by default.
2. If the remote Postgres only exposes IPv6 and your machine has no IPv6 route, you can use Cloudflare WARP to provide IPv6 outbound (we used it during setup).
3. Enable the `pgvector` extension on the Supabase DB before running `prisma db push` or seeding:

   CREATE EXTENSION IF NOT EXISTS vector;

4. Push the Prisma schema and generate client, then seed:

   npm run db:push
   npm run db:seed

5. To transfer a full local DB to Supabase, use the supplied script at `scripts/transfer-db.sh`. It uses `pg_dump` and `pg_restore` and will prompt before performing remote restore. Review the script and back up remote data before running.
