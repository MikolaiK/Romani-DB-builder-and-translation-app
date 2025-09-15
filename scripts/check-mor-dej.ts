import { prisma } from '../lib/db';

async function run() {
  // Check if the exact "mor - dej" pair exists
  const exactMatch = await prisma.romaniLexicon.findFirst({
    where: {
      sourceText: 'mor',
      targetText: 'dej'
    }
  });
  
  console.log('Exact match for "mor - dej":', exactMatch ? 'FOUND' : 'NOT FOUND');
  if (exactMatch) {
    console.log('Found entry:', JSON.stringify(exactMatch, null, 2));
  }
  
  // Check for any entries containing "mor" in sourceText
  const morEntries = await prisma.romaniLexicon.findMany({
    where: {
      sourceText: {
        contains: 'mor'
      }
    }
  });
  
  console.log(`\nEntries with "mor" in sourceText:`);
  if (morEntries.length > 0) {
    morEntries.forEach(entry => {
      console.log(`  "${entry.sourceText}" -> "${entry.targetText}"`);
    });
  } else {
    console.log('  None found');
  }
  
  // Check for any entries containing "dej" in targetText
  const dejEntries = await prisma.romaniLexicon.findMany({
    where: {
      targetText: {
        contains: 'dej'
      }
    }
  });
  
  console.log(`\nEntries with "dej" in targetText:`);
  if (dejEntries.length > 0) {
    dejEntries.forEach(entry => {
      console.log(`  "${entry.sourceText}" -> "${entry.targetText}"`);
    });
  } else {
    console.log('  None found');
  }
  
  await prisma.$disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });