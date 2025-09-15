import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export function ExportInterface({ totalTranslations, qualityBreakdown }: { totalTranslations: number; qualityBreakdown: Array<{ qualityScore: string; _count: { id: number } }> }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="py-4">
          <div className="text-lg">Total approved translations: <strong>{totalTranslations}</strong></div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-4">
          <div className="font-semibold mb-2">Quality breakdown</div>
          <ul className="list-disc pl-6">
            {qualityBreakdown.map((q) => (
              <li key={q.qualityScore}>Quality {q.qualityScore}: {q._count.id}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="py-4">
          <div className="flex gap-3">
            <a href="/api/export?format=jsonl" className="px-3 py-2 rounded bg-blue-600 text-white text-sm">Download JSONL</a>
            <a href="/api/export?format=csv" className="px-3 py-2 rounded bg-slate-700 text-white text-sm">Download CSV</a>
          </div>
          <div className="text-xs text-gray-500 mt-2">Includes approved entries with quality C or better. Add &dialect=Lovari|Kelderash|Arli to filter by dialect.</div>
        </CardContent>
      </Card>
    </div>
  );
}
