"use client";

import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import type { TranslationMemory } from '@prisma/client';

export function ReviewList({ translations }: { translations: TranslationMemory[] }) {
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [batchScore, setBatchScore] = useState<'A'|'B'|'C'|'D'|''>('');
  const [inlineEdit, setInlineEdit] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [itemScore, setItemScore] = useState<Record<string, 'A'|'B'|'C'|'D'|undefined>>({});

  const allSelected = useMemo(() =>
    translations.length > 0 && translations.every(t => selected[t.id]), [translations, selected]
  );
  const anySelected = useMemo(() => translations.some(t => selected[t.id]), [translations, selected]);

  const toggleAll = () => {
    if (allSelected) {
      setSelected({});
    } else {
      const next: Record<string, boolean> = {};
      translations.forEach(t => next[t.id] = true);
      setSelected(next);
    }
  };

  const selectedIds = useMemo(() => translations.filter(t => selected[t.id]).map(t => t.id), [translations, selected]);

  const runBatch = async (action: 'APPROVE'|'REJECT'|'NEEDS_REVISION') => {
    if (selectedIds.length === 0) return;
    await fetch('/api/review/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: selectedIds, action, qualityScore: batchScore || undefined }),
    });
    window.location.reload();
  };

  const saveBatchScores = async () => {
    if (selectedIds.length === 0) return;
    // Build items with individual scores if set, otherwise use batchScore if provided
    const items = selectedIds
      .map(id => ({ id, qualityScore: itemScore[id] || (batchScore || undefined) }))
      .filter((x): x is { id: string; qualityScore: 'A'|'B'|'C'|'D' } => !!x.qualityScore);
    if (items.length === 0) return;
    await fetch('/api/review/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    });
    window.location.reload();
  };

  const saveInline = async (id: string) => {
    const text = inlineEdit[id];
    if (!text?.trim()) return;
    await fetch('/api/review/correct', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, correctedText: text.trim(), qualityScore: itemScore[id] || undefined }),
    });
    window.location.reload();
  };

  if (!translations.length) {
    return <div className="text-gray-500">Inga väntande granskningar.</div>;
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3 p-2 bg-gray-50 border rounded">
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={allSelected} onChange={toggleAll} />
          Välj alla
        </label>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-600">Batchbetyg:</span>
          {(['A','B','C','D'] as const).map(s => (
            <button
              key={s}
              onClick={() => setBatchScore(s)}
              className={`h-7 px-2 rounded border text-xs ${batchScore===s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >{s}</button>
          ))}
          <button onClick={() => setBatchScore('')} className="h-7 px-2 rounded border text-xs text-gray-600">Rensa</button>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button className="h-8 px-3 text-xs" onClick={saveBatchScores} disabled={!anySelected}>Spara</Button>
          <Button className="h-8 px-3 text-xs" variant="secondary" onClick={() => runBatch('REJECT')} disabled={!anySelected}>Avvisa</Button>
          <Button className="h-8 px-3 text-xs" variant="outline" onClick={() => runBatch('NEEDS_REVISION')} disabled={!anySelected}>Behöver revidering</Button>
        </div>
      </div>

      {translations.map((t) => (
        <Card key={t.id}>
          <CardContent className="p-2">
            <div className="grid md:grid-cols-6 gap-2 items-start">
              <div className="col-span-1">
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={!!selected[t.id]}
                    onChange={(e) => setSelected(prev => ({ ...prev, [t.id]: e.target.checked }))}
                  />
                  Välj
                </label>
                <div className="mt-1 text-[10px] uppercase text-gray-500">Källa</div>
                <div className="text-sm whitespace-normal break-words" title={t.sourceText}>{t.sourceText}</div>
              </div>
              <div className="col-span-2">
                <div className="text-[10px] uppercase text-gray-500">Mål</div>
                <div className="text-sm text-gray-800 whitespace-normal break-words" title={t.correctedText || t.targetText}>{t.correctedText || t.targetText}</div>
              </div>
              <div className="col-span-1 text-[11px] text-gray-600">
                <div>{t.domain || '—'} • K: {t.qualityScore}</div>
              </div>
              <div className="col-span-2">
                <div className="text-[10px] uppercase text-gray-500">Score</div>
                <div className="grid grid-cols-4 gap-2">
                  {(['A','B','C','D'] as const).map((s) => (
                    <div key={s} className="text-center">
                      <button
                        onClick={() => {
                          setItemScore(prev => ({ ...prev, [t.id]: prev[t.id] === s ? undefined : s }));
                          setSelected(prev => ({ ...prev, [t.id]: true }));
                        }}
                        className={`w-full h-8 rounded border text-xs ${itemScore[t.id]===s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white hover:bg-gray-50'}`}
                      >{s}</button>
                      <div className="mt-1 text-[10px] text-gray-500">
                        {s==='A'?'Utmärkt':s==='B'?'Bra':s==='C'?'Acceptabel':'Dålig'}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-1">
                  <button
                    className="text-xs text-blue-700 hover:underline"
                    onClick={() => setExpanded(prev => ({ ...prev, [t.id]: !prev[t.id] }))}
                  >{expanded[t.id] ? 'Dölj redigering' : 'Redigera översättning'}</button>
                </div>

                {expanded[t.id] && (
                  <>
                    <div className="mt-2">
                      <textarea
                        className="w-full border rounded p-2 text-sm"
                        rows={3}
                        value={inlineEdit[t.id] ?? (t.correctedText || t.targetText || '')}
                        onChange={(e) => setInlineEdit(prev => ({ ...prev, [t.id]: e.target.value }))}
                      />
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button className="h-8 px-3 text-xs" onClick={() => saveInline(t.id)}>Spara</Button>
                      <Button className="h-8 px-3 text-xs" variant="secondary" onClick={async () => {
                        const notes = prompt('Anledning till avvisning?') || '';
                        await fetch('/api/review', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ id: t.id, action: 'REJECT', notes, qualityScore: itemScore[t.id] || undefined }),
                        });
                        window.location.reload();
                      }}>Avvisa</Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
