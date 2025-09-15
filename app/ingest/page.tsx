"use client";
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';

type Dialect = 'Lovari' | 'Kelderash' | 'Arli' | '';
type SourceType = 'grammar' | 'vocab' | 'parallel' | 'raw';

type IngestionSample = { id: string; preview: string; status: 'INSERTED' | 'FAILED' };
type IngestionStatus = {
  id: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  totalItems: number;
  processedItems: number;
  progress: number;
  startedAt?: string;
  finishedAt?: string;
  errorMessage?: string;
  sample: IngestionSample[];
};

type IngestionHistoryItem = {
  id: string;
  status: string;
  filename?: string;
  sourceType: string;
  dialect?: Dialect | null;
  totalItems: number;
  processedItems: number;
  createdAt: string;
  finishedAt?: string;
};

type PreparedPayload = {
  grammarChunks: string[];
  vocabPairs: Array<{ swedish: string; romani: string }>;
  parallelPairs: Array<{ sv: string; rmn: string }>;
};

export default function IngestPage() {
  const [rawText, setRawText] = useState('');
  const [dialect, setDialect] = useState<Dialect>('');
  const [domain, setDomain] = useState('');
  const [tags, setTags] = useState('');
  const [sourceType, setSourceType] = useState<SourceType>('grammar');
  const [filename, setFilename] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<IngestionStatus | null>(null);
  const [history, setHistory] = useState<IngestionHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [prepared, setPrepared] = useState<PreparedPayload | null>(null);
  const [prepareMeta, setPrepareMeta] = useState<{ domain: string | null; tags: string[] } | null>(null);
  const [stage, setStage] = useState<'idle' | 'preview' | 'committing' | 'tracking'>('idle');

  // Small inline editor for grammar chunks in the prepared preview
  function GrammarItemEditor({ index, value, prepared, setPrepared }: { index: number; value: string; prepared: PreparedPayload; setPrepared: (p: PreparedPayload) => void }) {
    const [edit, setEdit] = useState(false);
    const [text, setText] = useState(value);
    return (
      <div>
        {edit ? (
          <div>
            <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} />
            <div className="mt-1 flex gap-2">
              <Button onClick={() => {
                const copy = { ...prepared, grammarChunks: prepared.grammarChunks.map((g, i) => i === index ? text : g) };
                setPrepared(copy);
                setEdit(false);
              }}>Save</Button>
              <Button variant="secondary" onClick={() => { setText(value); setEdit(false); }}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div>
            <div className="truncate" title={value}>{value}</div>
            <div className="mt-1">
              <button className="text-sm text-blue-600" onClick={() => setEdit(true)}>Edit</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Inline editor for a vocabulary pair
  function VocabItemEditor({ index, pair, prepared, setPrepared }: { index: number; pair: { swedish: string; romani: string }; prepared: PreparedPayload; setPrepared: (p: PreparedPayload) => void }) {
    const [edit, setEdit] = useState(false);
    const [swedish, setSwedish] = useState(pair.swedish);
    const [romani, setRomani] = useState(pair.romani);
    return (
      <div>
        {edit ? (
          <div>
            <div className="grid grid-cols-2 gap-2">
              <input className="border rounded p-1 text-sm" value={swedish} onChange={(e) => setSwedish(e.target.value)} />
              <input className="border rounded p-1 text-sm" value={romani} onChange={(e) => setRomani(e.target.value)} />
            </div>
            <div className="mt-1 flex gap-2">
              <Button onClick={() => {
                const copy = { ...prepared, vocabPairs: prepared.vocabPairs.map((v, i) => i === index ? { swedish: swedish.trim(), romani: romani.trim() } : v) };
                setPrepared(copy);
                setEdit(false);
              }}>Save</Button>
              <Button variant="secondary" onClick={() => { setSwedish(pair.swedish); setRomani(pair.romani); setEdit(false); }}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="truncate" title={`${pair.swedish} -> ${pair.romani}`}>{pair.swedish} → {pair.romani}</div>
            <div className="ml-2 flex items-center gap-2">
              <button className="text-sm text-blue-600" onClick={() => setEdit(true)}>Edit</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Inline editor for a parallel sentence pair
  function ParallelItemEditor({ index, pair, prepared, setPrepared }: { index: number; pair: { sv: string; rmn: string }; prepared: PreparedPayload; setPrepared: (p: PreparedPayload) => void }) {
    const [edit, setEdit] = useState(false);
    const [sv, setSv] = useState(pair.sv);
    const [rmn, setRmn] = useState(pair.rmn);
    return (
      <div>
        {edit ? (
          <div>
            <Textarea value={sv} onChange={(e) => setSv(e.target.value)} rows={2} />
            <Textarea value={rmn} onChange={(e) => setRmn(e.target.value)} rows={2} />
            <div className="mt-1 flex gap-2">
              <Button onClick={() => {
                const copy = { ...prepared, parallelPairs: prepared.parallelPairs.map((p, i) => i === index ? { sv: sv.trim(), rmn: rmn.trim() } : p) };
                setPrepared(copy);
                setEdit(false);
              }}>Save</Button>
              <Button variant="secondary" onClick={() => { setSv(pair.sv); setRmn(pair.rmn); setEdit(false); }}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="truncate" title={`${pair.sv} -> ${pair.rmn}`}>{pair.sv} → {pair.rmn}</div>
            <div className="ml-2">
              <button className="text-sm text-blue-600" onClick={() => setEdit(true)}>Edit</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setFile(file);
    setFilename(file.name);
    // Optional: preview in textarea for small files; avoid blocking on huge files
    try {
      const lower = file.name.toLowerCase();
      const isTextLike = /\.(txt|csv|tsv|md|json)$/.test(lower);
      if (isTextLike && file.size <= 2 * 1024 * 1024) { // <=2MB
        const text = await file.text();
        setRawText(text);
      } else {
        setRawText('');
      }
  } catch {
      // ignore preview errors
    }
  };

  const startIngestion = async () => {
    setIsLoading(true);
    try {
      // Phase 1: Prepare preview (AI + heuristics), no embedding yet
      let res: Response;
      if (file) {
        const form = new FormData();
        form.append('file', file);
        form.append('sourceType', sourceType);
        form.append('domain', domain || '');
        form.append('tags', tags || '');
        res = await fetch('/api/ingest/prepare', { method: 'POST', body: form });
      } else {
        res = await fetch('/api/ingest/prepare', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rawText, filename: filename || undefined, sourceType, domain: domain || undefined, tags: tags || undefined }),
        });
      }
      const data = await res.json();
      if (res.ok) {
        setPrepared(data.prepared);
        setPrepareMeta(data.meta ?? null);
        setStage('preview');
        setLastError(null);
      } else {
        setLastError(data.error || 'Failed to prepare ingestion');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const approveAndEmbed = async () => {
    if (!prepared) return;
    setIsLoading(true);
    setStage('committing');
    try {
      const res = await fetch('/api/ingest/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ prepared, dialect: dialect || undefined, filename: filename || (file?.name ?? undefined), sourceType, domain: (prepareMeta?.domain ?? domain) || undefined, tags: prepareMeta?.tags ?? (tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined) }),
      });
      const data = await res.json();
      if (res.ok) {
        setJobId(data.jobId);
        setStatus(null);
        setPrepared(null);
  setPrepareMeta(null);
        setStage('tracking');
        setLastError(null);
        setTimeout(loadHistory, 1000);
      } else {
        setLastError(data.error || 'Failed to commit ingestion');
        setStage('preview');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
  let interval: ReturnType<typeof setInterval> | undefined;
    const poll = async () => {
      if (!jobId) return;
      try {
        const res = await fetch(`/api/ingest/status/${jobId}`);
        const data = await res.json();
        if (res.ok) {
          setStatus(data);
          // stop polling when job is finished or failed to avoid noise
          if (data.status && data.status !== 'RUNNING') {
            if (interval) clearInterval(interval);
            return;
          }
        }
      } catch {
        // ignore transient network errors — don't spam logs
      }
    };
    if (jobId) {
      poll();
      // poll less frequently to reduce log noise (5s)
      interval = setInterval(poll, 5000);
    }
    return () => interval && clearInterval(interval);
  }, [jobId]);

  const loadHistory = async () => {
    const res = await fetch('/api/ingest/history');
    const data = await res.json();
    if (res.ok) setHistory(data);
  };
  useEffect(() => { loadHistory(); }, []);

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      <h1 className="text-xl font-semibold">Ingestion</h1>
      <Card className="p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-sm">Source type</label>
            <select className="w-full border rounded p-2" value={sourceType} onChange={(e) => setSourceType(e.target.value as SourceType)}>
              <option value="grammar">Grammar (chunked)</option>
              <option value="vocab">Vocabulary (pairs)</option>
              <option value="parallel">Parallel sentences (sv||rmn per line)</option>
              <option value="raw">Raw text (chunked)</option>
            </select>
          </div>
          <div>
            <label className="text-sm">Dialect (optional)</label>
            <select className="w-full border rounded p-2" value={dialect} onChange={(e) => setDialect(e.target.value as Dialect)}>
              <option value="">(none)</option>
              <option value="Lovari">Lovari</option>
              <option value="Kelderash">Kelderash</option>
              <option value="Arli">Arli</option>
            </select>
          </div>
          <div>
            <label className="text-sm">Domain (optional)</label>
            <input className="w-full border rounded p-2" value={domain} onChange={(e) => setDomain(e.target.value)} />
          </div>
          <div>
            <label className="text-sm">Tags (comma-separated)</label>
            <input className="w-full border rounded p-2" value={tags} onChange={(e) => setTags(e.target.value)} />
          </div>
          <div>
            <label className="text-sm">Filename (optional)</label>
            <input className="w-full border rounded p-2" value={filename} onChange={(e) => setFilename(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="text-sm">Paste text (for vocab, use &quot;sv,rmn&quot; per line or &quot;Swedish: X = Romani: Y&quot;)</label>
          <Textarea value={rawText} onChange={(e) => setRawText(e.target.value)} rows={10} />
          <div className="mt-2 flex items-center gap-3 text-sm">
            <input
              type="file"
              accept=".txt,.csv,.tsv,.md,.json,.pdf,.docx"
              onChange={(e) => handleFile(e.target.files?.[0] || null)}
            />
            {(file || rawText) && (
              <span className="text-gray-600">
                {filename || (file ? file.name : 'pasted-text')} · {rawText ? `${rawText.length} chars` : file ? `${Math.round(file.size / 1024)} KB` : ''}
              </span>
            )}
          </div>
          {!rawText.trim() && !file && (
            <div className="mt-1 text-xs text-gray-500">Add some text above or choose a .txt/.csv/.md/.pdf/.docx file.</div>
          )}
        </div>
        <div className="flex gap-3">
          <Button onClick={startIngestion} disabled={isLoading || (!rawText.trim() && !file)}>
            {isLoading ? 'Preparing…' : 'Prepare preview'}
          </Button>
          {stage === 'preview' && (
            <Button onClick={approveAndEmbed} disabled={isLoading}>
              {isLoading ? 'Embedding…' : 'Approve & Embed'}
            </Button>
          )}
          <Button variant="secondary" onClick={loadHistory}>Refresh history</Button>
        </div>
        {lastError && (
          <div className="text-sm text-red-600">{lastError}</div>
        )}
      </Card>

      {stage === 'preview' && prepared && (
        <Card className="p-4 space-y-3">
          <div className="text-sm font-medium">Preview prepared material</div>
          {prepareMeta && (
            <div className="text-sm text-gray-700">
              <div><span className="font-medium">Domain:</span> {prepareMeta.domain ?? '—'}</div>
              <div><span className="font-medium">Tags:</span> {prepareMeta.tags.length ? prepareMeta.tags.join(', ') : '—'}</div>
            </div>
          )}
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
                  <div className="font-medium mb-1">Grammar ({prepared.grammarChunks.length})</div>
                  <ul className="space-y-1 max-h-56 overflow-auto pr-2">
                    {prepared.grammarChunks.slice(0, 50).map((g, i) => (
                      <li key={i} className="p-2 border rounded bg-white flex justify-between items-start">
                        <div className="flex-1">
                          <GrammarItemEditor index={i} value={g} prepared={prepared} setPrepared={setPrepared} />
                        </div>
                        <div className="ml-2">
                          <button className="text-sm text-red-600" onClick={() => {
                            const copy = { ...prepared, grammarChunks: prepared.grammarChunks.filter((_, idx) => idx !== i) };
                            setPrepared(copy);
                          }}>Delete</button>
                        </div>
                      </li>
                    ))}
                  </ul>
            </div>
            <div>
              <div className="font-medium mb-1">Vocabulary ({prepared.vocabPairs.length})</div>
              <ul className="space-y-1 max-h-56 overflow-auto pr-2">
                {prepared.vocabPairs.slice(0, 100).map((p, i) => (
                  <li key={i} className="p-2 border rounded bg-white flex justify-between items-start">
                    <div className="flex-1">
                      <VocabItemEditor index={i} pair={p} prepared={prepared} setPrepared={setPrepared} />
                    </div>
                    <div className="ml-2">
                      <button className="text-sm text-red-600" onClick={() => {
                        const copy = { ...prepared, vocabPairs: prepared.vocabPairs.filter((_, idx) => idx !== i) };
                        setPrepared(copy);
                      }}>Delete</button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="font-medium mb-1">Parallel pairs ({prepared.parallelPairs.length})</div>
              <ul className="space-y-1 max-h-56 overflow-auto pr-2">
                {prepared.parallelPairs.slice(0, 100).map((p, i) => (
                  <li key={i} className="p-2 border rounded bg-white flex justify-between items-start">
                    <div className="flex-1">
                      <ParallelItemEditor index={i} pair={p} prepared={prepared} setPrepared={setPrepared} />
                    </div>
                    <div className="ml-2">
                      <button className="text-sm text-red-600" onClick={() => {
                        const copy = { ...prepared, parallelPairs: prepared.parallelPairs.filter((_, idx) => idx !== i) };
                        setPrepared(copy);
                      }}>Delete</button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="text-xs text-gray-500">Showing a preview sample. Approve to embed all prepared items.</div>
        </Card>
      )}

  {jobId && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Job: {jobId}</div>
              <div className="text-sm text-gray-600">Status: {status?.status} · Progress: {status?.progress ?? 0}% ({status?.processedItems ?? 0}/{status?.totalItems ?? 0})</div>
            </div>
          </div>
          {!!status?.sample?.length && (
            <div className="mt-3 space-y-1">
              <div className="text-sm font-medium">Recent items</div>
              <ul className="text-sm list-disc pl-6">
                {status.sample.map((s) => (
                  <li key={s.id} className="truncate">{s.preview}</li>
                ))}
              </ul>
            </div>
          )}
          {status?.errorMessage && (
            <div className="mt-3 text-sm text-red-600">Error: {status.errorMessage}</div>
          )}
        </Card>
      )}

      <Card className="p-4">
        <div className="text-sm font-medium mb-2">Recent jobs</div>
        <div className="grid gap-2">
          {history.map((h) => (
            <div key={h.id} className="border rounded p-2 text-sm flex justify-between">
              <div className="truncate">
                <div className="font-medium">{h.filename || h.sourceType}</div>
                <div className="text-gray-600">{h.status} · {h.processedItems}/{h.totalItems} · {h.dialect || '—'}</div>
              </div>
              <div className="text-gray-500">{new Date(h.createdAt).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
