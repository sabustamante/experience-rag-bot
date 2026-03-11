/**
 * Seed script — generates embeddings for all experience chunks and upserts into pgvector.
 * Run: pnpm --filter @repo/api seed
 *
 * Requires:
 *   - PostgreSQL running with pgvector extension
 *   - AWS credentials configured (Bedrock access)
 *   - .env file with DB_* and AWS_* variables
 */
import "reflect-metadata";

import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(__dirname, "../.env") });

import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { Pool } from "pg";

import { chunkExperienceData, parseExperienceData } from "@repo/experience-data";

// ─── Config ───────────────────────────────────────────────────────────────────

const EMBEDDING_MODEL_ID =
  process.env["BEDROCK_EMBEDDING_MODEL_ID"] ?? "amazon.titan-embed-text-v2:0";
const AWS_REGION = process.env["AWS_REGION"] ?? "us-east-1";

const pool = new Pool({
  host: process.env["DB_HOST"] ?? "localhost",
  port: parseInt(process.env["DB_PORT"] ?? "5432"),
  database: process.env["DB_NAME"] ?? "experience_rag",
  user: process.env["DB_USER"] ?? "postgres",
  password: process.env["DB_PASSWORD"] ?? "postgres",
});

const bedrockClient = new BedrockRuntimeClient({ region: AWS_REGION });

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function embed(text: string): Promise<number[]> {
  const body = JSON.stringify({ inputText: text, dimensions: 1024, normalize: true });
  const command = new InvokeModelCommand({
    modelId: EMBEDDING_MODEL_ID,
    body,
    contentType: "application/json",
    accept: "application/json",
  });
  const response = await bedrockClient.send(command);
  const parsed = JSON.parse(new TextDecoder().decode(response.body)) as {
    embedding: number[];
  };
  return parsed.embedding;
}

async function ensureSchema() {
  await pool.query("CREATE EXTENSION IF NOT EXISTS vector");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS experience_chunks (
      id       TEXT PRIMARY KEY,
      content  TEXT NOT NULL,
      metadata JSONB NOT NULL DEFAULT '{}',
      embedding vector(1024)
    )
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS experience_chunks_embedding_idx
    ON experience_chunks USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100)
  `);
}

async function upsertChunk(id: string, content: string, metadata: unknown, embedding: number[]) {
  const vectorLiteral = `[${embedding.join(",")}]`;
  await pool.query(
    `INSERT INTO experience_chunks (id, content, metadata, embedding)
     VALUES ($1, $2, $3, $4::vector)
     ON CONFLICT (id) DO UPDATE
     SET content = EXCLUDED.content,
         metadata = EXCLUDED.metadata,
         embedding = EXCLUDED.embedding`,
    [id, content, JSON.stringify(metadata), vectorLiteral],
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Starting seed...\n");

  await ensureSchema();
  console.log("✓ Database schema ready\n");

  const data = parseExperienceData();
  const chunks = chunkExperienceData(data);

  console.log(`Found ${chunks.length} chunks to embed and upsert\n`);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const preview = chunk.content.slice(0, 60).replace(/\n/g, " ");
    process.stdout.write(`[${i + 1}/${chunks.length}] ${chunk.chunkId}: "${preview}..." `);

    const embedding = await embed(chunk.content);
    await upsertChunk(chunk.chunkId, chunk.content, chunk.metadata, embedding);

    console.log(`✓ (${embedding.length} dims)`);
  }

  console.log(`\n✅ Seed complete — ${chunks.length} chunks in pgvector`);
  await pool.end();
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
