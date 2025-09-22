'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
// simple inline icons to avoid external icon deps
const Icon = {
  spinner: () => <span className="mr-2 animate-spin">⏳</span>,
  search: () => <span className="mr-2">🔎</span>,
  check: () => <span className="mr-2">✔️</span>,
};
import { useToast } from '@/components/ui/use-toast';
import { useSettings } from '@/components/settings/SettingsProvider';

interface TranslationResult {
  translatedText: string;
  confidence: number;
  explanation?: string;
  modelUsed?: string;
  examplesUsed?: Array<{ sourceText: string; targetText: string; context?: string | null }>;
  attempts?: number;
  similarTranslations: Array<{
    sourceText: string;
    targetText: string;
    score: number;
    context?: string;
  }>;
  debugInfo?: {
    prompt: string;
    retrievalParams: {
      maxResults: number;
      domain?: string;
      dialect?: string;
    };
    examplesWithSource: Array<{
      translation: {
        id: string;
        sourceText: string;
        targetText: string;
        context?: string | null;
        domain?: string | null;
        dialect?: string | null;
      };
      tableName: string;
      scoringDetails: {
        semanticScore: number;
        lexicalScore: number;
        exactMatchBoost: number;
        qualityBoost: number;
        correctedBoost: number;
        recencyBoost: number;
        finalScore: number;
      };
    }>;
  };
}

export function TranslationInterface() {
  const [sourceText, setSourceText] = useState('');
  const [translation, setTranslation] = useState<TranslationResult | null>(null);
  const [correction, setCorrection] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [context, setContext] = useState('');
  const [domain, setDomain] = useState('');
  const [showDebug, setShowDebug] = useState(false);
  
  const { toast } = useToast();
  const { dialect, style } = useSettings();

  const handleTranslate = async () => {
    if (!sourceText.trim()) return;

    setIsTranslating(true);
    try {
  toast({ title: 'Ansluter till Gemini 2.5…', description: 'Försöker primär modell' });
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceText: sourceText.trim(),
          context: context.trim() || undefined,
          domain: domain.trim() || undefined,
          dialect: dialect || undefined,
          style: style || undefined,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        const attempts = err?.attempts ? ` (attempts: ${err.attempts})` : '';
        throw new Error(err?.error || `Translation failed${attempts}`);
      }

      const result = await response.json();
      if (result?.attempts > 1) {
        toast({ title: 'Ansluten till Gemini 2.5', description: `Lyckades efter ${result.attempts} försök` });
      } else {
        toast({ title: 'Ansluten till Gemini 2.5' });
      }
      setTranslation(result);
      setCorrection(result.translatedText);
    } catch (error) {
      toast({
        title: 'Översättningsfel',
        description: error instanceof Error ? error.message : 'Okänt fel uppstod',
        variant: 'destructive',
      });
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSaveCorrection = async () => {
    if (!translation || !correction.trim()) return;

    setIsSaving(true);
    try {
      const response = await fetch('/api/correct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceText: sourceText.trim(),
          originalTranslation: translation.translatedText,
          correctedTranslation: correction.trim(),
          context: context.trim() || undefined,
          domain: domain.trim() || undefined,
          dialect: dialect || undefined,
          style: style || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save correction');
      }

      toast({
        title: 'Korrigering sparad',
        description: 'Tack för att du förbättrar översättningen!',
      });

      // Reset form
      setSourceText('');
      setTranslation(null);
      setCorrection('');
      setContext('');
      setDomain('');
    } catch (error) {
      toast({
        title: 'Spara fel',
        description: error instanceof Error ? error.message : 'Okänt fel uppstod',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Översättning från svenska till romani</h1>
        <p className="text-gray-600">En självlärande översättningsassistent</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_480px_320px] gap-6">
        {/* Input Column */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>Svensk inmatning</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Ange svensk text att översätta..."
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              rows={6}
              className="resize-none"
            />
            
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Kontext (valfri)"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
              
              <select
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">Välj domän (valfri)</option>
                <option value="conversation">Samtal</option>
                <option value="medical">Medicinsk</option>
                <option value="legal">Juridisk</option>
                <option value="technical">Teknisk</option>
                <option value="literature">Litteratur</option>
              </select>
            </div>

            <Button onClick={handleTranslate} disabled={!sourceText.trim() || isTranslating} className="w-full">
              {isTranslating ? (<>
                <Icon.spinner />
                Översätter...
              </>) : (<>
                <Icon.search />
                Översätt
              </>)}
            </Button>
            {translation && (
              <Button onClick={() => setShowDebug(!showDebug)} variant="outline" className="w-full mt-2">
                {showDebug ? 'Dölj AI-kontext' : 'Visa AI-kontext'}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* AI Output Column */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>AI-översättning</span>
        {translation && (
                <Badge variant={translation.confidence > 80 ? 'default' : 'secondary'}>
          {translation.confidence}% konfidens
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {translation ? (
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-lg">{translation.translatedText}</p>
                </div>
                
                <div className="text-xs text-gray-500 flex items-center gap-2">
                  {translation.modelUsed && <Badge variant="secondary">{translation.modelUsed}</Badge>}
                </div>

                {translation.explanation && (
                  <div className="text-sm text-gray-600">
                    <strong>Förklaring:</strong> {translation.explanation}
                  </div>
                )}

                {/* {translation.examplesUsed && translation.examplesUsed.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Guidance examples used:</h4>
                    {translation.examplesUsed.slice(0, 3).map((ex, idx) => (
                      <div key={idx} className="text-sm p-2 bg-amber-50 rounded border-l-2 border-amber-200">
                        <div><strong>Swedish:</strong> {ex.sourceText}</div>
                        <div><strong>Romani:</strong> {ex.targetText}</div>
                        {ex.context && <div className="text-xs text-gray-500">{ex.context}</div>}
                      </div>
                    ))}
                  </div>
                )} */}

                {/* {translation.similarTranslations.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Similar translations:</h4>
                    {translation.similarTranslations.slice(0, 3).map((similar, index) => (
                      <div key={index} className="text-sm p-2 bg-blue-50 rounded border-l-2 border-blue-200">
                        <div><strong>Swedish:</strong> {similar.sourceText}</div>
                        <div><strong>Romani:</strong> {similar.targetText}</div>
                        <div className="text-xs text-gray-500">
                          Score: {(similar.score * 100).toFixed(1)}%
                          {similar.context && ` • ${similar.context}`}
                        </div>
                      </div>
                    ))}
                  </div>
                )} */}
                {showDebug && translation?.debugInfo && (
                  <div className="mt-4 p-4 bg-gray-100 rounded-lg">
                    <h3 className="font-bold mb-2">AI-kontext felsökning</h3>
                    <details className="mb-2">
                      <summary className="cursor-pointer">Prompt skickad till AI</summary>
                      <pre className="mt-2 p-2 bg-white rounded text-xs overflow-auto max-h-40">
                        {translation.debugInfo.prompt}
                      </pre>
                    </details>
                    <details className="mb-2">
                      <summary className="cursor-pointer">Hämtnings parametrar</summary>
                      <pre className="mt-2 p-2 bg-white rounded text-xs">
                        {JSON.stringify(translation.debugInfo.retrievalParams, null, 2)}
                      </pre>
                    </details>
                    <details>
                      <summary className="cursor-pointer">Exempel med käll detaljer</summary>
                      <div className="mt-2 space-y-2">
                        {translation.debugInfo.examplesWithSource.map((example, idx) => (
                          <div key={idx} className="p-2 bg-white rounded text-xs">
                            <div><strong>Tabell:</strong> {example.tableName}</div>
                            <div><strong>Källa:</strong> {example.translation.sourceText}</div>
                            <div><strong>Mål:</strong> {example.translation.targetText}</div>
                            <div><strong>Betyg:</strong> {example.scoringDetails.finalScore.toFixed(3)}</div>
                            <details>
                              <summary className="cursor-pointer">Betygsdetaljer</summary>
                              <div className="ml-2">
                                <div>Semantisk: {example.scoringDetails.semanticScore.toFixed(3)}</div>
                                <div>Lexikal: {example.scoringDetails.lexicalScore.toFixed(3)}</div>
                                <div>Exakt match boost: {example.scoringDetails.exactMatchBoost.toFixed(3)}</div>
                                <div>Kvalitetsboost: {example.scoringDetails.qualityBoost.toFixed(3)}</div>
                                <div>Korrigeringsboost: {example.scoringDetails.correctedBoost.toFixed(3)}</div>
                                <div>Aktualitetsboost: {example.scoringDetails.recencyBoost.toFixed(3)}</div>
                              </div>
                            </details>
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-gray-40 text-center py-8">Översättning visas här</div>
            )}
          </CardContent>
        </Card>

        {/* Expert Correction Column */}
        <Card>
          <CardHeader>
            <CardTitle>Expertkorrigering</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Korrigera översättningen vid behov..."
              value={correction}
              onChange={(e) => setCorrection(e.target.value)}
              rows={6}
              className="resize-none"
              disabled={!translation}
            />

            <div className="flex gap-2">
              <Button
                onClick={handleSaveCorrection}
                disabled={!translation || !correction.trim() || isSaving}
                className="flex-1"
                variant="default"
              >
                {isSaving ? (<>
                  <Icon.spinner />
                  Sparar...
                </>) : (<>
                  <Icon.check />
                  Spara korrigering
                </>)}
              </Button>
              
              {translation && correction === translation.translatedText && (
                <Button onClick={handleSaveCorrection} variant="outline" disabled={isSaving}>
                  <Icon.check />
                  Godkänn
                </Button>
              )}
            </div>

            {translation && (
              <div className="text-xs text-gray-500">
                {correction === translation.translatedText 
                  ? "Klicka 'Godkänn' om översättningen är korrekt, eller redigera först."
                  : "Du har gjort ändringar. Klicka 'Spara korrigering' för att hjälpa till att förbättra AI:n."}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
