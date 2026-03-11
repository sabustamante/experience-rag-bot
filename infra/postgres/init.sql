-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Experience chunks table for RAG pipeline
-- Schema matches PgVectorAdapter: metadata JSONB stores category, tags, source_file, etc.
CREATE TABLE IF NOT EXISTS experience_chunks (
  id        TEXT        PRIMARY KEY,
  content   TEXT        NOT NULL,
  metadata  JSONB       NOT NULL DEFAULT '{}',
  embedding vector(1024)
);

-- hnsw index for approximate nearest-neighbour search
-- (works correctly for small datasets; ivfflat requires >= lists rows)
CREATE INDEX IF NOT EXISTS experience_chunks_embedding_idx
  ON experience_chunks
  USING hnsw (embedding vector_cosine_ops);
