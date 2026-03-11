-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Experience chunks table for RAG pipeline
CREATE TABLE IF NOT EXISTS experience_chunks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content     TEXT        NOT NULL,
  category    TEXT        NOT NULL,
  tags        TEXT[]      NOT NULL DEFAULT '{}',
  source_file TEXT        NOT NULL DEFAULT '',
  embedding   vector(1024),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ivfflat index for approximate nearest-neighbour search
-- lists = sqrt(expected_row_count); start with 100 and tune later
CREATE INDEX IF NOT EXISTS experience_chunks_embedding_idx
  ON experience_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
