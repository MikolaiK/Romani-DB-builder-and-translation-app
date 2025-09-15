import { prisma } from '../lib/db';

async function run() {
  const count = await prisma.romaniLexicon.count();
  const recent = await prisma.romaniLexicon.findMany({ orderBy: { createdAt: 'desc' }, take: 5 });
  console.log('romani_lexicon count:', count);
  console.log(JSON.stringify(recent, null, 2));
  await prisma.$disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
