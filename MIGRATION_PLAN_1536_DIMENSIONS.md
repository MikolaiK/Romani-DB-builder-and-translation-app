# Migration Plan: Switching to 1536 Dimensions with HNSW Indexes

## Overview
This document outlines the comprehensive plan for migrating the Romani Translation App from 3072-dimensional embeddings to 1536-dimensional embeddings. This change is necessary to enable proper vector index creation with high-performance HNSW indexing, as the current 3072 dimensions exceed the 200-dimension limit for HNSW indexes in many Postgres/pgvector setups. The migration will focus on HNSW indexes which provide better search quality compared to ivfflat indexes.

## Goals
- Successfully migrate from 3072 to 1536 embedding dimensions
- Enable proper vector index creation for improved search performance
- Maintain all existing functionality without degradation
- Ensure backward compatibility where possible

## Detailed Implementation Plan

### 1. Configuration Update
Update the application configuration to reflect the new embedding dimensions:
- File: `lib/config.ts`
- Change `EMBEDDING.DIMENSION` from 3072 to 1536
- Change `DATABASE.VECTOR_DIMENSION` from 3072 to 1536
- Update any related constants that depend on these values

### 2. Database Schema Update
Modify the Prisma schema to reflect the new vector dimensions:
- File: `prisma/schema.prisma`
- Update all vector column definitions from `vector(3072)` to `vector(1536)`:
  - `translation_memory.embedding`
  - `romani_lexicon.embedding`
  - `romani_grammar.embedding`
  - `romani_style.embedding`
  - `knowledge_items.embedding`

### 3. Code Updates

#### 3.1 Embedding Generation
Update the embedding generation code to work with 1536 dimensions:
- File: `lib/embedding.ts`
- Update the fallback embedding generation to use 1536 dimensions
- Update dimension validation to check for 1536 instead of 3072
- Update the test function to verify 1536 dimensions
- Ensure error handling accounts for the new dimensions

#### 3.2 Retrieval System
Verify the retrieval system works with the new dimensions:
- File: `lib/retrieval.ts`
- Check that all vector operations are compatible with 1536 dimensions
- Update any hardcoded references to 3072 dimensions

#### 3.3 Ingestion Pipeline
Ensure the ingestion pipeline works with the new dimensions:
- File: `lib/ingestion.ts`
- Verify that all embedding generation and storage operations work with 1536 dimensions
- Check timeout and batch processing configurations

#### 3.4 API Endpoints
Update API endpoints to handle the new dimensions:
- File: `app/api/correct/route.ts`
- File: `app/api/review/correct/route.ts`
- Verify that embedding generation and storage work correctly with 1536 dimensions

### 4. Vector Index Creation Scripts
Update vector index creation scripts to work optimally with 1536 dimensions, focusing on HNSW indexes for better search quality:
- File: `prisma/sql/create_vector_indexes_manual.sql`
- File: `scripts/init-db.ts`
- File: `scripts/create-hnsw-indexes.ts` (renaming from create-ivfflat-indexes.ts to reflect HNSW focus)
- Verify that dimension checks and HNSW index creation commands work with 1536 dimensions
- Remove or de-emphasize ivfflat index creation in favor of HNSW

### 5. Database Migration
Create and execute the database migration:
- Generate a new Prisma migration to update the database schema
- Run the migration to update the existing database
- Verify that existing data is compatible with the new dimensions

### 6. Backward Compatibility
Handle existing data with 3072 dimensions:
- Create a data migration script to convert existing 3072-dimensional embeddings to 1536 dimensions
- This may involve:
  - Truncating existing embeddings to 1536 dimensions
  - Re-generating embeddings for all existing data
  - Providing a fallback for incompatible data

### 7. Testing
Comprehensive testing to ensure the migration was successful:
- Test that embeddings are generated correctly with 1536 dimensions
- Test that vector indexes can be created successfully
- Test that search functionality works correctly
- Test that the ingestion pipeline works correctly
- Test that correction APIs work correctly
- Test that all existing functionality remains intact

### 8. Performance Evaluation
Evaluate the performance impact of the change:
- Compare search performance before and after the migration
- Evaluate the quality of search results with 1536 dimensions
- Monitor system resource usage

### 9. Documentation Updates
Update all relevant documentation:
- File: `VECTOR_INDEX_CREATION.md`
- File: `progress.md`
- File: `README.md` (if necessary)
- Update any comments in code that reference dimensions

### 10. Rollback Plan
Prepare a rollback plan in case of issues:
- Document how to revert to 3072 dimensions if necessary
- Create backup procedures for the database
- Identify critical points where rollback might be needed

## Timeline
This migration was completed on September 6, 2025, taking approximately 2-3 days as planned.

## Risks and Mitigation
1. **Data Loss Risk**: Existing embeddings may be incompatible with the new dimensions
   - Mitigation: Created a data migration script to convert existing embeddings
   
2. **Performance Degradation**: Lower dimensional embeddings may result in reduced search quality
   - Mitigation: Thoroughly tested search quality and confirmed it meets requirements
   
3. **Downtime**: Database migration may require downtime
   - Mitigation: Migration was performed during low-usage periods with proper backup procedures
   
4. **HNSW Index Creation Failure**: Some Postgres/pgvector setups may not support HNSW indexes for 1536 dimensions
   - Mitigation: Successfully created HNSW indexes for all vector columns

## Success Criteria
- ✅ All HNSW vector indexes were created successfully with 1536 dimensions
- ✅ Search performance is maintained or improved
- ✅ All existing functionality continues to work correctly
- ✅ No data loss occurred during the migration
- ✅ Application passes all tests with the new dimensions

## Approval
This plan has been successfully implemented and approved.

## Next Steps
1. ✅ Review and approve this plan
2. ✅ Schedule implementation
3. ✅ Begin implementation in development environment
4. ✅ Test thoroughly
5. ✅ Deploy to production after successful testing

## Completion Status
✅ Migration successfully completed on 2025-09-06
✅ All vector columns updated to 1536 dimensions
✅ HNSW indexes created for all vector columns
✅ All functionality verified and working correctly
✅ Documentation updated to reflect successful implementation
