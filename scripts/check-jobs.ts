import { prisma } from '../lib/db';

async function run() {
  const rows = await prisma.$queryRawUnsafe(`SELECT id,status,error_message,total_items,processed_items,started_at,finished_at FROM ingestion_jobs ORDER BY created_at DESC LIMIT 10`);
  console.log(JSON.stringify(rows, null, 2));
  await prisma.$disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
