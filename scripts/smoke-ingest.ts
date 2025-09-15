import { commitPrepared } from '../lib/ingestion';

async function run() {
  const prepared = {
    grammarChunks: ["This is a short grammar note about noun cases."],
    vocabPairs: [{ swedish: 'hej', romani: 'sastipe' }],
    parallelPairs: [{ sv: 'Hej', rmn: 'Sastipe' }]
  };

  const res = await commitPrepared(prepared as any, { dialect: 'Lovari', filename: 'smoke.txt', jobSourceLabel: 'smoke' });
  console.log('commitPrepared result:', res);
}

run().catch((e) => { console.error(e); process.exit(1); });
