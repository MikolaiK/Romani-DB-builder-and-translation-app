
* It’s **agent-friendly** (clear steps, modular, no hidden assumptions).
* It can be **plugged into your existing stack**.
* It includes both **backend ingestion pipeline** and **frontend UI tab/page** for managing uploads & monitoring progress.

Here’s a structured plan:

---

# 📄 Ingestion Implementation Spec (AI-Agent Ready)

## 1. Purpose

Add a new **Ingestion module** to your translation app.
This module enables you (or users) to upload new corpora (texts, documents, glossaries, etc.), clean & preprocess them, generate embeddings, and insert them into the **PostgreSQL + pgvector** database. It will live on its own **page/tab in the UI**.

---

## 2. User Flow

1. User navigates to **“Ingestion” tab** in the UI.
2. User uploads files (TXT, DOCX, PDF, CSV, JSON, etc.) or pastes text directly.
3. Backend runs **pipeline**:

   * File parsing → text segmentation → cleaning → chunking → embedding.
   * Metadata extraction (filename, dialect, source type, timestamp).
4. Insert vectors + metadata into **Postgres (pgvector)**.
5. UI displays **status/progress** + history of ingested batches.
6. Data is now available for hybrid search in the translation system.

---

## 3. Backend Implementation

### 3.1. API Endpoints

* `POST /api/ingest/upload`
  Accepts file(s) or raw text. Triggers pipeline.

* `GET /api/ingest/status/:job_id`
  Returns job progress (% complete, errors, inserted row count).

* `GET /api/ingest/history`
  Returns list of past ingestion jobs with metadata.

---

### 3.2. Ingestion Pipeline (Modular)

Pipeline stages (AI-agents can implement as separate Python modules/classes):

1. **File Handling**

   * Detect format → parse text.
   * Libraries: `python-docx`, `pdfplumber`, `csv`, `json`, `chardet` (for encoding).

2. **Preprocessing**

   * Normalize whitespace, strip HTML tags, lowercasing (optional).
   * Remove stopwords/non-language tokens (configurable).

3. **Segmentation / Chunking**

   * Sentence or paragraph splitting (e.g., `nltk`, `spacy`).
   * Chunk to `~500-1000 tokens` with overlap.

4. **Embedding**

   * Use your existing embedding model.
   * Store both **dense vector** + optional **sparse BM25 index** for hybrid retrieval.

5. **Database Insert**

   * Schema (example):

```sql
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    embedding VECTOR(1536), -- adjust dim to your model
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
```

* Metadata fields:

  * `filename`
  * `dialect`
  * `source_type` ("pdf", "txt", "manual\_input")
  * `chunk_index`
  * `job_id`

---

## 4. Frontend Implementation (Ingestion Tab)

### 4.1. UI Elements

* **Upload area**: drag & drop, file selector, text input box.
* **Job progress panel**: progress bar, current stage (Parsing → Embedding → Inserting).
* **History panel**: list of previous jobs (date, filename, row count, dialect, status).
* **Error panel**: if ingestion failed (bad format, DB error).

### 4.2. Integration

* Use your app’s existing frontend stack (React/Vue/Svelte).
* Poll `/api/ingest/status/:job_id` for real-time updates.
* Jobs can be displayed in a **card/grid layout** for clarity.

---

## 5. Configurability

* **Chunk size** and **embedding dimension** configurable in `.env` or settings panel.
* **Dialect tagging**: optional dropdown in UI before ingestion.
* **Stopword list**: per dialect, stored in config.

---

## 6. Error Handling & Logging

* Invalid file format → return `400 Bad Request`.
* Pipeline exception → log + show error in UI.
* Store ingestion logs in a `ingestion_logs` table for debugging.

---

## 7. Extensions (Optional)

* **Bulk ingestion**: multiple files processed in one job.
* **Preview before ingest**: show first N chunks in UI.
* **Versioning**: keep track of which dataset version entries came from.
* **Scheduled ingestion**: e.g., auto-scan folder every X hours.

---

✅ This spec is **agent-friendly**: each step is modular, has clear API endpoints, and can be coded in isolation. Your coding agent can take one section at a time and implement it without ambiguity.

---
