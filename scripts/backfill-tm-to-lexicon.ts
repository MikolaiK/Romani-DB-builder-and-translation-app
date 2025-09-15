import { prisma } from '../lib/db';

async function moveBatch(batchSize = 200) {
  let moved = 0;
  let skipped = 0;
  let processed = 0;
  let cursor: string | null = null;

  while (true) {
  const items: any[] = await prisma.translationMemory.findMany({
      where: { domain: 'vocab' },
      orderBy: { id: 'asc' },
      take: batchSize,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    if (!items.length) break;

  for (const tm of items as any[]) {
      processed += 1;
      try {
        await prisma.$transaction(async (tx) => {
          // check duplicate in lexicon
          const exists = await tx.romaniLexicon.findFirst({
            where: {
              sourceText: tm.sourceText,
              targetText: tm.targetText,
              dialect: tm.dialect ?? null,
            },
            select: { id: true },
          });

          if (exists) {
            // already present - delete from translation_memory
            await tx.translationMemory.delete({ where: { id: tm.id } });
            skipped += 1;
            return;
          }

          // create romani_lexicon row
          const rl = await tx.romaniLexicon.create({
            data: {
              sourceText: tm.sourceText,
              targetText: tm.targetText,
              domain: 'vocab',
              dialect: tm.dialect ?? null,
              provenance: { migratedFrom: tm.id, migratedAt: new Date().toISOString() },
              qualityScore: (tm.qualityScore as any) ?? 'C',
              reviewStatus: (tm.reviewStatus as any) ?? 'APPROVED',
            },
          });

          // copy single embedding via raw SQL from translation_memory into romani_lexicon
          await tx.$executeRawUnsafe(
            `UPDATE romani_lexicon SET embedding = (SELECT embedding FROM translation_memory WHERE id = $1) WHERE id = $2`,
            tm.id,
            rl.id
          );

          // delete original translation_memory row
          await tx.translationMemory.delete({ where: { id: tm.id } });
          moved += 1;
        });
      } catch (err) {
        console.error('Failed to move row', tm.id, err);
      }

      cursor = tm.id;
    }

    // If fewer than batchSize returned, we've exhausted
    if (items.length < batchSize) break;
  }

  return { processed, moved, skipped };
}

async function main() {
  console.log('Starting backfill: translation_memory(domain=vocab) -> romani_lexicon');
  const res = await moveBatch(200);
  console.log('Backfill completed:', res);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Backfill failed', e);
  process.exit(1);
});
