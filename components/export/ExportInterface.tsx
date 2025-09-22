import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export function ExportInterface({ totalTranslations, qualityBreakdown }: { totalTranslations: number; qualityBreakdown: Array<{ qualityScore: string; _count: { id: number } }> }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="py-4">
          <div className="text-lg">Totalt godkända översättningar: <strong>{totalTranslations}</strong></div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-4">
          <div className="font-semibold mb-2">Kvalitetsfördelning</div>
          <ul className="list-disc pl-6">
            {qualityBreakdown.map((q) => (
              <li key={q.qualityScore}>Kvalitet {q.qualityScore}: {q._count.id}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="py-4">
          <div className="flex gap-3">
            <a href="/api/export?format=jsonl" className="px-3 py-2 rounded bg-blue-600 text-white text-sm">Ladda ner JSONL</a>
            <a href="/api/export?format=csv" className="px-3 py-2 rounded bg-slate-700 text-white text-sm">Ladda ner CSV</a>
          </div>
          <div className="text-xs text-gray-500 mt-2">Inkluderar godkända poster med kvalitet C eller bättre. Lägg till &dialect=Lovari|Kelderash|Arli för att filtrera efter dialekt.</div>
        </CardContent>
      </Card>
    </div>
  );
}
