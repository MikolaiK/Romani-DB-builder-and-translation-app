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
  toast({ title: 'Connecting to Gemini 2.5…', description: 'Attempting primary model' });
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
        toast({ title: 'Connected to Gemini 2.5', description: `Succeeded after ${result.attempts} attempts` });
      } else {
        toast({ title: 'Connected to Gemini 2.5' });
      }
      setTranslation(result);
      setCorrection(result.translatedText);
    } catch (error) {
      toast({
        title: 'Translation Error',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
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
        title: 'Correction Saved',
        description: 'Thank you for improving the translation!',
      });

      // Reset form
      setSourceText('');
      setTranslation(null);
      setCorrection('');
      setContext('');
      setDomain('');
    } catch (error) {
      toast({
        title: 'Save Error',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Swedish to Romani Translation</h1>
        <p className="text-gray-600">AI-powered translation with expert correction workflow</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_480px_320px] gap-6">
        {/* Input Column */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>Swedish Input</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Enter Swedish text to translate..."
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              rows={6}
              className="resize-none"
            />
            
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Context (optional)"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
              
              <select
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">Select domain (optional)</option>
                <option value="conversation">Conversation</option>
                <option value="medical">Medical</option>
                <option value="legal">Legal</option>
                <option value="technical">Technical</option>
                <option value="literature">Literature</option>
              </select>
            </div>

            <Button onClick={handleTranslate} disabled={!sourceText.trim() || isTranslating} className="w-full">
              {isTranslating ? (<>
                <Icon.spinner />
                Translating...
              </>) : (<>
                <Icon.search />
                Translate
              </>)}
            </Button>
            {translation && (
              <Button onClick={() => setShowDebug(!showDebug)} variant="outline" className="w-full mt-2">
                {showDebug ? 'Hide AI Context' : 'Show AI Context'}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* AI Output Column */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>AI Translation</span>
        {translation && (
                <Badge variant={translation.confidence > 80 ? 'default' : 'secondary'}>
          {translation.confidence}% confidence
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
                    <strong>Explanation:</strong> {translation.explanation}
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
                    <h3 className="font-bold mb-2">AI Context Debug</h3>
                    <details className="mb-2">
                      <summary className="cursor-pointer">Prompt Sent to AI</summary>
                      <pre className="mt-2 p-2 bg-white rounded text-xs overflow-auto max-h-40">
                        {translation.debugInfo.prompt}
                      </pre>
                    </details>
                    <details className="mb-2">
                      <summary className="cursor-pointer">Retrieval Parameters</summary>
                      <pre className="mt-2 p-2 bg-white rounded text-xs">
                        {JSON.stringify(translation.debugInfo.retrievalParams, null, 2)}
                      </pre>
                    </details>
                    <details>
                      <summary className="cursor-pointer">Examples with Source Details</summary>
                      <div className="mt-2 space-y-2">
                        {translation.debugInfo.examplesWithSource.map((example, idx) => (
                          <div key={idx} className="p-2 bg-white rounded text-xs">
                            <div><strong>Table:</strong> {example.tableName}</div>
                            <div><strong>Source:</strong> {example.translation.sourceText}</div>
                            <div><strong>Target:</strong> {example.translation.targetText}</div>
                            <div><strong>Score:</strong> {example.scoringDetails.finalScore.toFixed(3)}</div>
                            <details>
                              <summary className="cursor-pointer">Scoring Details</summary>
                              <div className="ml-2">
                                <div>Semantic: {example.scoringDetails.semanticScore.toFixed(3)}</div>
                                <div>Lexical: {example.scoringDetails.lexicalScore.toFixed(3)}</div>
                                <div>Exact Match Boost: {example.scoringDetails.exactMatchBoost.toFixed(3)}</div>
                                <div>Quality Boost: {example.scoringDetails.qualityBoost.toFixed(3)}</div>
                                <div>Corrected Boost: {example.scoringDetails.correctedBoost.toFixed(3)}</div>
                                <div>Recency Boost: {example.scoringDetails.recencyBoost.toFixed(3)}</div>
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
              <div className="text-gray-40 text-center py-8">Translation will appear here</div>
            )}
          </CardContent>
        </Card>

        {/* Expert Correction Column */}
        <Card>
          <CardHeader>
            <CardTitle>Expert Correction</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Correct the translation if needed..."
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
                  Saving...
                </>) : (<>
                  <Icon.check />
                  Save Correction
                </>)}
              </Button>
              
              {translation && correction === translation.translatedText && (
                <Button onClick={handleSaveCorrection} variant="outline" disabled={isSaving}>
                  <Icon.check />
                  Approve
                </Button>
              )}
            </div>

            {translation && (
              <div className="text-xs text-gray-500">
                {correction === translation.translatedText 
                  ? "Click 'Approve' if the translation is correct, or edit it first."
                  : "You've made changes. Click 'Save Correction' to help improve the AI."}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
