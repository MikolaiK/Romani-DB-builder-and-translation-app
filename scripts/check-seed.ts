import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
(async () => {
  try {
    console.log('knowledge=', await prisma.knowledgeItem.count());
    console.log('translationMemory=', await prisma.translationMemory.count());
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
