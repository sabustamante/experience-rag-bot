import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Pool } from "pg";

import type {
  ChunkMetadata,
  IVectorStore,
  MetadataFilter,
  VectorSearchResult,
} from "@repo/shared-types";

interface ChunkRow {
  id: string;
  content: string;
  score: string;
  metadata: ChunkMetadata;
}

@Injectable()
export class PgVectorAdapter implements IVectorStore, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PgVectorAdapter.name);
  private readonly pool: Pool;

  constructor(private readonly config: ConfigService) {
    this.pool = new Pool({
      host: this.config.get<string>("DB_HOST", "localhost"),
      port: this.config.get<number>("DB_PORT", 5432),
      database: this.config.get<string>("DB_NAME", "experience_rag"),
      user: this.config.get<string>("DB_USER", "postgres"),
      password: this.config.get<string>("DB_PASSWORD", "postgres"),
      max: 10,
    });
  }

  async onModuleInit() {
    await this.connectWithRetry();
    await this.ensureSchema();
    this.logger.log("PgVectorAdapter initialized — schema ready");
  }

  async onModuleDestroy() {
    await this.pool.end();
    this.logger.log("PgVectorAdapter — connection pool closed");
  }

  private async connectWithRetry(retries = 10, delayMs = 2000): Promise<void> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const client = await this.pool.connect();
        client.release();
        this.logger.log("Database connection established");
        return;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(`DB connection attempt ${attempt}/${retries} failed: ${message}`);
        if (attempt === retries) {
          throw new Error(`Could not connect to database after ${retries} attempts`);
        }
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  async upsert(
    chunkId: string,
    embedding: number[],
    content: string,
    metadata: ChunkMetadata,
  ): Promise<void> {
    const vectorLiteral = `[${embedding.join(",")}]`;
    await this.pool.query(
      `INSERT INTO experience_chunks (id, content, metadata, embedding)
       VALUES ($1, $2, $3, $4::vector)
       ON CONFLICT (id) DO UPDATE
       SET content = EXCLUDED.content,
           metadata = EXCLUDED.metadata,
           embedding = EXCLUDED.embedding`,
      [chunkId, content, JSON.stringify(metadata), vectorLiteral],
    );
  }

  async upsertBatch(
    chunks: Array<{
      chunkId: string;
      embedding: number[];
      content: string;
      metadata: ChunkMetadata;
    }>,
  ): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      for (const chunk of chunks) {
        await this.upsert(chunk.chunkId, chunk.embedding, chunk.content, chunk.metadata);
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async search(
    embedding: number[],
    topK: number,
    filters?: MetadataFilter[],
  ): Promise<VectorSearchResult[]> {
    const vectorLiteral = `[${embedding.join(",")}]`;

    let whereClause = "";
    const params: unknown[] = [vectorLiteral, topK];

    if (filters && filters.length > 0) {
      const conditions = filters.map((f) => {
        params.push(f.value);
        return `metadata->>'${f.field}' ${this.mapOperator(f.operator)} $${params.length}`;
      });
      whereClause = `WHERE ${conditions.join(" AND ")}`;
    }

    const query = `
      SELECT id, content, metadata,
             1 - (embedding <=> $1::vector) AS score
      FROM experience_chunks
      ${whereClause}
      ORDER BY embedding <=> $1::vector
      LIMIT $2
    `;

    const result = await this.pool.query<ChunkRow>(query, params);

    return result.rows.map((row) => ({
      chunkId: row.id,
      content: row.content,
      score: parseFloat(row.score),
      metadata: row.metadata,
    }));
  }

  async delete(chunkId: string): Promise<void> {
    await this.pool.query("DELETE FROM experience_chunks WHERE id = $1", [chunkId]);
  }

  async deleteAll(): Promise<void> {
    await this.pool.query("TRUNCATE TABLE experience_chunks");
  }

  private async ensureSchema(): Promise<void> {
    await this.pool.query("CREATE EXTENSION IF NOT EXISTS vector");
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS experience_chunks (
        id       TEXT PRIMARY KEY,
        content  TEXT NOT NULL,
        metadata JSONB NOT NULL DEFAULT '{}',
        embedding vector(1024)
      )
    `);
    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS experience_chunks_embedding_idx
      ON experience_chunks USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100)
    `);
  }

  private mapOperator(op: MetadataFilter["operator"]): string {
    const map: Record<MetadataFilter["operator"], string> = {
      eq: "=",
      neq: "!=",
      in: "IN",
      nin: "NOT IN",
      contains: "ILIKE",
    };
    return map[op];
  }
}
