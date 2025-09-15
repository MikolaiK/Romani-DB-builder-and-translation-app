import { PrismaClient, QualityScore } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create sample knowledge items
  await prisma.knowledgeItem.createMany({
    data: [
      {
        title: "Common Greetings",
        content: "Swedish: Hej = Romani: Baxt\nSwedish: Hej då = Romani: Te aves baxtalo",
        category: "greetings",
        tags: ["basic", "conversation"],
        qualityScore: QualityScore.A,
      },
      {
        title: "Family Terms",
        content: "Swedish: familj = Romani: familija\nSwedish: mamma = Romani: daj\nSwedish: pappa = Romani: dad",
        category: "family",
        tags: ["family", "relationships"],
        qualityScore: QualityScore.A,
      },
      {
        title: "Numbers 1-10",
        content: "1: ek, 2: duj, 3: trin, 4: štar, 5: pandž, 6: šov, 7: efta, 8: oxto, 9: inja, 10: deš",
        category: "numbers",
        tags: ["numbers", "basic"],
        qualityScore: QualityScore.B,
      },
    ],
  });

  // Create sample translation memory entries
  await prisma.translationMemory.createMany({
    data: [
      {
        sourceText: "Hej, hur mår du?",
        targetText: "Baxt, sar san?",
        context: "Casual greeting",
        domain: "conversation",
        qualityScore: QualityScore.A,
        reviewStatus: 'APPROVED',
      },
      {
        sourceText: "Jag heter Anna",
        targetText: "Miro nav si Anna",
        context: "Introduction",
        domain: "conversation",
        qualityScore: QualityScore.B,
        reviewStatus: 'APPROVED',
      },
      {
        sourceText: "Var kommer du ifrån?",
        targetText: "Kaj aves tu?",
        context: "Getting to know someone",
        domain: "conversation",
        qualityScore: QualityScore.B,
        reviewStatus: 'PENDING',
      },
    ],
  });

  console.log('✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
