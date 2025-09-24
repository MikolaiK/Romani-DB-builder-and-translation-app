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
  directUrl = env("DIRECT_URL")
}

model TranslationMemory {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // Text content
  sourceText     String @map("source_text")
  targetText     String @map("target_text")
  correctedText  String? @map("corrected_text")
  
  // Context and metadata
 context        String?
  domain         String?  // e.g., "medical", "legal", "casual"
  dialect        Dialect? // e.g., Lovari, Kelderash, Arli
  tags           String[] @default([])
  
  // Quality tracking
  qualityScore   QualityScore @default(C) @map("quality_score")
  reviewStatus   ReviewStatus @default(PENDING) @map("review_status")
  reviewNotes    String? @map("review_notes")
  reviewedAt     DateTime? @map("reviewed_at")
  reviewedBy     String? @map("reviewed_by")
  
  // Embeddings for hybrid search
  // Single combined embedding (source + corrected/target)
 embedding  Unsupported("vector(1536)")? @map("embedding")
  
  // Relationships
  corrections    Correction[]
  reviewItems    ReviewItem[]
  generatedInsights LearningInsight[]

 @@map("translation_memory")
}

model Correction {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now()) @map("created_at")

  // What was corrected
  originalText   String @map("original_text")
  correctedText  String @map("corrected_text")
  correctionType CorrectionType @map("correction_type")
  explanation    String?
  
  // Quality assessment
  severity       CorrectionSeverity
  
  // Relationships
  translationId  String @map("translation_id")
  translation    TranslationMemory @relation(fields: [translationId], references: [id], onDelete: Cascade)

 @@map("corrections")
}

model ReviewItem {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // Review details
  status        ReviewStatus @default(PENDING)
  reviewerNotes String? @map("reviewer_notes")
  reviewedAt    DateTime? @map("reviewed_at")
  reviewedBy    String? @map("reviewed_by")
  
  // Priority and assignment
  priority      Priority @default(MEDIUM)
  assignedTo    String? @map("assigned_to")
  
  // Relationships
  translationId String @map("translation_id")
  translation   TranslationMemory @relation(fields: [translationId], references: [id], onDelete: Cascade)

  @@map("review_items")
}

model KnowledgeItem {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // Content
 title       String
 content     String
 category    String?
 tags        String[] @default([])
  
  // Search and retrieval
  embedding   Unsupported("vector(1536)")?
  
  // Quality and usage
  qualityScore QualityScore @default(C) @map("quality_score")
  usageCount   Int          @default(0) @map("usage_count")
  lastUsed     DateTime?    @map("last_used")

  @@map("knowledge_items")
}

/// Dedicated tables for ingestion per the Resource-Ingestion-plan
model RomaniLexicon {
  id         String   @id @default(cuid())
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  sourceText String   @map("source_text")
  targetText String   @map("target_text")
  dialect    Dialect?
  domain     String?  // vocab
  provenance Json?    // { filename, jobId, index }

  /// Combined embedding for the pair (source + target)
  embedding    Unsupported("vector(1536)")? @map("embedding")
  /// tags for filtering/search
  tags         String[] @default([])

  qualityScore QualityScore @default(C) @map("quality_score")
  reviewStatus ReviewStatus @default(PENDING) @map("review_status")

  @@map("romani_lexicon")
}

model RomaniGrammar {
  id         String   @id @default(cuid())
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  documentId  String?   @map("document_id")
  filename    String?
  chunkIndex  Int?      @map("chunk_index")
  content     String
  dialect     Dialect?
  tags        String[]  @default([])
  provenance  Json?     // free-form

  embedding   Unsupported("vector(1536)")? @map("embedding")
  qualityScore QualityScore @default(C) @map("quality_score")

  @@map("romani_grammar")
}

model RomaniStyle {
  id         String   @id @default(cuid())
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  title      String?
  content    String
  dialect    Dialect?
  tags       String[] @default([])
  provenance Json?

  embedding   Unsupported("vector(1536)")? @map("embedding")
  qualityScore QualityScore @default(C) @map("quality_score")

  @@map("romani_style")
}

/// Ingestion tracking for uploads/pipelines
model IngestionJob {
  id            String   @id @default(cuid())
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  // Job metadata
  sourceType    String   // e.g., grammar|vocab|parallel|raw
  filename      String?
  dialect       Dialect?
  status        IngestionStatus @default(PENDING)
  totalItems    Int      @default(0) @map("total_items")
  processedItems Int     @default(0) @map("processed_items")
  errorMessage  String?  @map("error_message")
  startedAt     DateTime? @map("started_at")
  finishedAt    DateTime? @map("finished_at")

  // Relations
  records       IngestionRecord[]

  @@map("ingestion_jobs")
}

model IngestionRecord {
  id         String   @id @default(cuid())
  createdAt  DateTime @default(now()) @map("created_at")

  jobId      String   @map("job_id")
  job        IngestionJob @relation(fields: [jobId], references: [id], onDelete: Cascade)

  targetTable String   @map("target_table") // translation_memory | knowledge_items
  targetId     String   @map("target_id")
  status       IngestionItemStatus @default(INSERTED)
  errorMessage String?  @map("error_message")

  preview     String?   // short snippet for UI

  @@map("ingestion_records")
  }

  model LearningInsight {
    id        String   @id @default(cuid())
    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt

    // The core insight generated by the Analyzer AI
    rule        String   @db.Text
    category    String
    confidence Float
    explanation String?  @db.Text
    embedding   Unsupported("vector(1536)")?

    // --- Contextual Metadata ---
    domain      String?   // e.g., "mythology", "medical", "casual"
    tags        String[] // e.g., ["formal", "dialogue"]

    // Link back to the source of this insight
    sourceTranslationMemoryId String?
    sourceTranslationMemory   TranslationMemory? @relation(fields: [sourceTranslationMemoryId], references: [id])
  }

  enum IngestionStatus {
  PENDING
  RUNNING
  COMPLETED
  FAILED
}

enum IngestionItemStatus {
  INSERTED
 FAILED
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

enum Dialect {
  Lovari
 Kelderash
  Arli
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
import { google, createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import type { PreparedPayload } from './ingestion';
// no config import needed here

// Initialize Google AI provider
// Primary is configurable; we default to 2.5-flash, but fall back to 1.5-flash on schema edge-cases
const PRIMARY_MODEL_NAME = process.env.GEMINI_PRIMARY_MODEL || 'gemini-2.5-flash';
const FALLBACK_MODEL_NAME = process.env.GEMINI_FALLBACK_MODEL || 'gemini-1.5-flash';
// Dedicated translate API key support
const TRANSLATE_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY_TRANSLATE || process.env.GEMINI_TRANSLATE_API_KEY;
const ACTIVE_TRANSLATE_KEY = TRANSLATE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
// Configure a provider with the translate API key
const PRIMARY_MODEL = ACTIVE_TRANSLATE_KEY
 ? createGoogleGenerativeAI({ apiKey: ACTIVE_TRANSLATE_KEY })(PRIMARY_MODEL_NAME)
  : google(PRIMARY_MODEL_NAME);
const FALLBACK_MODEL = ACTIVE_TRANSLATE_KEY
  ? createGoogleGenerativeAI({ apiKey: ACTIVE_TRANSLATE_KEY })(FALLBACK_MODEL_NAME)
  : google(FALLBACK_MODEL_NAME);
const HAS_AI_KEY = !!ACTIVE_TRANSLATE_KEY;
const MAX_RETRIES = parseInt(process.env.GEMINI_MAX_RETRIES || '3', 10);
const RETRY_BASE_MS = parseInt(process.env.GEMINI_RETRY_BASE_MS || '400', 10);
const MAX_OUTPUT_TOKENS_PRIMARY = parseInt(process.env.GEMINI_MAX_OUTPUT_TOKENS || '2048', 10);
const MAX_OUTPUT_TOKENS_FALLBACK = parseInt(process.env.GEMINI_FALLBACK_MAX_OUTPUT_TOKENS || '1536', 10);

export interface TranslationRequest {
  sourceText: string;
  context?: string;
 domain?: string;
  dialect?: 'Lovari' | 'Kelderash' | 'Arli';
  style?: 'Neutral' | 'Formal' | 'Informal';
  examples?: Array<{
    sourceText: string;
    targetText: string; // Prefer correctedText upstream
    context?: string | null;
  }>;
 retrievalData?: {
    learningInsights: import('./retrieval').LearningInsightResult[];
    grammarRules: import('./retrieval').GrammarResult[];
    vocabulary: import('./retrieval').LexiconResult[];
    examples: import('./retrieval').TranslationExample[];
  };
}

export interface TranslationResponse {
  translatedText: string;
  confidence: number;
  explanation?: string;
  modelUsed?: string;
  attempts?: number;
}

export { buildTranslationPrompt };

export async function translateText({
  sourceText,
  context,
  domain,
  dialect,
  style,
  examples,
  retrievalData
}: TranslationRequest): Promise<TranslationResponse> {
  if (!HAS_AI_KEY) {
    throw Object.assign(new Error('MODEL_UNAVAILABLE: Missing GOOGLE_GENERATIVE_AI_API_KEY'), {
      code: 'MODEL_UNAVAILABLE',
      attempts: 0,
    });
  }

  // Use structured prompt when retrieval data is provided, otherwise use the old prompt
  const prompt = retrievalData
    ? buildStructuredTranslationPrompt(sourceText, context, domain, dialect, style, retrievalData)
    : buildTranslationPrompt(sourceText, context, domain, dialect, style, (examples || []).slice(0, 12));

  const call = async (useFallback = false, overrideMaxTokens?: number) => {
    const model = useFallback ? FALLBACK_MODEL : PRIMARY_MODEL;
    const maxTokens = overrideMaxTokens ?? (useFallback ? MAX_OUTPUT_TOKENS_FALLBACK : MAX_OUTPUT_TOKENS_PRIMARY);
    const { text } = await generateText({
      model,
      prompt,
      maxTokens,
      temperature: 0.2,
    });
    return text;
 };

  let text = '';
  let lastErr: unknown = null;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // First half of attempts use primary; later attempts try fallback model
      const useFallback = attempt > Math.max(1, Math.ceil(MAX_RETRIES / 2));
      try {
        text = await call(useFallback);
      } catch (err: unknown) {
        const msg = String((err as Error)?.message || '');
        const isSchemaEdgeCase = msg.includes('content') && msg.includes('parts') && msg.includes('Required');
        const isMaxTokenFinish = msg.includes('MAX_TOKENS');
        // Handle Gemini 2.5 occasional empty parts bug by trying: fallback model, then reduced tokens
        if (isSchemaEdgeCase || isMaxTokenFinish) {
          console.warn('[AI] Detected Gemini schema edge-case (missing parts or MAX_TOKENS). Applying immediate fallback...');
          try {
            // immediate model fallback
            text = await call(true, Math.min(MAX_OUTPUT_TOKENS_FALLBACK, 1024));
          } catch {
            // reduced token retry on primary
            text = await call(false, 768);
          }
        } else {
          throw err;
        }
      }
      const response = parseTranslationResponse(text || '');
      response.modelUsed = useFallback ? FALLBACK_MODEL_NAME : PRIMARY_MODEL_NAME;
      response.attempts = attempt;
      return response;
    } catch (e) {
      lastErr = e;
      const backoff = RETRY_BASE_MS * Math.pow(2, attempt - 1);
      console.warn(`[AI] ${PRIMARY_MODEL_NAME} attempt ${attempt} failed, retrying in ${backoff}ms`, e);
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, backoff));
        continue;
      }
    }
  }

  throw Object.assign(new Error(`MODEL_UNAVAILABLE: Failed after ${MAX_RETRIES} attempts`), {
    code: 'MODEL_UNAVAILABLE',
    attempts: MAX_RETRIES,
    cause: lastErr,
  });
}

function buildTranslationPrompt(text: string, context?: string, domain?: string, dialect?: TranslationRequest['dialect'], style?: TranslationRequest['style'], examples?: TranslationRequest['examples']): string {
  const examplesBlock = (examples && examples.length)
    ? `\nUse these high-quality examples as guidance (prefer style and terms). Quote them explicitly before translating:\n` +
      examples.slice(0, 12).map((ex, i) => `Example ${i+1}:\nSwedish: ${ex.sourceText}\nRomani: ${ex.targetText}${ex.context ? `\nContext: ${ex.context}` : ''}`).join('\n\n') + '\n'
    : '';
  return `
You are an expert Swedish to Romani translator. Translate the following Swedish text to Romani.

Swedish text: "${text}"
${context ? `Context: ${context}` : ''}
${domain ? `Domain: ${domain}` : ''}
${dialect ? `Dialect: ${dialect}` : ''}
${style && style !== 'Neutral' ? `Style: ${style}` : ''}
${examplesBlock}

Please provide ALL of the following in this exact format:
Translation: [romani text]
Confidence: [0-100]
Explanation: [1-2 short sentences on key choices or terms]

Constraints:
- Keep the response concise. Avoid any hidden or internal reasoning.
- Do NOT include analysis steps; just produce the final answers in three lines.
- Stay within 40 tokens for the translation and 1-2 short sentences for the explanation.
`.trim();
}

/**
* Build a structured translation prompt that incorporates learning insights, grammar rules,
 * vocabulary, and examples from all four data sources
 */
export function buildStructuredTranslationPrompt(
 text: string,
  context?: string,
  domain?: string,
  dialect?: TranslationRequest['dialect'],
  style?: TranslationRequest['style'],
  retrievalData?: {
    learningInsights: import('./retrieval').LearningInsightResult[];
    grammarRules: import('./retrieval').GrammarResult[];
    vocabulary: import('./retrieval').LexiconResult[];
    examples: import('./retrieval').TranslationExample[];
  }
): string {
 // Format learning insights
  const insightsBlock = retrievalData?.learningInsights && retrievalData.learningInsights.length > 0
    ? `Learning Insights (apply these rules):\n` +
      retrievalData.learningInsights
        .slice(0, 5)
        .map(insight => `- ${insight.insight.rule} (confidence: ${Math.round(insight.insight.confidence * 100)}%)${insight.insight.explanation ? ` - ${insight.insight.explanation}` : ''}`)
        .join('\n') + '\n'
    : '';

  // Format grammar rules
  const grammarBlock = retrievalData?.grammarRules && retrievalData.grammarRules.length > 0
    ? `Grammar Rules:\n` +
      retrievalData.grammarRules
        .slice(0, 5)
        .map(rule => `- ${rule.content}`)
        .join('\n') + '\n'
    : '';

  // Format vocabulary
  const vocabularyBlock = retrievalData?.vocabulary && retrievalData.vocabulary.length > 0
    ? `Vocabulary:\n` +
      retrievalData.vocabulary
        .slice(0, 10)
        .map(entry => `- ${entry.sourceText} → ${entry.targetText}`)
        .join('\n') + '\n'
    : '';

  // Format examples
  const examplesBlock = retrievalData?.examples && retrievalData.examples.length > 0
    ? `Translation Examples:\n` +
      retrievalData.examples
        .slice(0, 5)
        .map(example => `Swedish: ${example.sourceText}\nRomani: ${example.correctedText || example.targetText}${example.context ? `\nContext: ${example.context}` : ''}`)
        .join('\n\n') + '\n'
    : '';

  return `
You are an expert Swedish to Romani translator with deep knowledge of grammar, vocabulary, and translation patterns.

Translate the following Swedish text to Romani, applying all relevant rules and patterns.

Swedish text: "${text}"
${context ? `Context: ${context}` : ''}
${domain ? `Domain: ${domain}` : ''}
${dialect ? `Dialect: ${dialect}` : ''}
${style && style !== 'Neutral' ? `Style: ${style}` : ''}

${insightsBlock}
${grammarBlock}
${vocabularyBlock}
${examplesBlock}

Please provide ALL of the following in this exact format:
Translation: [romani text]
Confidence: [0-100]
Explanation: [1-2 short sentences on key choices or terms]

Constraints:
- Keep the response concise. Avoid any hidden or internal reasoning.
- Do NOT include analysis steps; just produce the final answers in three lines.
- Stay within 40 tokens for the translation and 1-2 short sentences for the explanation.
- Apply the learning insights, grammar rules, and vocabulary as appropriate to the translation.
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

// Use the model to extract a structured payload from arbitrary language resources
export async function extractIngestionStructure(rawText: string, sourceType?: string): Promise<PreparedPayload> {
  if (!HAS_AI_KEY) {
    // Fallback: empty; caller should apply heuristics
    return { grammarChunks: [], vocabPairs: [], parallelPairs: [] };
  }

  // Create dynamic schema and prompt based on sourceType
 let schema = '';
  let rules = '';
  
  if (sourceType === 'parallel') {
    schema = `{
    "parallelPairs": { sv: string; rmn: string; }[]; // aligned sentence pairs
 }`;
    rules = `Rules:\n- No markdown, code fences, or prose.\n- Deduplicate and keep items clean.\n- Only extract parallel sentence pairs in the format { sv: string; rmn: string; }[].\n- Skip any vocabulary or grammar content.\n`;
  } else if (sourceType === 'vocab') {
    schema = `{
    "vocabPairs": { swedish: string; romani: string; }[]; // term or phrase pairs
  }`;
    rules = `Rules:\n- No markdown, code fences, or prose.\n- Deduplicate and keep items clean.\n- Only extract vocabulary pairs in the format { swedish: string; romani: string; }[].\n- Pair Swedish (sv) with Romani (rmn) when obvious.\n- Skip any parallel sentences or grammar content.\n`;
  } else if (sourceType === 'grammar') {
    schema = `{
    "grammarChunks": string[]; // standalone explanations or sections
  }`;
    rules = `Rules:\n- No markdown, code fences, or prose.\n- Deduplicate and keep items clean.\n- Extract grammar rules as complete units when possible.\n- Only split into multiple chunks if there are clearly separate grammar rules.\n- Keep chunks <= 200 characters.\n- Skip any vocabulary or parallel sentence content.\n`;
  } else {
    // Default/fallback - extract all types
    schema = `{
    "grammarChunks": string[]; // standalone explanations or sections
    "vocabPairs": { swedish: string; romani: string; }[]; // term or phrase pairs
    "parallelPairs": { sv: string; rmn: string; }[]; // aligned sentence pairs
 }`;
    rules = `Rules:\n- No markdown, code fences, or prose.\n- Deduplicate and keep items clean.\n- Keep chunks <= 800 characters.\n- For vocab, pair Swedish (sv) with Romani (rmn) when obvious.\n- If uncertain, skip the item.\n`;
  }

  const prompt = `You are a Romani language data preparer. Read the document and produce ONLY minified JSON matching this TypeScript-like schema:\n${schema}\n
${rules}
Document:\n\n${rawText}`;

  const call = async (useFallback = false) => {
    const model = useFallback ? FALLBACK_MODEL : PRIMARY_MODEL;
    const maxTokens = useFallback ? MAX_OUTPUT_TOKENS_FALLBACK : MAX_OUTPUT_TOKENS_PRIMARY;
    const { text } = await generateText({ model, prompt, maxTokens, temperature: 0.1 });
    return text;
 };

  let out = '';
  try {
    try {
      out = await call(false);
    } catch (err: unknown) {
      const msg = String((err as Error)?.message || '');
      const isSchemaEdgeCase = msg.includes('parts') || msg.includes('MAX_TOKENS');
      if (isSchemaEdgeCase) out = await call(true);
      else throw err;
    }
    const jsonStart = out.indexOf('{');
    const jsonEnd = out.lastIndexOf('}');
    const jsonStr = jsonStart >= 0 ? out.slice(jsonStart, jsonEnd + 1) : out;
    const data: unknown = JSON.parse(jsonStr);
    // shallow validate
    const isVocab = (p: unknown): p is { swedish: unknown; romani: unknown } =>
      !!p && typeof p === 'object' && 'swedish' in (p as object) && 'romani' in (p as object);
    const isParallel = (p: unknown): p is { sv: unknown; rmn: unknown } =>
      !!p && typeof p === 'object' && 'sv' in (p as object) && 'rmn' in (p as object);

    const d = data as Record<string, unknown>;
    return {
      grammarChunks: Array.isArray(d.grammarChunks) ? d.grammarChunks.map((s: unknown) => String(s)).slice(0, 500) : [],
      vocabPairs: Array.isArray(d.vocabPairs)
        ? d.vocabPairs
            .filter(isVocab)
            .map((p) => ({ swedish: String(p.swedish ?? ''), romani: String(p.romani ?? '') }))
            .filter((p) => p.swedish && p.romani)
            .slice(0, 1000)
        : [],
      parallelPairs: Array.isArray(d.parallelPairs)
        ? d.parallelPairs
            .filter(isParallel)
            .map((p) => ({ sv: String(p.sv ?? ''), rmn: String(p.rmn ?? '') }))
            .filter((p) => p.sv && p.rmn)
            .slice(0, 1000)
        : [],
    };
  } catch {
    // If model fails or returns invalid JSON, return empty; caller may fallback
    return { grammarChunks: [], vocabPairs: [], parallelPairs: [] };
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

## 🧠 **AI Analyzer and Learning Insights**

*File: `lib/ai-analyzer.ts`*

```typescript
import { google, createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';

// Initialize Google AI provider using the same pattern as the translation service
const PRIMARY_MODEL_NAME = process.env.GEMINI_PRIMARY_MODEL || 'gemini-2.5-flash';
const FALLBACK_MODEL_NAME = process.env.GEMINI_FALLBACK_MODEL || 'gemini-1.5-flash';
const TRANSLATE_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY_TRANSLATE || process.env.GEMINI_TRANSLATE_API_KEY;
const ACTIVE_TRANSLATE_KEY = TRANSLATE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
const PRIMARY_MODEL = ACTIVE_TRANSLATE_KEY
 ? createGoogleGenerativeAI({ apiKey: ACTIVE_TRANSLATE_KEY })(PRIMARY_MODEL_NAME)
  : google(PRIMARY_MODEL_NAME);
const FALLBACK_MODEL = ACTIVE_TRANSLATE_KEY
  ? createGoogleGenerativeAI({ apiKey: ACTIVE_TRANSLATE_KEY })(FALLBACK_MODEL_NAME)
  : google(FALLBACK_MODEL_NAME);
const HAS_AI_KEY = !!ACTIVE_TRANSLATE_KEY;
const MAX_RETRIES = parseInt(process.env.GEMINI_MAX_RETRIES || '3', 10);
const RETRY_BASE_MS = parseInt(process.env.GEMINI_RETRY_BASE_MS || '400', 10);

// Define the structure for a learning insight
export interface LearningInsight {
  rule: string;
  category: string;
 confidence: number;
 explanation: string;
}

/**
 * Generate a learning insight from a translation correction
 * @param sourceText The original source text
 * @param aiTranslation The initial AI translation
 * @param expertCorrection The expert-corrected translation
 * @param dialect The dialect of the target language
 * @param domain The domain/context of the translation
 * @param tags Tags associated with the translation
 * @returns A structured learning insight
 */
export async function generateLearningInsight(
  sourceText: string,
  aiTranslation: string,
  expertCorrection: string,
  dialect: string,
  domain: string,
  tags: string[]
): Promise<LearningInsight | null> {
  if (!HAS_AI_KEY) {
    console.warn('AI key not available for generating learning insights');
    return null;
  }

  try {
    // Construct the prompt for the AI to analyze the correction
    const prompt = `
      Analyze the following translation correction and extract a generalizable rule:
      
      Source text: "${sourceText}"
      AI translation: "${aiTranslation}"
      Expert correction: "${expertCorrection}"
      Target dialect: ${dialect}
      Domain: ${domain}
      Tags: ${tags.join(", ")}
      
      Please provide:
      1. A concise rule that captures the correction pattern
      2. A category for this rule (e.g., grammar, vocabulary, cultural context)
      3. A confidence score between 0 and 1
      4. A brief explanation of why this rule is important
      
      Respond in JSON format:
      {
        "rule": "string",
        "category": "string",
        "confidence": number,
        "explanation": "string"
      }
    `;

    const call = async (useFallback = false) => {
      const model = useFallback ? FALLBACK_MODEL : PRIMARY_MODEL;
      const { text } = await generateText({
        model,
        prompt,
        temperature: 0.2,
      });
      console.log('[AI Analyzer] Raw response:', text?.slice?.(0,200));
      return text;
    };

    let text = '';
    let lastErr: unknown = null;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const useFallback = attempt > Math.max(1, Math.ceil(MAX_RETRIES / 2));
        text = await call(useFallback);
        
        // Parse the JSON response
        try {
          const jsonStart = text.indexOf("{");
          const jsonEnd = text.lastIndexOf("}") + 1;
          const jsonString = text.substring(jsonStart, jsonEnd);
          console.log('[AI Analyzer] Extracted JSON string:', jsonString?.slice?.(0,200));
          // Validate that we have a valid JSON string
          if (jsonString.length > 0) {
            const insight: LearningInsight = JSON.parse(jsonString);
            return insight;
          }
        } catch (parseErr) {
          console.warn('[AI Analyzer] Failed to parse JSON response:', parseErr, 'raw:', text?.slice?.(0,400));
          // If the SDK reports an invalid JSON from the provider, it may be available on the thrown error's responseBody.
          // Try to recover from a provider error object if present on the last caught error.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const lastError: any = (parseErr && (parseErr as any).cause) || parseErr;
          try {
            if (lastError && lastError.responseBody) {
              const raw = lastError.responseBody;
              const s = typeof raw === 'string' ? raw : JSON.stringify(raw);
              const sStart = s.indexOf('{');
              const sEnd = s.lastIndexOf('}') + 1;
              if (sStart > -1 && sEnd > sStart) {
                const recovered = s.substring(sStart, sEnd);
                console.log('[AI Analyzer] Attempting to recover JSON from error.responseBody:', recovered?.slice?.(0,200));
                const insight: LearningInsight = JSON.parse(recovered);
                return insight;
              }
            }
          } catch (recoveryErr) {
            console.warn('[AI Analyzer] Recovery attempt failed:', recoveryErr);
          }
        }
      } catch (e) {
        lastErr = e;
        const backoff = RETRY_BASE_MS * Math.pow(2, attempt - 1);
        console.warn(`[AI Analyzer] Attempt ${attempt} failed, retrying in ${backoff}ms`, e);
        if (attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, backoff));
          continue;
        }
      }
    }

    console.error("Failed to generate learning insight after retries:", lastErr);
    return null;
  } catch (error) {
    console.error("Error generating learning insight:", error);
    return null;
  }
}

---

## 🔍 **Hybrid Search and Retrieval System**

*File: `lib/retrieval.ts`*

```typescript
import { prisma } from './db';
import { generateEmbedding } from './embedding';
import { CONFIG } from './config';
import { TranslationMemory } from '@prisma/client';

export interface SearchResult {
  translation: TranslationMemory;
  score: number;
  semanticScore: number;
  lexicalScore: number;
  exactMatchBoost?: number;
  qualityBoost: number;
  recencyBoost: number;
  correctedBoost?: number;
}

export interface LearningInsightResult {
  insight: {
    id: string;
    rule: string;
    category: string;
    confidence: number;
    explanation: string | null;
    domain: string | null;
    tags: string[];
  };
  score: number;
  semanticScore: number;
}

export interface GrammarResult {
  id: string;
  content: string;
 qualityScore: string | null;
  score: number;
  semanticScore: number;
  lexicalScore: number;
}

export interface LexiconResult {
  id: string;
 sourceText: string;
  targetText: string;
  score: number;
  semanticScore: number;
  lexicalScore: number;
  exactMatchBoost?: number;
}

export interface TranslationExample {
  id: string;
  sourceText: string;
  targetText: string;
  correctedText: string | null;
  context: string | null;
  domain: string | null;
  dialect: string | null;
  score: number;
  semanticScore: number;
  lexicalScore: number;
  qualityBoost: number;
  correctedBoost?: number;
  recencyBoost: number;
}

export interface SearchOptions {
  alpha?: number; // Balance between semantic and lexical (0-1)
  maxResults?: number;
  minScore?: number;
  domain?: string;
  dialect?: 'Lovari' | 'Kelderash' | 'Arli';
  tags?: string[]; // Tags for filtering results
 keywords?: string[]; // Keywords for pre-filtering
}

/**
 * Extract important keywords from a query string
 * This function identifies potential vocabulary words that might have translations
 */
export function extractKeywords(query: string): string[] {
 // Split the query into words and remove punctuation
  const words = query
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .split(/\s+/) // Split on whitespace
    .filter(word => word.length > 2); // Filter out short words
  
  // Common Swedish stop words to filter out
  const stopWords = new Set([
    'och', 'eller', 'men', 'för', 'att', 'med', 'till', 'från', 'på', 'i', 'om', 'är', 'har', 'kan', 'ska', 'vill',
    'the', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'this', 'that', 'these', 'those', 'a', 'an', 'the', 'in', 'on', 'at', 'by',
    'min', 'min', 'mitt', 'mina', 'din', 'ditt', 'dina', 'hans', 'hennes', 'dess', 'vår', 'vårt', 'våra', 'er', 'ert', 'era',
    'jag', 'du', 'han', 'hon', 'den', 'det', 'vi', 'ni', 'de', 'sig', 'mig', 'dig', 'oss', 'er', 'dem', 'min', 'mitt', 'mina'
  ]);
  
  // Filter out stop words and return unique keywords
  return [...new Set(words.filter(word => !stopWords.has(word)))];
}

export async function hybridSearch(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const {
    alpha = CONFIG.RETRIEVAL.DEFAULT_ALPHA,
    maxResults = CONFIG.RETRIEVAL.MAX_RESULTS,
    minScore = 0.1,
    domain,
    dialect,
    tags,
    keywords
  } = options;

  try {
    console.log(`🔍 Searching for: "${query}" (alpha: ${alpha})`);

    // Generate query embedding
    const queryEmbedding = await generateEmbedding(query);
    // Generate query embedding for lexicon search (to match how lexicon embeddings were created during ingestion)
    const lexiconQueryText = `Swedish: ${query} ||| Romani:`;
    const lexiconQueryEmbedding = await generateEmbedding(lexiconQueryText);
    // We'll query translation_memory and the new romani_* tables separately and merge results
    const paramsBase = [`[${queryEmbedding.join(',')}]`, query];
    const lexiconParamsBase = [`[${lexiconQueryEmbedding.join(',')}]`, query];

    // translation_memory query (keeps previous scoring)
    const tmQuery = `
      SELECT id, created_at, updated_at, source_text, target_text, corrected_text, context, domain, quality_score, review_status, review_notes, reviewed_at, reviewed_by,
  COALESCE(1 - (embedding <=> $1::vector), 0) as semantic_score,
        ( similarity(source_text, $2) + similarity(COALESCE(corrected_text, target_text), $2) + COALESCE(similarity(context, $2), 0) ) / 3 as lexical_score,
        CASE quality_score WHEN 'A' THEN ${CONFIG.RETRIEVAL.QUALITY_BOOST_MAP.A} WHEN 'B' THEN ${CONFIG.RETRIEVAL.QUALITY_BOOST_MAP.B} WHEN 'C' THEN ${CONFIG.RETRIEVAL.QUALITY_BOOST_MAP.C} WHEN 'D' THEN ${CONFIG.RETRIEVAL.QUALITY_BOOST_MAP.D} ELSE 0 END as quality_boost,
        CASE WHEN corrected_text IS NOT NULL THEN 0.15 ELSE 0 END as corrected_boost,
        GREATEST(0, 1 - (EXTRACT(days FROM NOW() - created_at) / ${CONFIG.RETRIEVAL.RECENCY_DECAY_DAYS})) as recency_boost
      FROM translation_memory
      WHERE review_status = 'APPROVED'
      ${domain && dialect ? 'AND domain = $3 AND dialect = $4::"Dialect"' : ''}
      ${domain && !dialect ? 'AND domain = $3' : ''}
      ${!domain && dialect ? 'AND dialect = $3::"Dialect"' : ''}
  AND (COALESCE(1 - (embedding <=> $1::vector), 0) > 0.1 OR similarity(source_text, $2) > ${CONFIG.RETRIEVAL.MIN_LEXICAL_SCORE})
      ORDER BY (
  ${alpha} * COALESCE(1 - (embedding <=> $1::vector), 0) +
        ${1 - alpha} * (( similarity(source_text, $2) + similarity(COALESCE(corrected_text, target_text), $2) + COALESCE(similarity(context, $2), 0) ) / 3) +
        CASE quality_score WHEN 'A' THEN ${CONFIG.RETRIEVAL.QUALITY_BOOST_MAP.A} WHEN 'B' THEN ${CONFIG.RETRIEVAL.QUALITY_BOOST_MAP.B} WHEN 'C' THEN ${CONFIG.RETRIEVAL.QUALITY_BOOST_MAP.C} WHEN 'D' THEN ${CONFIG.RETRIEVAL.QUALITY_BOOST_MAP.D} ELSE 0 END +
        CASE WHEN corrected_text IS NOT NULL THEN 0.15 ELSE 0 END +
        GREATEST(0, 1 - (EXTRACT(days FROM NOW() - created_at) / ${CONFIG.RETRIEVAL.RECENCY_DECAY_DAYS})) * 0.1
      ) DESC
      LIMIT ${maxResults}
    `;

    const tmParams = [paramsBase[0], paramsBase[1], ...(domain && dialect ? [domain, dialect] : []), ...(domain && !dialect ? [domain] : []), ...(!domain && dialect ? [dialect] : [])];
  const tmRaw = await prisma.$queryRawUnsafe(tmQuery, ...tmParams) as unknown[];

    // romani_lexicon: embed both source and target against query; treat source_text as primary match
    // Build WHERE conditions for tags and keywords
    const lexiconWhereConditions: string[] = [];
    const lexiconParams: (string | string[] | number[])[] = [lexiconParamsBase[0], lexiconParamsBase[1]]; // Start with embedding and query text
    let lexiconParamIndex = 3; // Next parameter index (1-based for SQL)
    
    // Add dialect condition if specified
    if (dialect) {
      lexiconWhereConditions.push(`dialect = $${lexiconParamIndex}::"Dialect"`);
      lexiconParams.push(dialect);
      lexiconParamIndex++;
    }
    
    // Add tag conditions if specified
    if (tags && tags.length > 0) {
      // Use && operator to check if any of the record's tags match any of the filter tags
      lexiconWhereConditions.push(`tags && $${lexiconParamIndex}::text[]`);
      lexiconParams.push(`{${tags.map(t => `"${t}"`).join(',')}}`); // Format as PostgreSQL array literal
      lexiconParamIndex++;
    }
    
    // Add keyword conditions if specified
    if (keywords && keywords.length > 0) {
      // Create a condition that matches any of the keywords in source_text
      const keywordConditions = keywords.map((_, index) => `source_text = $${lexiconParamIndex + index}`).join(' OR ');
      lexiconWhereConditions.push(`(${keywordConditions})`);
      lexiconParams.push(...keywords);
      lexiconParamIndex += keywords.length;
    }
    
    // Add similarity conditions
    lexiconWhereConditions.push(`(COALESCE(1 - (embedding <=> $1::vector), 0) > 0.05 OR similarity(source_text, $2) > ${CONFIG.RETRIEVAL.MIN_LEXICAL_SCORE})`);
    
    const lexQuery = `
      SELECT id, created_at, updated_at, source_text, target_text, domain, NULL as quality_score, NULL as review_status, NULL as review_notes, NULL as reviewed_at, NULL as reviewed_by,
        COALESCE(1 - (embedding <=> $1::vector), 0) as semantic_score,
        similarity(source_text, $2) as lexical_score,
        CASE WHEN source_text = $2 THEN 0.5 ELSE 0 END as exact_match_boost,
        0 as quality_boost, 0 as corrected_boost, 0 as recency_boost
      FROM romani_lexicon
      WHERE ${lexiconWhereConditions.length > 0 ? lexiconWhereConditions.join(' AND ') : 'TRUE'}
      ORDER BY (${alpha} * COALESCE(1 - (embedding <=> $1::vector), 0) + ${1 - alpha} * similarity(source_text, $2) + CASE WHEN source_text = $2 THEN 0.5 ELSE 0 END) DESC
      LIMIT ${maxResults}
    `;
  const lexRaw = await prisma.$queryRawUnsafe(lexQuery, ...lexiconParams) as unknown[];

    // romani_grammar
    const gramQuery = `
      SELECT id, created_at, updated_at, content as source_text, NULL as target_text, NULL as corrected_text, NULL as context, NULL as domain, quality_score, NULL as review_status, NULL as review_notes, NULL as reviewed_at, NULL as reviewed_by,
        COALESCE(1 - (embedding <=> $1::vector), 0) as semantic_score,
        similarity(content, $2) as lexical_score,
        0 as quality_boost, 0 as corrected_boost, 0 as recency_boost
      FROM romani_grammar
      WHERE ${dialect ? 'dialect = $3::"Dialect" AND' : ''} (COALESCE(1 - (embedding <=> $1::vector), 0) > 0.05 OR similarity(content, $2) > ${CONFIG.RETRIEVAL.MIN_LEXICAL_SCORE})
      ORDER BY (${alpha} * COALESCE(1 - (embedding <=> $1::vector), 0) + ${1 - alpha} * similarity(content, $2)) DESC
      LIMIT ${maxResults}
    `;
    const gramParams = dialect ? [paramsBase[0], paramsBase[1], dialect] : [paramsBase[0], paramsBase[1]];
  const gramRaw = await prisma.$queryRawUnsafe(gramQuery, ...gramParams) as unknown[];

    // romani_style
    const styleQuery = `
      SELECT id, created_at, updated_at, content as source_text, NULL as target_text, NULL as corrected_text, NULL as context, NULL as domain, quality_score, NULL as review_status, NULL as review_notes, NULL as reviewed_at, NULL as reviewed_by,
        COALESCE(1 - (embedding <=> $1::vector), 0) as semantic_score,
        similarity(content, $2) as lexical_score,
        0 as quality_boost, 0 as corrected_boost, 0 as recency_boost
      FROM romani_style
      WHERE ${dialect ? 'dialect = $3::"Dialect" AND' : ''} (COALESCE(1 - (embedding <=> $1::vector), 0) > 0.05 OR similarity(content, $2) > ${CONFIG.RETRIEVAL.MIN_LEXICAL_SCORE})
      ORDER BY (${alpha} * COALESCE(1 - (embedding <=> $1::vector), 0) + ${1 - alpha} * similarity(content, $2)) DESC
      LIMIT ${maxResults}
    `;
    const styleParams = dialect ? [paramsBase[0], paramsBase[1], dialect] : [paramsBase[0], paramsBase[1]];
  const styleRaw = await prisma.$queryRawUnsafe(styleQuery, ...styleParams) as unknown[];

  const rawResults = [...tmRaw, ...lexRaw, ...gramRaw, ...styleRaw] as unknown[];

    // Transform raw results
    const results: SearchResult[] = rawResults
      .map((r) => {
        const row = r as Record<string, unknown>;
        const semanticScore = parseFloat(String(row['semantic_score'] ?? '0')) || 0;
        const lexicalScore = parseFloat(String(row['lexical_score'] ?? '0')) || 0;
        const exactMatchBoost = parseFloat(String(row['exact_match_boost'] ?? '0')) || 0;
        const qualityBoost = parseFloat(String(row['quality_boost'] ?? '0')) || 0;
        const correctedBoost = parseFloat(String(row['corrected_boost'] ?? '0')) || 0;
        const recencyBoost = parseFloat(String(row['recency_boost'] ?? '0')) || 0;

        const finalScore = alpha * semanticScore + (1 - alpha) * lexicalScore + exactMatchBoost + qualityBoost + correctedBoost + recencyBoost * 0.1;

        const translation = {
          id: String(row['id']),
          createdAt: (row['created_at'] as unknown) || null,
          updatedAt: (row['updated_at'] as unknown) || null,
          sourceText: String(row['source_text'] ?? ''),
          targetText: String(row['target_text'] ?? ''),
          correctedText: row['corrected_text'] as string | null,
          context: row['context'] as string | null,
          domain: row['domain'] as string | null,
          dialect: row['dialect'] as string | null,
          qualityScore: row['quality_score'] as string | null,
          reviewStatus: row['review_status'] as string | null,
          reviewNotes: row['review_notes'] as string | null,
          reviewedAt: row['reviewed_at'] as string | null,
          reviewedBy: row['reviewed_by'] as string | null,
        } as unknown as TranslationMemory;

        return {
          translation,
          score: finalScore,
          semanticScore,
          lexicalScore,
          qualityBoost,
          correctedBoost,
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

/**
 * Search for learning insights using vector similarity
 */
export async function searchLearningInsights(
  queryEmbedding: number[],
  options: SearchOptions = {}
): Promise<LearningInsightResult[]> {
  const { maxResults = 7, dialect } = options;
  
  try {
    const embeddingStr = `[${queryEmbedding.join(',')}]`;
    
    // Build WHERE conditions
    const whereConditions: string[] = [];
    const params: (string | string[] | number[])[] = [embeddingStr];
    let paramIndex = 2; // Start with $2 since $1 is the embedding
    
    // Add dialect condition if specified
    if (dialect) {
      whereConditions.push(`(source_translation_memory.dialect = $${paramIndex}::"Dialect" OR source_translation_memory.dialect IS NULL)`);
      params.push(dialect);
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    const query = `
      SELECT
        "LearningInsight".id,
        "LearningInsight".rule,
        "LearningInsight".category,
        "LearningInsight".confidence,
        "LearningInsight".explanation,
        "LearningInsight".domain,
        "LearningInsight".tags,
        COALESCE(1 - ("LearningInsight".embedding <=> $1::vector), 0) as semantic_score
      FROM "LearningInsight"
      LEFT JOIN translation_memory source_translation_memory
        ON "LearningInsight"."sourceTranslationMemoryId" = source_translation_memory.id
      ${whereClause}
      -- Note: We're not filtering out insights without embeddings anymore
      -- AND "LearningInsight".embedding IS NOT NULL
      ORDER BY COALESCE(1 - ("LearningInsight".embedding <=> $1::vector), 0) DESC
      LIMIT $${paramIndex}::int
    `;
    
    params.push(maxResults.toString());
    
    const rawResults = await prisma.$queryRawUnsafe(query, ...params) as unknown[];
    
    return (rawResults as Record<string, unknown>[]).map((row) => ({
      insight: {
        id: String(row.id),
        rule: String(row.rule),
        category: String(row.category),
        confidence: parseFloat(String(row.confidence)),
        explanation: row.explanation ? String(row.explanation) : null,
        domain: row.domain ? String(row.domain) : null,
        tags: Array.isArray(row.tags) ? row.tags : []
      },
      score: parseFloat(String(row.semantic_score)),
      semanticScore: parseFloat(String(row.semantic_score))
    }));
  } catch (error) {
    console.error('Learning insights search failed:', error);
    return [];
  }
}

/**
 * Search for grammar rules using vector similarity
 */
export async function searchRomaniGrammar(
  queryEmbedding: number[],
  options: SearchOptions = {}
): Promise<GrammarResult[]> {
  const { maxResults = 7, dialect } = options;
  
  try {
    const embeddingStr = `[${queryEmbedding.join(',')}]`;
    
    // Build WHERE conditions
    const whereConditions: string[] = [];
    const params: (string | string[] | number[])[] = [embeddingStr];
    let paramIndex = 2; // Start with $2 since $1 is the embedding
    
    // Add dialect condition if specified
    if (dialect) {
      whereConditions.push(`dialect = $${paramIndex}::"Dialect"`);
      params.push(dialect);
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    const query = `
      SELECT
        id,
        content,
        quality_score,
        COALESCE(1 - (embedding <=> $1::vector), 0) as semantic_score,
        similarity(content, '') as lexical_score
      FROM romani_grammar
      ${whereClause}
      AND embedding IS NOT NULL
      ORDER BY COALESCE(1 - (embedding <=> $1::vector), 0) DESC
      LIMIT $${paramIndex}::int
    `;
    
    params.push(maxResults.toString());
    
    const rawResults = await prisma.$queryRawUnsafe(query, ...params) as unknown[];
    
    return (rawResults as Record<string, unknown>[]).map((row) => ({
      id: String(row.id),
      content: String(row.content),
      qualityScore: row.quality_score ? String(row.quality_score) : null,
      score: parseFloat(String(row.semantic_score)),
      semanticScore: parseFloat(String(row.semantic_score)),
      lexicalScore: parseFloat(String(row.lexical_score))
    }));
  } catch (error) {
    console.error('Romani grammar search failed:', error);
    return [];
  }
}

/**
 * Search for vocabulary pairs using vector similarity
 */
export async function searchRomaniLexicon(
  queryEmbedding: number[],
  sourceText: string,
  options: SearchOptions = {}
): Promise<LexiconResult[]> {
  const { maxResults = 10, dialect, keywords } = options;
  
  try {
    const embeddingStr = `[${queryEmbedding.join(',')}]`;
    
    // Build WHERE conditions
    const whereConditions: string[] = [];
    const params: (string | string[] | number[])[] = [embeddingStr, sourceText];
    let paramIndex = 3; // Start with $3 since $1 is embedding and $2 is sourceText
    
    // Add dialect condition if specified
    if (dialect) {
      whereConditions.push(`dialect = $${paramIndex}::"Dialect"`);
      params.push(dialect);
      paramIndex++;
    }
    
    // Add keyword boost conditions if specified
    // We'll use keywords to boost similarity scores rather than filter results
    let keywordBoost = '';
    if (keywords && keywords.length > 0) {
      // Create a boost factor based on keyword matches
      const keywordMatches = keywords.map((keyword) =>
        `CASE WHEN source_text ILIKE '%${keyword}%' THEN 0.3 ELSE 0 END`
      ).join(' + ');
      keywordBoost = ` + ${keywordMatches}`;
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    const query = `
      SELECT
        id,
        source_text,
        target_text,
        COALESCE(1 - (embedding <=> $1::vector), 0) as semantic_score,
        similarity(source_text, $2) as lexical_score,
        CASE WHEN source_text = $2 THEN 0.5 ELSE 0 END as exact_match_boost
      FROM romani_lexicon
      ${whereClause}
      AND embedding IS NOT NULL
      ORDER BY (COALESCE(1 - (embedding <=> $1::vector), 0) + similarity(source_text, $2) + CASE WHEN source_text = $2 THEN 0.5 ELSE 0 END${keywordBoost}) DESC
      LIMIT $${paramIndex}::int
    `;
    
    // Add maxResults parameter at the correct position
    // We need to insert it at the right position in the params array
    // The position should be paramIndex (which is the next available index)
    const paramsWithLimit = [...params];
    paramsWithLimit.push(maxResults.toString());
    
    const rawResults = await prisma.$queryRawUnsafe(query, ...paramsWithLimit) as unknown[];
    
    return (rawResults as Record<string, unknown>[]).map((row) => ({
      id: String(row.id),
      sourceText: String(row.source_text),
      targetText: String(row.target_text),
      score: parseFloat(String(row.semantic_score)) + parseFloat(String(row.lexical_score)) + parseFloat(String(row.exact_match_boost || 0)),
      semanticScore: parseFloat(String(row.semantic_score)),
      lexicalScore: parseFloat(String(row.lexical_score)),
      exactMatchBoost: parseFloat(String(row.exact_match_boost || 0))
    }));
  } catch (error) {
    console.error('Romani lexicon search failed:', error);
    return [];
  }
}

/**
 * Search for translation examples using vector similarity
 */
export async function searchTranslationMemory(
  queryEmbedding: number[],
  options: SearchOptions = {}
): Promise<TranslationExample[]> {
  const { maxResults = 7, dialect, domain } = options;
  
  try {
    const embeddingStr = `[${queryEmbedding.join(',')}]`;
    
    // Build WHERE conditions
    const whereConditions: string[] = ['review_status = \'APPROVED\''];
    const params: (string | string[] | number[])[] = [embeddingStr];
    let paramIndex = 2; // Start with $2 since $1 is the embedding
    
    // Add domain condition if specified
    if (domain) {
      whereConditions.push(`domain = $${paramIndex}`);
      params.push(domain);
      paramIndex++;
    }
    
    // Add dialect condition if specified
    if (dialect) {
      whereConditions.push(`dialect = $${paramIndex}::"Dialect"`);
      params.push(dialect);
      paramIndex++;
    }
    
    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
    
    const query = `
      SELECT
        id,
        source_text,
        target_text,
        corrected_text,
        context,
        domain,
        dialect,
        quality_score,
        review_status,
        COALESCE(1 - (embedding <=> $1::vector), 0) as semantic_score,
        (similarity(source_text, '') + similarity(COALESCE(corrected_text, target_text), '') + COALESCE(similarity(context, ''), 0)) / 3 as lexical_score,
        CASE quality_score WHEN 'A' THEN ${CONFIG.RETRIEVAL.QUALITY_BOOST_MAP.A} WHEN 'B' THEN ${CONFIG.RETRIEVAL.QUALITY_BOOST_MAP.B} WHEN 'C' THEN ${CONFIG.RETRIEVAL.QUALITY_BOOST_MAP.C} WHEN 'D' THEN ${CONFIG.RETRIEVAL.QUALITY_BOOST_MAP.D} ELSE 0 END as quality_boost,
        CASE WHEN corrected_text IS NOT NULL THEN 0.15 ELSE 0 END as corrected_boost,
        GREATEST(0, 1 - (EXTRACT(days FROM NOW() - created_at) / ${CONFIG.RETRIEVAL.RECENCY_DECAY_DAYS})) as recency_boost
      FROM translation_memory
      ${whereClause}
      AND embedding IS NOT NULL
      ORDER BY (
        COALESCE(1 - (embedding <=> $1::vector), 0) +
        (similarity(source_text, '') + similarity(COALESCE(corrected_text, target_text), '') + COALESCE(similarity(context, ''), 0)) / 3 +
        CASE quality_score WHEN 'A' THEN ${CONFIG.RETRIEVAL.QUALITY_BOOST_MAP.A} WHEN 'B' THEN ${CONFIG.RETRIEVAL.QUALITY_BOOST_MAP.B} WHEN 'C' THEN ${CONFIG.RETRIEVAL.QUALITY_BOOST_MAP.C} WHEN 'D' THEN ${CONFIG.RETRIEVAL.QUALITY_BOOST_MAP.D} ELSE 0 END +
        CASE WHEN corrected_text IS NOT NULL THEN 0.15 ELSE 0 END +
        GREATEST(0, 1 - (EXTRACT(days FROM NOW() - created_at) / ${CONFIG.RETRIEVAL.RECENCY_DECAY_DAYS})) * 0.1
      ) DESC
      LIMIT $${paramIndex}::int
    `;
    
    params.push(maxResults.toString());
    
    const rawResults = await prisma.$queryRawUnsafe(query, ...params) as unknown[];
    
    return (rawResults as Record<string, unknown>[]).map((row) => {
      const semanticScore = parseFloat(String(row.semantic_score)) || 0;
      const lexicalScore = parseFloat(String(row.lexical_score)) || 0;
      const qualityBoost = parseFloat(String(row.quality_boost)) || 0;
      const correctedBoost = parseFloat(String(row.corrected_boost)) || 0;
      const recencyBoost = parseFloat(String(row.recency_boost)) || 0;
      
      const finalScore = semanticScore + lexicalScore + qualityBoost + correctedBoost + recencyBoost * 0.1;
      
      return {
        id: String(row.id),
        sourceText: String(row.source_text),
        targetText: String(row.target_text),
        correctedText: row.corrected_text ? String(row.corrected_text) : null,
        context: row.context ? String(row.context) : null,
        domain: row.domain ? String(row.domain) : null,
        dialect: row.dialect ? String(row.dialect) : null,
        score: finalScore,
        semanticScore,
        lexicalScore,
        qualityBoost,
        correctedBoost,
        recencyBoost
      };
    });
  } catch (error) {
    console.error('Translation memory search failed:', error);
    return [];
  }
}

/**
 * Unified retrieval service that queries all four data sources in parallel
 * and returns structured results for use in the translation prompt
 */
export async function unifiedRetrieval(
  query: string,
  options: SearchOptions = {}
): Promise<{
  learningInsights: LearningInsightResult[];
  grammarRules: GrammarResult[];
  vocabulary: LexiconResult[];
  examples: TranslationExample[];
}> {
  try {
    console.log(`🔍 Performing unified retrieval for: "${query}"`);
    
    // Generate query embedding
    const queryEmbedding = await generateEmbedding(query);
    
    // Query all four data sources in parallel
    const [learningInsights, grammarRules, vocabulary, examples] = await Promise.all([
      searchLearningInsights(queryEmbedding, options),
      searchRomaniGrammar(queryEmbedding, options),
      searchRomaniLexicon(queryEmbedding, query, options),
      searchTranslationMemory(queryEmbedding, options)
    ]);
    
    console.log(`✅ Unified retrieval completed:
      - Learning insights: ${learningInsights.length}
      - Grammar rules: ${grammarRules.length}
      - Vocabulary entries: ${vocabulary.length}
      - Translation examples: ${examples.length}`);
    
    return {
      learningInsights,
      grammarRules,
      vocabulary,
      examples
    };
 } catch (error) {
    console.error('Unified retrieval failed:', error);
    throw new Error(`Unified retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
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
import { translateText, buildTranslationPrompt, buildStructuredTranslationPrompt } from '@/lib/ai';
import { unifiedRetrieval, hybridSearch, extractKeywords } from '@/lib/retrieval';
import { authFallback as auth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Simple auth check (optional in local dev)
    const requireAuth = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    if (requireAuth) {
      const { userId } = auth();
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

  const { sourceText, context, domain, dialect, style } = await request.json();

    if (!sourceText?.trim()) {
      return NextResponse.json(
        { error: 'Source text is required' },
        { status: 400 }
      );
    }

    // Extract keywords from the source text for smarter search
    const keywords = extractKeywords(sourceText.trim());
    
    // Search for similar translations first (for backward compatibility)
    const similarTranslations = await hybridSearch(sourceText.trim(), {
      maxResults: 20,
      domain,
      dialect,
      keywords, // Pass extracted keywords for pre-filtering
    });

    // Perform unified retrieval from all four data sources
    const retrievalData = await unifiedRetrieval(sourceText.trim(), {
      maxResults: 20, // Increase results for better AI context
      domain,
      dialect,
      keywords, // Pass extracted keywords for pre-filtering
    });

    // Build the structured prompt incorporating all data sources
    const structuredPrompt = buildStructuredTranslationPrompt(
      sourceText.trim(),
      context,
      domain,
      dialect,
      style,
      retrievalData
    );

    // Get AI translation with structured prompt
    const aiResult = await translateText({
      sourceText: sourceText.trim(),
      context,
      domain,
      dialect,
      style,
      // Pass retrieval data to use the structured prompt
      retrievalData,
    });

    // Also get translation with old prompt for comparison
    const oldPrompt = buildTranslationPrompt(
      sourceText.trim(),
      context,
      domain,
      dialect,
      style,
      retrievalData.examples.map(example => ({
        sourceText: example.sourceText,
        targetText: example.correctedText || example.targetText,
        context: example.context || null,
      })).slice(0, 3)
    );

    return NextResponse.json({
      translatedText: aiResult.translatedText,
      confidence: aiResult.confidence,
      explanation: aiResult.explanation,
      modelUsed: aiResult.modelUsed,
      attempts: aiResult.attempts,
      retrievalData: {
        learningInsights: retrievalData.learningInsights,
        grammarRules: retrievalData.grammarRules,
        vocabulary: retrievalData.vocabulary,
        examples: retrievalData.examples,
      },
      debugInfo: {
        prompt: structuredPrompt,
        oldPrompt,
        retrievalParams: {
          maxResults: 20,
          domain,
          dialect,
        },
        examplesWithSource: similarTranslations.map(result => {
          // Determine which table the translation came from based on available fields
          let tableName = 'translation_memory';
          // romani_lexicon has quality_score and review_status as NULL but has targetText
          if (result.translation.qualityScore === null && result.translation.reviewStatus === null && result.translation.targetText) {
            tableName = 'romani_lexicon';
          }
          // romani_grammar and romani_style both have targetText as NULL
          else if (!result.translation.targetText) {
            // Distinguish between romani_grammar and romani_style based on sourceText length
            // Grammar entries are typically longer than style entries
            tableName = result.translation.sourceText.length > 200 ? 'romani_grammar' : 'romani_style';
          }

          return {
            translation: {
              id: result.translation.id,
              sourceText: result.translation.sourceText,
              targetText: result.translation.correctedText || result.translation.targetText,
              context: result.translation.context,
              domain: result.translation.domain,
              dialect: result.translation.dialect,
            },
            tableName,
            scoringDetails: {
              semanticScore: result.semanticScore,
              lexicalScore: result.lexicalScore,
              exactMatchBoost: result.exactMatchBoost || 0,
              qualityBoost: result.qualityBoost,
              correctedBoost: result.correctedBoost || 0,
              recencyBoost: result.recencyBoost,
              finalScore: result.score
            }
          };
        })
      }
    });
  } catch (error) {
    console.error('Translation API error:', error);
    // Bubble a structured error so UI can show retry/connected state
    const err = error as { code?: string; attempts?: number };
    const code = err?.code || 'UNKNOWN';
    const attempts = err?.attempts || 0;
    const message = code === 'MODEL_UNAVAILABLE' ? 'Gemini 2.5 model unavailable. Retried and failed.' : 'Translation failed';
    return NextResponse.json({ error: message, code, attempts }, { status: 503 });
  }
}
```

*File: `app/api/correct/route.ts`*

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateEmbedding } from '@/lib/embedding';
import { authFallback as auth } from '@/lib/auth';
import { generateLearningInsight } from '@/lib/ai-analyzer';
import type { QualityScore } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const requireAuth = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    const { userId } = auth();
    if (requireAuth && !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      sourceText,
      originalTranslation,
      correctedTranslation,
      context,
      domain,
      dialect,
    } = await request.json();

    console.log('🔔 /api/correct called with', { sourceText: sourceText?.slice?.(0,200), originalTranslation, correctedTranslation, context, domain, dialect });

    if (!sourceText?.trim() || !correctedTranslation?.trim()) {
      return NextResponse.json(
        { error: 'Source text and corrected translation are required' },
        { status: 400 }
      );
    }

    // Generate a single combined embedding for source + corrected (or target)
    const combinedText = `${sourceText}\n${correctedTranslation}`;
    const combinedEmbedding = await generateEmbedding(combinedText, { dialect });

    // Determine quality score based on whether correction was made
    const wasCorrection = originalTranslation !== correctedTranslation;
    const qualityScore: QualityScore = wasCorrection ? 'B' : 'A'; // Corrected = B, Approved = A

    // Debug log to confirm whether we detected a correction
    console.log('🪪 Debug: originalTranslation=', originalTranslation, 'correctedTranslation=', correctedTranslation, 'wasCorrection=', wasCorrection);

    // Save to database (without embeddings first)
    type CreateTranslationMemoryInput = {
      sourceText: string;
      targetText?: string | null;
      correctedText?: string | null;
      context?: string | null;
      domain?: string | null;
      qualityScore: QualityScore;
      reviewStatus: string;
      reviewedBy?: string | null;
      reviewedAt?: Date | null;
    };

    const data: CreateTranslationMemoryInput = {
      sourceText: sourceText.trim(),
      targetText: originalTranslation,
      correctedText: wasCorrection ? correctedTranslation.trim() : null,
      context: context?.trim() || null,
      domain: domain?.trim() || null,
      qualityScore,
      reviewStatus: 'APPROVED',
      reviewedBy: userId,
      reviewedAt: new Date(),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const translation = await prisma.translationMemory.create({ data: data as any });

    // Persist dialect using raw SQL to avoid client type drift
    try {
      const DIALECTS = ['Lovari','Kelderash','Arli'] as const;
      type DialectType = (typeof DIALECTS)[number];
      const d = (typeof dialect === 'string' && (DIALECTS as readonly string[]).includes(dialect)) ? (dialect as DialectType) : null;
      await prisma.$executeRawUnsafe(
        `UPDATE translation_memory SET dialect = $1::"Dialect" WHERE id = $2`,
        d,
        translation.id
      );
    } catch (e) {
      console.error('Failed to set dialect column:', e);
    }

    // Persist combined embedding using raw SQL for pgvector column
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE translation_memory SET embedding = $1::vector WHERE id = $2`,
        `[${combinedEmbedding.join(',')}]`,
        translation.id
      );
    } catch (e) {
      console.error('Failed to store embedding, continuing without it:', e);
    }

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

    // Trigger the learning loop asynchronously but await it (bounded) so Vercel doesn't kill it
    if (wasCorrection) {
        const triggerLearningLoop = async (translationId: string) => {
          // create a small run id for tracing across logs
          const runId = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
          console.log('\ud83d\udd14 Starting learning loop (correction) run:', runId, 'translationId:', translationId);
          try {
            // Re-fetch the translation row to avoid any closure/race issues
            const row = await prisma.translationMemory.findUnique({ where: { id: translationId } });
            if (!row) {
              console.warn('[learning-loop] translation row not found for id:', translationId);
              return;
            }

            const dialectRow = (row.dialect as string) || 'Lovari';
            const domainRow = row.domain || '';
            const src = row.sourceText || '';
            const original = row.targetText || '';
            const corrected = row.correctedText || row.targetText || '';

            console.log('[learning-loop]', runId, 'using source snippet:', src.slice(0,80));

            // Generate learning insight using the AI analyzer with fresh DB values
            const insightData = await generateLearningInsight(
              src,
              original,
              corrected,
              dialectRow,
              domainRow,
              [] // tags
            );

            // Only proceed if we got insight data
            if (insightData) {
              console.log('[learning-loop]', runId, '\u2705 Generated learning insight:', insightData);

              // Create a placeholder learning insight immediately to reserve association with this translation
              const placeholder = await prisma.learningInsight.create({
                data: {
                  rule: insightData.rule.slice(0, 64), // short provisional text
                  category: insightData.category,
                  confidence: insightData.confidence || 0,
                  explanation: insightData.explanation?.slice?.(0, 200) || '',
                  sourceTranslationMemoryId: translationId,
                  domain: domainRow || null,
                  tags: [],
                }
              });
              console.log('[learning-loop]', runId, '\u2705 Created placeholder learning insight in database:', placeholder.id);

              // Generate embedding for the rule
              const ruleEmbedding = await generateEmbedding(insightData.rule, { dialect: dialectRow as 'Lovari' | 'Kelderash' | 'Arli' | undefined });
              console.log('[learning-loop]', runId, '\u2705 Generated rule embedding with length:', ruleEmbedding.length);

              // Update the placeholder row with final values
              try {
                const updated = await prisma.learningInsight.update({ where: { id: placeholder.id }, data: {
                  rule: insightData.rule,
                  explanation: insightData.explanation,
                  confidence: insightData.confidence,
                }});
                console.log('[learning-loop]', runId, '\u2705 Updated placeholder with final insight:', updated.id);

                // Update the embedding using raw SQL
                await prisma.$executeRawUnsafe(
                  `UPDATE "LearningInsight" SET embedding = $1::vector WHERE id = $2`,
                  `[${ruleEmbedding.join(',')}]`,
                  updated.id
                );
                console.log('[learning-loop]', runId, '\u2705 Successfully updated learning insight embedding');
              } catch (e) {
                console.error('[learning-loop] Failed to update placeholder or embedding:', e);
              }
            }
          } catch (error) {
            console.error('[learning-loop] Failed to generate learning insight:', error);
          }
        };

      // Await the loop (bounded) so serverless doesn't kill it prematurely
      try {
        // Synchronously await the learning loop to enforce correct ordering while debugging
        console.log('[learning-loop] awaiting learning loop synchronously for id:', translation.id);
        await triggerLearningLoop(translation.id);
        console.log('[learning-loop] completed for id:', translation.id);
      } catch (e) {
        console.error('Learning loop failed:', e);
      }
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
