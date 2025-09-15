# Romani Translation AI - Development Specification

## 🎯 **Project Overview**

**Advanced AI-powered Swedish to Romani translation platform with expert-in-the-loop workflow and intelligent feedback loop for continuous improvement of translation quality.**

This development specification focuses on building a sophisticated, fully-functional local application without production operational complexity.

### **Core Architecture**
- **Expert-in-the-loop RAG pipeline**: AI suggestions → Expert corrections → Intelligent feedback loop
- **Hybrid search system**: Semantic (embeddings) + lexical (keywords) + quality scoring
- **Three-column layout**: Input → AI Output → Expert Correction
- **Advanced embedding system**: Google gemini-embedding-001 with 1536-dimension vectors
- **Quality-aware learning**: Tracks correction quality and adjusts retrieval accordingly
- **Intelligent feedback loop**: AI analyzer generates learning insights from expert corrections

### **Technical Stack**
- **Frontend**: Next.js 15.5 with App Router, React 19, TypeScript 5.5
- **Database**: PostgreSQL 16 with pgvector 0.7.0 extension
- **AI/ML**: Vercel AI SDK 3.3.x with Google gemini-embedding-001
- **Authentication**: Clerk 5.3.x (simple setup)
- **Styling**: Tailwind CSS with shadcn/ui components
- **ORM**: Prisma 5.22.0

---

## 🏗️ **Project Structure**

```
romani-trans-app/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Main translation interface
│   ├── review/                  # Review workflow pages
│   ├── export/                  # Dataset export interface
│   └── api/                     # API endpoints
│       ├── translate/           # Translation API
│       ├── correct/             # Correction API
│       ├── review/              # Review API
│       └── export/              # Export API
├── components/                   # React components
│   ├── ui/                      # shadcn/ui components
│   ├── translation/             # Translation interface
│   ├── review/                  # Review components
│   └── export/                  # Export components
├── lib/                         # Core business logic
│   ├── ai.ts                    # AI provider integration
│   ├── embedding.ts             # Embedding generation
│   ├── retrieval.ts             # Hybrid search system
│   ├── db.ts                    # Database client
│   └── config.ts                # Configuration
├── prisma/                      # Database schema and migrations
│   ├── schema.prisma            # Database schema
│   └── migrations/              # Migration files
├── types/                       # TypeScript definitions
├── docker-compose.yml           # Local development database
├── package.json                 # Dependencies and scripts
├── next.config.js               # Next.js configuration
├── tailwind.config.js           # Tailwind configuration
└── .env.example                 # Environment variables template
```

---

## 📦 **Package Configuration**

*File: `package.json`*

```json
{
  "name": "romani-trans-app",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio",
    "db:seed": "tsx prisma/seed.ts",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:embedding": "tsx -e \"import('./lib/embedding.js').then(m => m.testEmbedding())\"",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@ai-sdk/google": "^0.0.50",
    "@clerk/nextjs": "^5.3.0",
    "@prisma/client": "^5.18.0",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-label": "^2.0.2",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-slot": "^1.0.2",
    "@radix-ui/react-toast": "^1.1.5",
    "ai": "^3.3.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "lucide-react": "^0.263.1",
    "next": "15.5.0",
    "react": "19.0.0",
    "react-dom": "19.0.0",
    "tailwind-merge": "^1.14.0",
    "tailwindcss-animate": "^1.0.7"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "eslint": "^8",
    "eslint-config-next": "15.5.0",
    "jest": "^29.7.0",
    "postcss": "^8",
    "prisma": "^5.18.0",
    "tailwindcss": "^3.4.1",
    "tsx": "^4.0.0",
    "typescript": "^5.5"
  }
}
```

---

## 🐳 **Local Development Setup**

*File: `docker-compose.yml`*

```yaml
version: '3.8'

services:
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: romani_ai
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    command: >
      postgres -c shared_preload_libraries=vector

volumes:
  postgres_data:
```

*File: `.env.example`*

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/romani_ai"

# AI Provider
GOOGLE_GENERATIVE_AI_API_KEY="your_google_ai_key_here"

# Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="your_clerk_publishable_key"
CLERK_SECRET_KEY="your_clerk_secret_key"

# Development
NODE_ENV="development"
```

---

## 🗄️ **Database Schema**

*File: `prisma/schema.prisma`*

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model TranslationMemory {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Text content
  sourceText     String
  targetText     String
  correctedText  String?
  
  // Context and metadata
  context        String?
  domain         String?  // e.g., "medical", "legal", "casual"
  
  // Quality tracking
  qualityScore   QualityScore @default(C)
  reviewStatus   ReviewStatus @default(PENDING)
  reviewNotes    String?
  reviewedAt     DateTime?
  reviewedBy     String?
  
    // Embeddings for hybrid search
    embedding  Unsupported("vector(1536)")?
  
  // Relationships
  corrections    Correction[]
  reviewItems    ReviewItem[]

  @@map("translation_memory")
}

model Correction {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())

  // What was corrected
  originalText   String
  correctedText  String
  correctionType CorrectionType
  explanation    String?
  
  // Quality assessment
  severity       CorrectionSeverity
  
  // Relationships
  translationId  String
  translation    TranslationMemory @relation(fields: [translationId], references: [id], onDelete: Cascade)

  @@map("corrections")
}

model ReviewItem {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Review details
  status        ReviewStatus @default(PENDING)
  reviewerNotes String?
  reviewedAt    DateTime?
  reviewedBy    String?
  
  // Priority and assignment
  priority      Priority @default(MEDIUM)
  assignedTo    String?
  
  // Relationships
  translationId String
  translation   TranslationMemory @relation(fields: [translationId], references: [id], onDelete: Cascade)

  @@map("review_items")
}

model KnowledgeItem {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Content
  title       String
  content     String
  category    String?
  tags        String[] @default([])
  
  // Search and retrieval
  embedding   Unsupported("vector(1536)")?
  
  // Quality and usage
 qualityScore QualityScore @default(C)
  usageCount   Int          @default(0)
  lastUsed     DateTime?

  @@map("knowledge_items")
}

// Enums
enum QualityScore {
  A  // Excellent
  B  // Good
  C  // Acceptable
  D  // Poor
}

enum ReviewStatus {
  PENDING
  APPROVED
  REJECTED
  NEEDS_REVISION
}

enum CorrectionType {
  GRAMMAR
  VOCABULARY
  STYLE
  CULTURAL
  FACTUAL
  OTHER
}

enum CorrectionSeverity {
  MINOR
  MODERATE
  MAJOR
  CRITICAL
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  URGENT
}
```

*File: `prisma/seed.ts`*

```typescript
import { PrismaClient, QualityScore } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create sample knowledge items
  await prisma.knowledgeItem.createMany({
    data: [
      {
        title: "Common Greetings",
        content: "Swedish: Hej = Romani: Baxt\nSwedish: Hej då = Romani: Te aves baxtalo",
        category: "greetings",
        tags: ["basic", "conversation"],
        qualityScore: QualityScore.A,
      },
      {
        title: "Family Terms",
        content: "Swedish: familj = Romani: familija\nSwedish: mamma = Romani: daj\nSwedish: pappa = Romani: dad",
        category: "family",
        tags: ["family", "relationships"],
        qualityScore: QualityScore.A,
      },
      {
        title: "Numbers 1-10",
        content: "1: ek, 2: duj, 3: trin, 4: štar, 5: pandž, 6: šov, 7: efta, 8: oxto, 9: inja, 10: deš",
        category: "numbers",
        tags: ["numbers", "basic"],
        qualityScore: QualityScore.B,
      },
    ],
  });

  // Create sample translation memory entries
  await prisma.translationMemory.createMany({
    data: [
      {
        sourceText: "Hej, hur mår du?",
        targetText: "Baxt, sar san?",
        context: "Casual greeting",
        domain: "conversation",
        qualityScore: QualityScore.A,
        reviewStatus: "APPROVED",
      },
      {
        sourceText: "Jag heter Anna",
        targetText: "Miro nav si Anna",
        context: "Introduction",
        domain: "conversation",
        qualityScore: QualityScore.B,
        reviewStatus: "APPROVED",
      },
      {
        sourceText: "Var kommer du ifrån?",
        targetText: "Kaj aves tu?",
        context: "Getting to know someone",
        domain: "conversation",
        qualityScore: QualityScore.B,
        reviewStatus: "PENDING",
      },
    ],
  });

  console.log('✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

---

## ⚙️ **Core Configuration**

*File: `lib/config.ts`*

```typescript
// Core application configuration
export const CONFIG = {
  // Embedding configuration
  EMBEDDING: {
    DIMENSION: 1536,
    MODEL_NAME: 'gemini-embedding-001',
    PROVIDER: 'google',
    BATCH_SIZE: 10,
    RATE_LIMIT_DELAY: 100, // ms between requests
  },
  
  // Database configuration
  DATABASE: {
    VECTOR_DIMENSION: 1536, // Must match EMBEDDING.DIMENSION
    POSTGRESQL_VERSION: '16',
    DOCKER_IMAGE: 'pgvector/pgvector:pg16',
  },
  
  // Retrieval configuration
  RETRIEVAL: {
    DEFAULT_ALPHA: 0.7, // Balance between semantic and lexical search
    MIN_LEXICAL_SCORE: 0.01,
    RECENCY_DECAY_DAYS: 365,
    QUALITY_BOOST_MAP: { A: 0.15, B: 0.05, C: 0.0, D: -0.1 },
    MAX_RESULTS: 10,
  },
  
  // Application limits
  LIMITS: {
    MAX_QUERY_LENGTH: 1000,
    MAX_CORRECTION_LENGTH: 2000,
    MIN_CORRECTION_LENGTH: 3,
  },
} as const;

export type AppConfig = typeof CONFIG;
```

*File: `lib/db.ts`*

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Database utilities
export async function connectDatabase() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

export async function disconnectDatabase() {
  await prisma.$disconnect();
}
```

---

## 🤖 **AI and Embedding System**

*File: `lib/ai.ts`*

```typescript
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { CONFIG } from './config';

// Initialize Google AI provider
const model = google('gemini-1.5-flash');

export interface TranslationRequest {
  sourceText: string;
  context?: string;
  domain?: string;
}

export interface TranslationResponse {
  translatedText: string;
  confidence: number;
  explanation?: string;
}

export async function translateText({
  sourceText,
  context,
  domain
}: TranslationRequest): Promise<TranslationResponse> {
  try {
    const prompt = buildTranslationPrompt(sourceText, context, domain);
    
    const { text } = await generateText({
      model,
      prompt,
      maxTokens: 500,
      temperature: 0.3,
    });

    // Parse the response to extract translation and confidence
    const response = parseTranslationResponse(text);
    
    return response;
  } catch (error) {
    console.error('Translation failed:', error);
    throw new Error(`Translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function buildTranslationPrompt(text: string, context?: string, domain?: string): string {
  return `
You are an expert Swedish to Romani translator. Translate the following Swedish text to Romani.

Swedish text: "${text}"
${context ? `Context: ${context}` : ''}
${domain ? `Domain: ${domain}` : ''}

Please provide:
1. The Romani translation
2. A confidence score (0-100)
3. Brief explanation if needed

Format your response as:
Translation: [romani text]
Confidence: [0-100]
Explanation: [brief explanation if needed]
`.trim();
}

function parseTranslationResponse(text: string): TranslationResponse {
  const lines = text.split('\n');
  let translatedText = '';
  let confidence = 80; // default
  let explanation = '';

  for (const line of lines) {
    if (line.startsWith('Translation:')) {
      translatedText = line.replace('Translation:', '').trim();
    } else if (line.startsWith('Confidence:')) {
      const confidenceStr = line.replace('Confidence:', '').trim();
      confidence = parseInt(confidenceStr) || 80;
    } else if (line.startsWith('Explanation:')) {
      explanation = line.replace('Explanation:', '').trim();
    }
  }

  return {
    translatedText: translatedText || text.trim(),
    confidence,
    explanation: explanation || undefined,
  };
}

export async function testAIConnection(): Promise<boolean> {
  try {
    await translateText({ sourceText: "Hej" });
    console.log('✅ AI connection test passed');
    return true;
  } catch (error) {
    console.error('❌ AI connection test failed:', error);
    return false;
  }
}
```

*File: `lib/embedding.ts`*

```typescript
import { google } from '@ai-sdk/google';
import { embed } from 'ai';
import { CONFIG } from './config';

// Initialize embedding provider
# Initialize embedding provider
const embeddingModel = google('gemini-embedding-001');

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    // Clean and validate input
    const cleanText = text.trim().replace(/\s+/g, ' ');
    
    if (!cleanText) {
      throw new Error('Empty text provided for embedding');
    }

    if (cleanText.length > CONFIG.LIMITS.MAX_QUERY_LENGTH) {
      throw new Error(`Text too long: ${cleanText.length} > ${CONFIG.LIMITS.MAX_QUERY_LENGTH}`);
    }

    // Generate embedding using Vercel AI SDK
    const { embedding } = await embed({
      model: embeddingModel,
      value: cleanText,
    });
    
    // Validate dimension
    if (!embedding || embedding.length !== CONFIG.EMBEDDING.DIMENSION) {
      throw new Error(
        `Invalid embedding dimension: expected ${CONFIG.EMBEDDING.DIMENSION}, got ${embedding?.length || 0}`
      );
    }
    
    return embedding;
  } catch (error) {
    console.error('Embedding generation failed:', error);
    throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function generateEmbeddingBatch(texts: string[]): Promise<number[][]> {
  const results: number[][] = [];
  
  for (let i = 0; i < texts.length; i += CONFIG.EMBEDDING.BATCH_SIZE) {
    const batch = texts.slice(i, i + CONFIG.EMBEDDING.BATCH_SIZE);
    const batchPromises = batch.map(text => generateEmbedding(text));
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Rate limiting
    if (i + CONFIG.EMBEDDING.BATCH_SIZE < texts.length) {
      await new Promise(resolve => setTimeout(resolve, CONFIG.EMBEDDING.RATE_LIMIT_DELAY));
    }
  }
  
  return results;
}

export async function testEmbedding(): Promise<void> {
  try {
    console.log('🧪 Testing embedding generation...');
    
    const testText = 'Hej, hur mår du?';
    const embedding = await generateEmbedding(testText);
    
    console.log(`✅ Generated ${embedding.length}D embedding for: "${testText}"`);
    console.log(`   First 5 values: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);
    
    if (embedding.length !== CONFIG.EMBEDDING.DIMENSION) {
      throw new Error(`Dimension mismatch: ${embedding.length} !== ${CONFIG.EMBEDDING.DIMENSION}`);
    }
    
    console.log('✅ Embedding test passed');
  } catch (error) {
    console.error('❌ Embedding test failed:', error);
    throw error;
  }
}
```

---

## 🔍 **Hybrid Search and Retrieval System**

*File: `lib/retrieval.ts`*

```typescript
import { prisma } from './db';
import { generateEmbedding } from './embedding';
import { CONFIG } from './config';
import { QualityScore, TranslationMemory } from '@prisma/client';

export interface SearchResult {
  translation: TranslationMemory;
  score: number;
  semanticScore: number;
  lexicalScore: number;
  qualityBoost: number;
  recencyBoost: number;
}

export interface SearchOptions {
  alpha?: number; // Balance between semantic and lexical (0-1)
  maxResults?: number;
  minScore?: number;
  domain?: string;
}

export async function hybridSearch(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const {
    alpha = CONFIG.RETRIEVAL.DEFAULT_ALPHA,
    maxResults = CONFIG.RETRIEVAL.MAX_RESULTS,
    minScore = 0.1,
    domain
  } = options;

  try {
    console.log(`🔍 Searching for: "${query}" (alpha: ${alpha})`);

    // Generate query embedding
    const queryEmbedding = await generateEmbedding(query);
    
    // Build SQL query with both semantic and lexical search
    const searchQuery = `
      SELECT 
        tm.*,
        -- Semantic similarity (cosine distance)
        (1 - (tm.embedding <=> $1::vector)) as semantic_score,
        -- Lexical similarity (trigram similarity)
        (
          similarity(tm.source_text, $2) + 
          similarity(tm.target_text, $2) + 
          COALESCE(similarity(tm.context, $2), 0)
        ) / 3 as lexical_score,
        -- Quality boost based on quality score
        CASE tm.quality_score
          WHEN 'A' THEN ${CONFIG.RETRIEVAL.QUALITY_BOOST_MAP.A}
          WHEN 'B' THEN ${CONFIG.RETRIEVAL.QUALITY_BOOST_MAP.B}
          WHEN 'C' THEN ${CONFIG.RETRIEVAL.QUALITY_BOOST_MAP.C}
          WHEN 'D' THEN ${CONFIG.RETRIEVAL.QUALITY_BOOST_MAP.D}
          ELSE 0
        END as quality_boost,
        -- Recency boost (decay over time)
        GREATEST(0, 1 - (EXTRACT(days FROM NOW() - tm.created_at) / ${CONFIG.RETRIEVAL.RECENCY_DECAY_DAYS})) as recency_boost
      FROM translation_memory tm
      WHERE 
        tm.embedding IS NOT NULL
        AND tm.review_status = 'APPROVED'
        ${domain ? 'AND tm.domain = $3' : ''}
        AND (
          (1 - (tm.embedding <=> $1::vector)) > 0.1
          OR similarity(tm.source_text, $2) > ${CONFIG.RETRIEVAL.MIN_LEXICAL_SCORE}
        )
      ORDER BY 
        (
          ${alpha} * (1 - (tm.embedding <=> $1::vector)) +
          ${1 - alpha} * (
            (similarity(tm.source_text, $2) + similarity(tm.target_text, $2) + COALESCE(similarity(tm.context, $2), 0)) / 3
          ) +
          CASE tm.quality_score
            WHEN 'A' THEN ${CONFIG.RETRIEVAL.QUALITY_BOOST_MAP.A}
            WHEN 'B' THEN ${CONFIG.RETRIEVAL.QUALITY_BOOST_MAP.B}
            WHEN 'C' THEN ${CONFIG.RETRIEVAL.QUALITY_BOOST_MAP.C}
            WHEN 'D' THEN ${CONFIG.RETRIEVAL.QUALITY_BOOST_MAP.D}
            ELSE 0
          END +
          GREATEST(0, 1 - (EXTRACT(days FROM NOW() - tm.created_at) / ${CONFIG.RETRIEVAL.RECENCY_DECAY_DAYS})) * 0.1
        ) DESC
      LIMIT $${domain ? '4' : '3'}
    `;

    const params = [
      JSON.stringify(queryEmbedding),
      query,
      ...(domain ? [domain] : [])
    ];

    const rawResults = await prisma.$queryRawUnsafe(searchQuery, ...params) as any[];

    // Transform raw results
    const results: SearchResult[] = rawResults
      .map(row => {
        const semanticScore = parseFloat(row.semantic_score) || 0;
        const lexicalScore = parseFloat(row.lexical_score) || 0;
        const qualityBoost = parseFloat(row.quality_boost) || 0;
        const recencyBoost = parseFloat(row.recency_boost) || 0;

        const finalScore = alpha * semanticScore + (1 - alpha) * lexicalScore + qualityBoost + recencyBoost * 0.1;

        return {
          translation: {
            id: row.id,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            sourceText: row.source_text,
            targetText: row.target_text,
            correctedText: row.corrected_text,
            context: row.context,
            domain: row.domain,
            qualityScore: row.quality_score,
            reviewStatus: row.review_status,
            reviewNotes: row.review_notes,
            reviewedAt: row.reviewed_at,
            reviewedBy: row.reviewed_by,
            sourceEmbedding: null, // Don't return embeddings in results
            targetEmbedding: null,
          },
          score: finalScore,
          semanticScore,
          lexicalScore,
          qualityBoost,
          recencyBoost,
        };
      })
      .filter(result => result.score >= minScore)
      .slice(0, maxResults);

    console.log(`✅ Found ${results.length} results (scores: ${results.map(r => r.score.toFixed(3)).join(', ')})`);
    
    return results;
  } catch (error) {
    console.error('Hybrid search failed:', error);
    throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function findSimilarTranslations(sourceText: string, targetText: string): Promise<SearchResult[]> {
  // Search for similar source texts and target texts
  const [sourceResults, targetResults] = await Promise.all([
    hybridSearch(sourceText, { alpha: 0.8, maxResults: 5 }),
    hybridSearch(targetText, { alpha: 0.8, maxResults: 5 })
  ]);

  // Combine and deduplicate results
  const combinedResults = new Map<string, SearchResult>();
  
  [...sourceResults, ...targetResults].forEach(result => {
    const existing = combinedResults.get(result.translation.id);
    if (!existing || result.score > existing.score) {
      combinedResults.set(result.translation.id, result);
    }
  });

  return Array.from(combinedResults.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, CONFIG.RETRIEVAL.MAX_RESULTS);
}
```

---

## 🎨 **User Interface Components**

*File: `components/translation/TranslationInterface.tsx`*

```tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Check, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface TranslationResult {
  translatedText: string;
  confidence: number;
  explanation?: string;
  similarTranslations: Array<{
    sourceText: string;
    targetText: string;
    score: number;
    context?: string;
  }>;
}

export function TranslationInterface() {
  const [sourceText, setSourceText] = useState('');
  const [translation, setTranslation] = useState<TranslationResult | null>(null);
  const [correction, setCorrection] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [context, setContext] = useState('');
  const [domain, setDomain] = useState('');
  
  const { toast } = useToast();

  const handleTranslate = async () => {
    if (!sourceText.trim()) return;

    setIsTranslating(true);
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceText: sourceText.trim(),
          context: context.trim() || undefined,
          domain: domain.trim() || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Translation failed');
      }

      const result = await response.json();
      setTranslation(result);
      setCorrection(result.translatedText);
    } catch (error) {
      toast({
        title: "Translation Error",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
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
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save correction');
      }

      toast({
        title: "Correction Saved",
        description: "Thank you for improving the translation!",
      });

      // Reset form
      setSourceText('');
      setTranslation(null);
      setCorrection('');
      setContext('');
      setDomain('');
    } catch (error) {
      toast({
        title: "Save Error",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Swedish to Romani Translation
        </h1>
        <p className="text-gray-600">
          AI-powered translation with expert correction workflow
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

            <Button
              onClick={handleTranslate}
              disabled={!sourceText.trim() || isTranslating}
              className="w-full"
            >
              {isTranslating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Translating...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Translate
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* AI Output Column */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>AI Translation</span>
              {translation && (
                <Badge variant={translation.confidence > 80 ? "default" : "secondary"}>
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
                
                {translation.explanation && (
                  <div className="text-sm text-gray-600">
                    <strong>Explanation:</strong> {translation.explanation}
                  </div>
                )}

                {translation.similarTranslations.length > 0 && (
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
                )}
              </div>
            ) : (
              <div className="text-gray-400 text-center py-8">
                Translation will appear here
              </div>
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
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Save Correction
                  </>
                )}
              </Button>
              
              {translation && correction === translation.translatedText && (
                <Button
                  onClick={handleSaveCorrection}
                  variant="outline"
                  disabled={isSaving}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Approve
                </Button>
              )}
            </div>

            {translation && (
              <div className="text-xs text-gray-500">
                {correction === translation.translatedText 
                  ? "Click 'Approve' if the translation is correct, or edit it first."
                  : "You've made changes. Click 'Save Correction' to help improve the AI."
                }
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

---

## 🔌 **API Endpoints**

*File: `app/api/translate/route.ts`*

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { translateText } from '@/lib/ai';
import { hybridSearch } from '@/lib/retrieval';
import { auth } from '@clerk/nextjs';

export async function POST(request: NextRequest) {
  try {
    // Simple auth check
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sourceText, context, domain } = await request.json();

    if (!sourceText?.trim()) {
      return NextResponse.json(
        { error: 'Source text is required' },
        { status: 400 }
      );
    }

    // Get AI translation
    const aiResult = await translateText({
      sourceText: sourceText.trim(),
      context,
      domain,
    });

    // Search for similar translations
    const similarTranslations = await hybridSearch(sourceText.trim(), {
      maxResults: 5,
      domain,
    });

    return NextResponse.json({
      translatedText: aiResult.translatedText,
      confidence: aiResult.confidence,
      explanation: aiResult.explanation,
      similarTranslations: similarTranslations.map(result => ({
        sourceText: result.translation.sourceText,
        targetText: result.translation.targetText,
        score: result.score,
        context: result.translation.context,
      })),
    });
  } catch (error) {
    console.error('Translation API error:', error);
    return NextResponse.json(
      { error: 'Translation failed' },
      { status: 500 }
    );
  }
}
```

*File: `app/api/correct/route.ts`*

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateEmbedding } from '@/lib/embedding';
import { auth } from '@clerk/nextjs';
import { QualityScore } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      sourceText,
      originalTranslation,
      correctedTranslation,
      context,
      domain,
    } = await request.json();

    if (!sourceText?.trim() || !correctedTranslation?.trim()) {
      return NextResponse.json(
        { error: 'Source text and corrected translation are required' },
        { status: 400 }
      );
    }

    // Generate embedding for the combined source and corrected text
    const combinedText = `${sourceText}\n${correctedTranslation}`;
    const embedding = await generateEmbedding(combinedText);

    // Determine quality score based on whether correction was made
    const wasCorrection = originalTranslation !== correctedTranslation;
    const qualityScore: QualityScore = wasCorrection ? 'B' : 'A'; // Corrected = B, Approved = A

    // Save to database
    const translation = await prisma.translationMemory.create({
      data: {
        sourceText: sourceText.trim(),
        targetText: originalTranslation,
        correctedText: wasCorrection ? correctedTranslation.trim() : null,
        context: context?.trim() || null,
        domain: domain?.trim() || null,
        qualityScore,
        reviewStatus: 'APPROVED',
        reviewedBy: userId,
        reviewedAt: new Date(),
        embedding: embedding as any,
      },
    });

    // If there was a correction, also save the correction details
    if (wasCorrection) {
      await prisma.correction.create({
        data: {
          translationId: translation.id,
          originalText: originalTranslation,
          correctedText: correctedTranslation.trim(),
          correctionType: 'OTHER', // Could be more sophisticated
          severity: 'MODERATE',
          explanation: 'Expert correction provided',
        },
      });
    }

    return NextResponse.json({
      success: true,
      translationId: translation.id,
      wasCorrection,
    });
  } catch (error) {
    console.error('Correction API error:', error);
    return NextResponse.json(
      { error: 'Failed to save correction' },
      { status: 500 }
    );
  }
}
```

---

## 📊 **Review and Export Features**

*File: `app/review/page.tsx`*

```tsx
import { prisma } from '@/lib/db';
import { ReviewList } from '@/components/review/ReviewList';
import { auth } from '@clerk/nextjs';
import { redirect } from 'next/navigation';

export default async function ReviewPage() {
  const { userId } = auth();
  if (!userId) {
    redirect('/sign-in');
  }

  // Get pending reviews
  const pendingReviews = await prisma.translationMemory.findMany({
    where: {
      reviewStatus: 'PENDING',
    },
    include: {
      corrections: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 20,
  });

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Translation Review Queue</h1>
      <ReviewList translations={pendingReviews} />
    </div>
  );
}
```

*File: `app/export/page.tsx`*

```tsx
import { prisma } from '@/lib/db';
import { ExportInterface } from '@/components/export/ExportInterface';
import { auth } from '@clerk/nextjs';
import { redirect } from 'next/navigation';

export default async function ExportPage() {
  const { userId } = auth();
  if (!userId) {
    redirect('/sign-in');
  }

  // Get dataset statistics
  const stats = await prisma.translationMemory.aggregate({
    _count: {
      id: true,
    },
    where: {
      reviewStatus: 'APPROVED',
    },
  });

  const qualityBreakdown = await prisma.translationMemory.groupBy({
    by: ['qualityScore'],
    _count: {
      id: true,
    },
    where: {
      reviewStatus: 'APPROVED',
    },
  });

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Dataset Export</h1>
      <ExportInterface 
        totalTranslations={stats._count.id}
        qualityBreakdown={qualityBreakdown}
      />
    </div>
  );
}
```

---

## 🚀 **Getting Started**

### **Development Setup**

1. **Clone and install dependencies:**
```bash
git clone <repository>
cd romani-trans-app
npm install
```

2. **Set up environment variables:**
```bash
cp .env.example .env
# Edit .env with your actual API keys
```

3. **Start PostgreSQL:**
```bash
docker-compose up -d postgres
```

4. **Set up database:**
```bash
npx prisma migrate dev
npx prisma db seed
```

5. **Start development server:**
```bash
npm run dev
```

6. **Open application:**
```
http://localhost:3000
```

### **Development Workflow**

1. **Translate**: Enter Swedish text, get AI translation with similar examples
2. **Correct**: Review AI output, make corrections if needed
3. **Learn**: System learns from corrections through intelligent feedback loop, improves future translations
4. **Review**: Quality assurance workflow for pending translations
5. **Export**: Generate high-quality datasets for training
6. **Improve**: Intelligent feedback loop continuously enhances translation quality

### **Testing**

```bash
# Run tests
npm test

# Test embedding system
npm run test:embedding

# Check types
npm run type-check

# View database
npm run db:studio
```

---

## 📈 **Key Features**

### **Advanced AI Integration**
- Google gemini-embedding-001 for semantic understanding
- Hybrid search combining semantic + lexical + quality scoring
- Smart retrieval with recency decay and quality boost

### **Expert-in-the-Loop Workflow**
- Three-column interface: Input → AI → Expert correction
- Real-time similarity search showing relevant examples
- Quality tracking and continuous learning
- Intelligent feedback loop that generates learning insights from expert corrections

### **Intelligent Feedback Loop**
- AI analyzer service that generates learning insights from expert corrections
- Learning insights stored in the database with embeddings for retrieval
- Multi-source retrieval system that includes learning insights in translation prompts
- Continuous improvement of translation quality through expert feedback
- Implemented as part of the expert-in-the-loop RAG pipeline
- Enhances the quality-aware learning system with specific rules and patterns
- Provides context-aware translation suggestions
- Improves real-time feedback and confidence scoring

### **Sophisticated Search**
- Vector similarity search using pgvector HNSW indexing
- Text similarity using PostgreSQL trigram matching
- Quality-aware ranking system
- Recency-based relevance decay

### **Rich User Experience**
- Modern React 19 with Next.js 15 App Router
- Responsive design with Tailwind CSS
- Real-time feedback and confidence scoring
- Context-aware translation suggestions
- Enhanced by intelligent feedback loop that captures expert knowledge

### **Intelligent Feedback Loop**
- AI analyzer service that generates learning insights from expert corrections
- Learning insights stored in the database with embeddings for retrieval
- Multi-source retrieval system that includes learning insights in translation prompts
- Continuous improvement of translation quality through expert feedback

This development specification provides everything needed to build a sophisticated, fully-functional Romani translation application locally, without the complexity of production infrastructure. The application maintains all advanced AI features while being lightweight enough for rapid development and iteration.
