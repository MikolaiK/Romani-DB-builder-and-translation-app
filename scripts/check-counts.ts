import { prisma } from '../lib/db';

async function run() {
  const lex = await prisma.romaniLexicon.count();
  const tmv = await prisma.translationMemory.count({ where: { domain: 'vocab' } });
  console.log('romani_lexicon count:', lex);
  console.log('translation_memory (domain=vocab) count:', tmv);
  await prisma.$disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
