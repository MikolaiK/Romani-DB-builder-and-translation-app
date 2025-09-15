import { prisma } from '../lib/db';

async function dryRun(batchSize = 200) {
  let wouldMove = 0;
  let wouldSkip = 0;
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
      const exists = await prisma.romaniLexicon.findFirst({
        where: { sourceText: tm.sourceText, targetText: tm.targetText, dialect: tm.dialect ?? null },
        select: { id: true },
      });
      if (exists) wouldSkip += 1; else wouldMove += 1;
      cursor = tm.id;
    }
    if (items.length < batchSize) break;
  }

  return { processed, wouldMove, wouldSkip };
}

async function main() {
  const res = await dryRun();
  console.log('Dry-run result:', res);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
