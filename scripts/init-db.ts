import { prisma } from '@/lib/db';

async function main() {
  console.log('🛠️ Initializing database extensions and indexes...');
  // Enable required extensions
  await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector`);
  await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

  // Create indexes for performance
  // We'll attempt to create HNSW vector indexes only when the column's vector
  // dimensionality is supported by the server (some builds/release have limits).

  async function createVectorIndexIfSupported(table: string, column: string, indexName: string) {
    try {
      const res = await prisma.$queryRawUnsafe(
        `SELECT format_type(a.atttypid, a.atttypmod) as typ
         FROM pg_attribute a
         JOIN pg_class c ON a.attrelid = c.oid
         WHERE c.relname = $1 AND a.attname = $2`,
        table,
        column
      ) as Array<{ typ?: string }>;
      const typ = res?.[0]?.typ ?? '';
      const m = typ.match(/vector\((\d+)\)/);
      const dim = m ? parseInt(m[1], 10) : null;
      if (!dim) {
        console.log(`ℹ️ Could not determine vector dimension for ${table}.${column} (type=${typ}), skipping ${indexName}`);
        return;
      }
      // HNSW indexes support up to 2000 dimensions, but we're using 1536 which is well within limits
      if (dim > 2000) {
        console.log(`ℹ️ Skipping ${indexName} for ${table}.${column}: dimension ${dim} exceeds HNSW limits`);
        return;
      }
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS ${indexName} ON ${table} USING hnsw (${column} vector_cosine_ops)`);
      console.log(`✅ Created ${indexName}`);
    } catch (err) {
      console.log(`⚠️ Warning: failed to create ${indexName} — ${(err as Error).message}`);
    }
  }
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS tm_source_text_trgm 
    ON translation_memory USING gin (source_text gin_trgm_ops)
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS tm_target_text_trgm 
    ON translation_memory USING gin (target_text gin_trgm_ops)
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS tm_context_trgm 
    ON translation_memory USING gin (context gin_trgm_ops)
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS ki_tags_gin
    ON knowledge_items USING gin (tags)
  `);

  // Indexes for new romani_* tables
  // Vector indexes are skipped here; see README or run manual index creation.
  await prisma.$executeRawUnsafe(`
  CREATE INDEX IF NOT EXISTS romani_lexicon_tags_gin
  ON romani_lexicon USING gin (tags)
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS romani_lexicon_source_text_trgm
    ON romani_lexicon USING gin (source_text gin_trgm_ops)
  `);

  // Try to create vector indexes when supported
  await createVectorIndexIfSupported('translation_memory', 'embedding', 'tm_embedding_hnsw');
  await createVectorIndexIfSupported('romani_lexicon', 'embedding', 'romani_lexicon_embedding_hnsw');
  await createVectorIndexIfSupported('romani_grammar', 'embedding', 'romani_grammar_embedding_hnsw');
  await createVectorIndexIfSupported('romani_style', 'embedding', 'romani_style_embedding_hnsw');
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS romani_grammar_content_trgm
    ON romani_grammar USING gin (content gin_trgm_ops)
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS romani_grammar_tags_gin
    ON romani_grammar USING gin (tags)
  `);

  // romani_style vector index handled above
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS romani_style_content_trgm
    ON romani_style USING gin (content gin_trgm_ops)
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS romani_style_tags_gin
    ON romani_style USING gin (tags)
  `);

  console.log('✅ Database initialized');
}

main()
  .catch((e) => {
    console.error('❌ DB init failed', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
