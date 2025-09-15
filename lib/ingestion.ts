import { prisma } from './db';
import { generateEmbedding } from './embedding';
import { randomUUID } from 'crypto';

function normalizeTags(input?: string[] | string | null): string[] {
  if (!input) return [];
  let arr: string[] = [];
  if (Array.isArray(input)) arr = [...input];
  else arr = String(input).split(',').map((s) => s.trim()).filter(Boolean);
  // remove surrounding quotes and trim
  arr = arr.map((t) => t.replace(/^\s*['"]+|['"]+\s*$/g, '').trim()).filter(Boolean);
  // filter out automated metadata tags that belong in dedicated columns
  const forbiddenPrefixes = ['dialect:', 'source:', 'job:', 'chunk:'];
  arr = arr.filter((t) => !forbiddenPrefixes.some((p) => t.startsWith(p)));
  // dedupe while preserving order
  return Array.from(new Set(arr));
}

export type IngestSourceType = 'grammar' | 'vocab' | 'parallel' | 'raw';

export interface IngestOptions {
  dialect?: 'Lovari' | 'Kelderash' | 'Arli';
  sourceType: IngestSourceType;
  filename?: string;
}

export type PreparedPayload = {
  grammarChunks: string[];
  vocabPairs: Array<{ swedish: string; romani: string }>;
  parallelPairs: Array<{ sv: string; rmn: string }>;
};

// Very lightweight parse utilities; can be extended later or swapped for Python workers
export function splitGrammar(text: string): string[] {
  // Check if the text is a single coherent grammar rule that should be kept together
  // Heuristic: if the text has a title-like structure and is not too long, keep it as one chunk
  const lines = text.split(/\r?\n/);
  const firstLine = lines[0] || '';
  
  // If the first line looks like a title (starts with # or has title-like formatting)
  // and the total text is not too long, treat it as a single chunk
  if ((firstLine.startsWith('#') || firstLine.includes(' in ')) && text.length < 4000) {
    return [text.trim()];
  }
  
  // For shorter texts that look like a single rule, keep as one chunk
  if (text.length < 2000 && (text.includes('Rule:') || text.includes('**Rule**') || text.includes('__Rule__'))) {
    return [text.trim()];
  }
  
  // Otherwise, use the original splitting logic
  // Split on headings and paragraphs into ~500-2000 char chunks (more generous to preserve authored grammar blocks)
  const parts = text
    .split(/\n{2,}|^#+\s.*$/gim)
    .map((s) => s.trim())
    .filter(Boolean);
  const chunks: string[] = [];
  let buffer = '';
  for (const p of parts) {
  if ((buffer + ' ' + p).length > 2000) {
      if (buffer) chunks.push(buffer.trim());
      buffer = p;
    } else {
      buffer = buffer ? buffer + '\n\n' + p : p;
    }
  }
  if (buffer) chunks.push(buffer.trim());
  return chunks;
}

export function splitVocabList(text: string): Array<{ swedish: string; romani: string }>{
  // Expect lines like: Swedish: hej = Romani: baxt OR csv-like 'hej,baxt'
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const pairs: Array<{ swedish: string; romani: string }> = [];
  for (const line of lines) {
    const csv = line.split(',');
    if (csv.length === 2) {
      pairs.push({ swedish: csv[0].trim(), romani: csv[1].trim() });
      continue;
    }
    const m1 = line.match(/Swedish:\s*(.*?)\s*=\s*Romani:\s*(.*)/i);
    if (m1) {
      pairs.push({ swedish: m1[1].trim(), romani: m1[2].trim() });
    }
  }
  return pairs;
}

export function splitParallel(text: string): Array<{ sv: string; rmn: string }>{
  // Split into sentence pairs if format is 'sv || rmn' per line; otherwise, try tab-separated
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const pairs: Array<{ sv: string; rmn: string }> = [];
  for (const line of lines) {
    let sv = '';
  let rmn = '';
    if (line.includes('||')) {
      const [a, b] = line.split('||');
      sv = a?.trim() || '';
      rmn = b?.trim() || '';
    } else if (line.includes('\t')) {
      const [a, b] = line.split('\t');
      sv = a?.trim() || '';
      rmn = b?.trim() || '';
    }
    if (sv && rmn) pairs.push({ sv, rmn });
  }
  return pairs;
}

export async function runIngestion(rawText: string, opts: IngestOptions) {
  const jobId = randomUUID();
  await prisma.$executeRawUnsafe(
    `INSERT INTO ingestion_jobs (id, "sourceType", filename, dialect, status, total_items, processed_items, started_at, updated_at)
     VALUES ($1, $2, $3, $4::"Dialect", 'RUNNING'::"IngestionStatus", 0, 0, NOW(), NOW())`,
    jobId,
    opts.sourceType,
    opts.filename ?? null,
    opts.dialect ?? null
  );

  try {
    if (!rawText || !rawText.trim()) throw new Error('Empty text');

    let total = 0;
    let processed = 0;

    // update processed counter immediately for better realtime feedback
    const bump = async () => {
      processed += 1;
      await prisma.$executeRawUnsafe(`UPDATE ingestion_jobs SET processed_items = $1 WHERE id = $2`, processed, jobId);
    };

    // helper to avoid hanging on embedding calls
    const withTimeout = async <T>(p: Promise<T>, ms = 30_000): Promise<T> => {
      let timer: NodeJS.Timeout | null = null;
      const timeout = new Promise<never>((_, rej) => {
        timer = setTimeout(() => rej(new Error('Embedding timeout')), ms);
      });
      try {
        return await Promise.race([p, timeout]) as T;
      } finally {
        if (timer) clearTimeout(timer);
      }
    };

    if (opts.sourceType === 'grammar') {
      const chunks = splitGrammar(rawText);
  total = chunks.length;
  await prisma.$executeRawUnsafe(`UPDATE ingestion_jobs SET total_items = $1 WHERE id = $2`, total, jobId);
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        try {
          const emb = await withTimeout(generateEmbedding(chunk, { dialect: opts.dialect }));
          // create a romani_grammar row
          const rg = await prisma.romaniGrammar.create({
            data: {
              filename: opts.filename ?? null,
              chunkIndex: i,
              content: chunk,
              dialect: opts.dialect ?? null,
              // do not include automated metadata tags here (they belong in provenance)
              tags: ['type:grammar'],
              provenance: { filename: opts.filename ?? null, jobId, domain: undefined, tags: [] },
              qualityScore: 'B',
            },
          });
          await prisma.$executeRawUnsafe(`UPDATE romani_grammar SET embedding = $1::vector WHERE id = $2`, `[${emb.join(',')}]`, rg.id);
          await prisma.$executeRawUnsafe(
            `INSERT INTO ingestion_records (id, job_id, target_table, target_id, status, preview)
             VALUES ($1, $2, $3, $4, 'INSERTED'::"IngestionItemStatus", $5)`,
            randomUUID(), jobId, 'romani_grammar', rg.id, String(chunk).slice(0, 120)
          );
        } catch (err) {
          await prisma.$executeRawUnsafe(
            `INSERT INTO ingestion_records (id, job_id, target_table, target_id, status, preview, error_message)
             VALUES ($1, $2, $3, $4, 'FAILED'::"IngestionItemStatus", $5, $6)`,
            randomUUID(), jobId, 'romani_grammar', null, String(chunk).slice(0,120), (err as Error).message
          );
        } finally {
          await bump();
        }
      }
    } else if (opts.sourceType === 'vocab') {
      const pairs = splitVocabList(rawText);
  total = pairs.length;
  await prisma.$executeRawUnsafe(`UPDATE ingestion_jobs SET total_items = $1 WHERE id = $2`, total, jobId);
      for (let i = 0; i < pairs.length; i++) {
        const { swedish, romani } = pairs[i];
        try {
          const combined = `Swedish: ${swedish} ||| Romani: ${romani}`;
          const emb = await withTimeout(generateEmbedding(combined, { dialect: opts.dialect }));
          const rl = await prisma.romaniLexicon.create({
            data: {
              sourceText: swedish,
              targetText: romani,
              domain: 'vocab',
              dialect: opts.dialect ?? null,
              provenance: { filename: opts.filename ?? null, jobId },
              qualityScore: 'A',
              reviewStatus: 'APPROVED',
            },
          });
          await prisma.$executeRawUnsafe(
            `UPDATE romani_lexicon SET embedding = $1::vector WHERE id = $2`,
            `[${emb.join(',')}]`,
            rl.id
          );
          await prisma.$executeRawUnsafe(
            `INSERT INTO ingestion_records (id, job_id, target_table, target_id, status, preview)
             VALUES ($1, $2, $3, $4, 'INSERTED'::"IngestionItemStatus", $5)`, randomUUID(), jobId, 'romani_lexicon', rl.id, `${swedish} -> ${romani}`.slice(0, 120)
          );
        } catch (err) {
          await prisma.$executeRawUnsafe(
            `INSERT INTO ingestion_records (id, job_id, target_table, target_id, status, preview, error_message)
             VALUES ($1, $2, $3, $4, 'FAILED'::"IngestionItemStatus", $5, $6)`, randomUUID(), jobId, 'romani_lexicon', null, `${swedish} -> ${romani}`.slice(0,120), (err as Error).message
          );
        } finally {
          await bump();
        }
      }
    } else if (opts.sourceType === 'parallel') {
      const pairs = splitParallel(rawText);
  total = pairs.length;
  await prisma.$executeRawUnsafe(`UPDATE ingestion_jobs SET total_items = $1 WHERE id = $2`, total, jobId);
      for (let i = 0; i < pairs.length; i++) {
        const { sv, rmn } = pairs[i];
        try {
          const combined = `${sv}\n${rmn}`;
          const emb = await withTimeout(generateEmbedding(combined, { dialect: opts.dialect }));
          const tm = await prisma.translationMemory.create({
            data: {
              sourceText: sv,
              targetText: rmn,
              correctedText: null,
              domain: 'corpus',
              dialect: opts.dialect ?? null,
              reviewStatus: 'APPROVED',
              qualityScore: 'B',
            },
          });
          await prisma.$executeRawUnsafe(
            `UPDATE translation_memory SET embedding = $1::vector WHERE id = $2`,
            `[${emb.join(',')}]`, tm.id
          );
          await prisma.$executeRawUnsafe(
            `INSERT INTO ingestion_records (id, job_id, target_table, target_id, status, preview)
             VALUES ($1, $2, $3, $4, 'INSERTED'::"IngestionItemStatus", $5)`, randomUUID(), jobId, 'translation_memory', tm.id, `${sv} -> ${rmn}`.slice(0, 120)
          );
        } catch (err) {
          await prisma.$executeRawUnsafe(`INSERT INTO ingestion_records (id, job_id, target_table, target_id, status, preview, error_message)
             VALUES ($1, $2, $3, $4, 'FAILED'::"IngestionItemStatus", $5, $6)`, randomUUID(), jobId, 'translation_memory', null, `${sv} -> ${rmn}`.slice(0,120), (err as Error).message);
        } finally {
          await bump();
        }
      }
    } else {
      // raw: just shove as knowledge items chunks
  const chunks = splitGrammar(rawText);
  total = chunks.length;
  await prisma.$executeRawUnsafe(`UPDATE ingestion_jobs SET total_items = $1 WHERE id = $2`, total, jobId);
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const emb = await generateEmbedding(chunk, { dialect: opts.dialect });
        // create a romani_style row for raw content (assumption: raw maps to style/notes)
  const rs = await prisma.romaniStyle.create({
          data: {
            title: opts.filename ?? null,
            content: chunk,
            dialect: opts.dialect ?? null,
            // keep tags minimal for raw ingest; automated metadata stays in provenance
            tags: ['type:raw'],
            provenance: { filename: opts.filename ?? null, jobId },
          },
        });
        await prisma.$executeRawUnsafe(`UPDATE romani_style SET embedding = $1::vector WHERE id = $2`, `[${emb.join(',')}]`, rs.id);
        await prisma.$executeRawUnsafe(`INSERT INTO ingestion_records (id, job_id, target_table, target_id, status, preview)
           VALUES ($1, $2, $3, $4, 'INSERTED'::"IngestionItemStatus", $5)`, randomUUID(), jobId, 'romani_style', rs.id, chunk.slice(0, 120));
        await bump();
      }
    }

    await prisma.$executeRawUnsafe(
      `UPDATE ingestion_jobs SET status = 'COMPLETED'::"IngestionStatus", processed_items = $1, finished_at = NOW() WHERE id = $2`,
      processed,
      jobId
    );
    return { jobId };
  } catch (error) {
    await prisma.$executeRawUnsafe(
      `UPDATE ingestion_jobs SET status = 'FAILED'::"IngestionStatus", error_message = $1, finished_at = NOW() WHERE id = $2`,
      (error as Error).message,
      jobId
    );
    throw error;
  }
}

export interface CommitOptions {
  dialect?: 'Lovari' | 'Kelderash' | 'Arli';
  filename?: string;
  jobSourceLabel?: string; // e.g., 'mixed'
  domain?: string;
  tags?: string[];
}

// Commit a prepared payload into the database as a single job
export async function commitPrepared(prepared: PreparedPayload, opts: CommitOptions) {
  const jobId = randomUUID();
  const jobLabel = opts.jobSourceLabel || 'mixed';
  await prisma.$executeRawUnsafe(
    `INSERT INTO ingestion_jobs (id, "sourceType", filename, dialect, status, total_items, processed_items, started_at, updated_at)
     VALUES ($1, $2, $3, $4::"Dialect", 'RUNNING'::"IngestionStatus", 0, 0, NOW(), NOW())`,
    jobId,
    jobLabel,
    opts.filename ?? null,
    opts.dialect ?? null
  );

  try {
  const isGrammarOnly = opts.jobSourceLabel === 'grammar';
  const total = (prepared.grammarChunks?.length || 0) + (isGrammarOnly ? 0 : ((prepared.vocabPairs?.length || 0) + (prepared.parallelPairs?.length || 0)));
    await prisma.$executeRawUnsafe(`UPDATE ingestion_jobs SET total_items = $1 WHERE id = $2`, total, jobId);
    let processed = 0;
    const bump = async () => {
      processed += 1;
      await prisma.$executeRawUnsafe(`UPDATE ingestion_jobs SET processed_items = $1 WHERE id = $2`, processed, jobId);
    };

    const withTimeout = async <T>(p: Promise<T>, ms = 30_000): Promise<T> => {
      let timer: NodeJS.Timeout | null = null;
      const timeout = new Promise<never>((_, rej) => {
        timer = setTimeout(() => rej(new Error('Embedding timeout')), ms);
      });
      try {
        return await Promise.race([p, timeout]) as T;
      } finally {
        if (timer) clearTimeout(timer);
      }
    };

    for (let i = 0; i < (prepared.grammarChunks || []).length; i++) {
      const chunk = (prepared.grammarChunks as string[])[i];
      try {
        const emb = await withTimeout(generateEmbedding(chunk, { dialect: opts.dialect }));
  // normalize user-supplied tags and store automated metadata in provenance
  const userTags = normalizeTags(opts.tags);
  const rg = await prisma.romaniGrammar.create({
          data: {
            filename: opts.filename ?? null,
            chunkIndex: i,
            content: chunk,
            dialect: opts.dialect ?? null,
            tags: ['type:grammar', ...userTags],
            provenance: { filename: opts.filename ?? null, jobId, domain: opts.domain ?? null, tags: userTags },
            qualityScore: 'B',
          },
        });
        await prisma.$executeRawUnsafe(`UPDATE romani_grammar SET embedding = $1::vector WHERE id = $2`, `[${emb.join(',')}]`, rg.id);
        await prisma.$executeRawUnsafe(
          `INSERT INTO ingestion_records (id, job_id, target_table, target_id, status, preview)
           VALUES ($1, $2, $3, $4, 'INSERTED'::"IngestionItemStatus", $5)`,
          randomUUID(), jobId, 'romani_grammar', rg.id, String(chunk).slice(0, 120)
        );
      } catch (err) {
        await prisma.$executeRawUnsafe(
          `INSERT INTO ingestion_records (id, job_id, target_table, target_id, status, preview, error_message)
           VALUES ($1, $2, $3, $4, 'FAILED'::"IngestionItemStatus", $5, $6)`,
          randomUUID(), jobId, 'romani_grammar', null, String(chunk).slice(0,120), (err as Error).message
        );
      } finally {
        await bump();
      }
    }

    if (!isGrammarOnly) {
      for (let i = 0; i < (prepared.vocabPairs || []).length; i++) {
        const { swedish, romani } = (prepared.vocabPairs as Array<{swedish: string; romani: string}>)[i];
      try {
        const combined = `Swedish: ${swedish} ||| Romani: ${romani}`;
        const emb = await withTimeout(generateEmbedding(combined, { dialect: opts.dialect }));
        const userTags = normalizeTags(opts.tags);
        const rl = await prisma.romaniLexicon.create({
          data: {
            sourceText: swedish,
            targetText: romani,
              domain: opts.domain ?? 'vocab',
            dialect: opts.dialect ?? null,
              provenance: { filename: opts.filename ?? null, jobId, tags: userTags },
            reviewStatus: 'APPROVED',
            qualityScore: 'A',
          },
        });
        await prisma.$executeRawUnsafe(`UPDATE romani_lexicon SET embedding = $1::vector WHERE id = $2`, `[${emb.join(',')}]`, rl.id);
        if (userTags && userTags.length > 0) {
          await prisma.$executeRawUnsafe(`UPDATE romani_lexicon SET tags = $1 WHERE id = $2`, userTags, rl.id);
        }
        await prisma.$executeRawUnsafe(`INSERT INTO ingestion_records (id, job_id, target_table, target_id, status, preview)
           VALUES ($1, $2, $3, $4, 'INSERTED'::"IngestionItemStatus", $5)`, randomUUID(), jobId, 'romani_lexicon', rl.id, `${swedish} -> ${romani}`.slice(0, 120));
      } catch (err) {
        await prisma.$executeRawUnsafe(`INSERT INTO ingestion_records (id, job_id, target_table, target_id, status, preview, error_message)
           VALUES ($1, $2, $3, $4, 'FAILED'::"IngestionItemStatus", $5, $6)`, randomUUID(), jobId, 'romani_lexicon', null, `${swedish} -> ${romani}`.slice(0,120), (err as Error).message);
      } finally {
        await bump();
      }
    }
    }

    if (!isGrammarOnly) {
      for (let i = 0; i < (prepared.parallelPairs || []).length; i++) {
      const { sv, rmn } = (prepared.parallelPairs as Array<{sv: string; rmn: string}>)[i];
      try {
        const combined = `${sv}\n${rmn}`;
        const emb = await withTimeout(generateEmbedding(combined, { dialect: opts.dialect }));
    const userTags = normalizeTags(opts.tags);
    const tm = await prisma.translationMemory.create({
          data: {
            sourceText: sv,
            targetText: rmn,
            correctedText: null,
            domain: opts.domain ?? 'corpus',
            dialect: opts.dialect ?? null,
      tags: userTags,
            reviewStatus: 'APPROVED',
            qualityScore: 'B',
          },
        });
        await prisma.$executeRawUnsafe(
          `UPDATE translation_memory SET embedding = $1::vector WHERE id = $2`,
          `[${emb.join(',')}]`, tm.id
        );
        await prisma.$executeRawUnsafe(
          `INSERT INTO ingestion_records (id, job_id, target_table, target_id, status, preview)
           VALUES ($1, $2, $3, $4, 'INSERTED'::"IngestionItemStatus", $5)`,
          randomUUID(), jobId, 'translation_memory', tm.id, `${sv} -> ${rmn}`.slice(0, 120)
        );
      } catch (err) {
        await prisma.$executeRawUnsafe(`INSERT INTO ingestion_records (id, job_id, target_table, target_id, status, preview, error_message)
           VALUES ($1, $2, $3, $4, 'FAILED'::"IngestionItemStatus", $5, $6)`, randomUUID(), jobId, 'translation_memory', null, `${sv} -> ${rmn}`.slice(0,120), (err as Error).message);
      } finally {
        await bump();
      }
      }
    }

    await prisma.$executeRawUnsafe(
      `UPDATE ingestion_jobs SET status = 'COMPLETED'::"IngestionStatus", processed_items = $1, finished_at = NOW() WHERE id = $2`,
      processed,
      jobId
    );
    return { jobId };
  } catch (error) {
    await prisma.$executeRawUnsafe(
      `UPDATE ingestion_jobs SET status = 'FAILED'::"IngestionStatus", error_message = $1, finished_at = NOW() WHERE id = $2`,
      (error as Error).message,
      jobId
    );
    throw error;
  }
}
