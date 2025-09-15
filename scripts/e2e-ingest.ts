// Use global fetch (Node 18+ / tsx environment)

async function run() {
  const base = 'http://localhost:3001';
  console.log('-> POST /api/ingest/prepare');
  const prepResp = await fetch(base + '/api/ingest/prepare', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rawText: 'hej, sastipe\nHej || Sastipe\nThis is a short grammar note about nouns.' }),
  });
  const prepJson = await prepResp.json();
  console.log('prepare response:', JSON.stringify(prepJson, null, 2));
  if (!prepJson.prepared) {
    throw new Error('Prepare did not return prepared payload');
  }

  console.log('-> POST /api/ingest/commit');
  const commitResp = await fetch(base + '/api/ingest/commit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prepared: prepJson.prepared, dialect: 'Lovari', filename: 'e2e.txt' }),
  });
  const commitJson = await commitResp.json();
  console.log('commit response:', JSON.stringify(commitJson, null, 2));
  if (!commitJson.jobId) throw new Error('Commit did not return jobId');

  const jobId = commitJson.jobId as string;
  console.log('Polling job status for', jobId);

  const start = Date.now();
  while (true) {
    const st = await fetch(base + '/api/ingest/status/' + jobId);
    const stj = await st.json();
    console.log('status:', stj.status, 'progress:', stj.progress, '%');
    if (stj.status && stj.status !== 'RUNNING') {
      console.log('Final status:', JSON.stringify(stj, null, 2));
      break;
    }
    if (Date.now() - start > 30000) {
      throw new Error('Timeout waiting for ingestion job to complete');
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
}

run().catch((e) => { console.error(e); process.exit(1); });
