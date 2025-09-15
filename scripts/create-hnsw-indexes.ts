import { prisma } from '@/lib/db';

async function getVectorType(table: string, column: string) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT format_type(a.atttypid, a.atttypmod) as typ
     FROM pg_attribute a
     JOIN pg_class c ON a.attrelid = c.oid
     WHERE c.relname = $1 AND a.attname = $2`,
    table,
    column
  ) as Array<{ typ?: string }>;
  return rows?.[0]?.typ ?? null;
}

async function createHnswIndexIfSupported(table: string, column: string, indexName: string) {
  try {
    const typ = await getVectorType(table, column);
    if (!typ) {
      console.log(`ℹ️ ${table}.${column} not found, skipping ${indexName}`);
      return;
    }
    const m = typ.match(/vector\((\d+)\)/);
    const dim = m ? parseInt(m[1], 10) : null;
    if (!dim) {
      console.log(`ℹ️ Could not parse type for ${table}.${column} (type=${typ}), skipping ${indexName}`);
      return;
    }
    // HNSW indexes support up to 2000 dimensions, but we're using 1536 which is well within limits
    if (dim > 2000) {
      console.log(`ℹ️ Skipping ${indexName} for ${table}.${column}: dimension ${dim} exceeds HNSW limits`);
      return;
    }

    console.log(`🔧 Creating HNSW index ${indexName} on ${table}.${column} (dim=${dim})`);
    // Use a safe DO block so partially supported environments don't abort
    await prisma.$executeRawUnsafe(`DO $$ 
      BEGIN 
        CREATE INDEX IF NOT EXISTS ${indexName} ON ${table} USING hnsw (${column} vector_cosine_ops);
      EXCEPTION 
        WHEN others THEN 
          RAISE NOTICE 'Skipping index ${indexName}: %', SQLERRM;
      END; 
      $$;`);
    console.log(`✅ Ensured ${indexName}`);
  } catch (err) {
    console.log(`⚠️ Failed to create ${indexName} for ${table}.${column}: ${(err as Error).message}`);
  }
}

async function main() {
  console.log('🛠️ Creating HNSW indexes where supported...');

  const tasks = [
    ['translation_memory', 'embedding', 'tm_embedding_hnsw'],
    ['romani_lexicon', 'embedding', 'romani_lexicon_embedding_hnsw'],
    ['romani_grammar', 'embedding', 'romani_grammar_embedding_hnsw'],
    ['romani_style', 'embedding', 'romani_style_embedding_hnsw'],
    ['knowledge_items', 'embedding', 'knowledge_items_embedding_hnsw'],
  ] as const;

  for (const [table, column, indexName] of tasks) {
    // eslint-disable-next-line no-await-in-loop
    await createHnswIndexIfSupported(table, column, indexName);
  }

 console.log('✅ Done');
}

main()
  .catch((e) => {
    console.error('❌ Failed', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
