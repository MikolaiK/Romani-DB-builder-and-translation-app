export const CONFIG = {
  EMBEDDING: {
    DIMENSION: 1536,
    MODEL_NAME: 'gemini-embedding-001',
    PROVIDER: 'google',
    BATCH_SIZE: 10,
    RATE_LIMIT_DELAY: 100,
  },
  DATABASE: {
    VECTOR_DIMENSION: 1536,
    POSTGRESQL_VERSION: '16',
    DOCKER_IMAGE: 'pgvector/pgvector:pg16',
  },
  RETRIEVAL: {
    DEFAULT_ALPHA: 0.7,
    MIN_LEXICAL_SCORE: 0.01,
    RECENCY_DECAY_DAYS: 365,
    QUALITY_BOOST_MAP: { A: 0.15, B: 0.05, C: 0.0, D: -0.1 },
    MAX_RESULTS: 10,
  },
  LIMITS: {
    MAX_QUERY_LENGTH: 1200,
    MAX_CORRECTION_LENGTH: 2000,
    MIN_CORRECTION_LENGTH: 3,
  },
} as const;

export type AppConfig = typeof CONFIG;
