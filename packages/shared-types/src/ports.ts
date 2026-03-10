import type { ChatMessage, ChatRole } from "./chat.js";
import type { ExperienceData } from "./experience.js";

// ─── LLM Provider ────────────────────────────────────────────────────────────

export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stopSequences?: string[];
  systemPrompt?: string;
}

export interface ILLMProvider {
  complete(messages: ChatMessage[], options?: LLMOptions): Promise<string>;
  stream(
    messages: ChatMessage[],
    options?: LLMOptions,
  ): AsyncIterable<string>;
}

// ─── Embedding Provider ───────────────────────────────────────────────────────

export interface IEmbeddingProvider {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}

// ─── Vector Store ─────────────────────────────────────────────────────────────

export interface ChunkMetadata {
  chunkId: string;
  source: string;
  type: "work_experience" | "project" | "skill" | "education" | "certification" | "summary";
  companyId?: string;
  projectId?: string;
  tags?: string[];
  [key: string]: unknown;
}

export interface MetadataFilter {
  field: string;
  operator: "eq" | "neq" | "in" | "nin" | "contains";
  value: unknown;
}

export interface VectorSearchResult {
  chunkId: string;
  content: string;
  score: number;
  metadata: ChunkMetadata;
}

export interface IVectorStore {
  upsert(
    chunkId: string,
    embedding: number[],
    content: string,
    metadata: ChunkMetadata,
  ): Promise<void>;
  upsertBatch(
    chunks: Array<{
      chunkId: string;
      embedding: number[];
      content: string;
      metadata: ChunkMetadata;
    }>,
  ): Promise<void>;
  search(
    embedding: number[],
    topK: number,
    filters?: MetadataFilter[],
  ): Promise<VectorSearchResult[]>;
  delete(chunkId: string): Promise<void>;
  deleteAll(): Promise<void>;
}

// ─── Relational Store ─────────────────────────────────────────────────────────

export interface IRelationalStore {
  findSession(sessionId: string): Promise<unknown | null>;
  createSession(sessionId: string): Promise<void>;
  appendMessage(
    sessionId: string,
    role: ChatRole,
    content: string,
  ): Promise<void>;
  getMessages(sessionId: string): Promise<ChatMessage[]>;
}

// ─── Experience Source ────────────────────────────────────────────────────────

export interface ExperienceChunk {
  chunkId: string;
  content: string;
  metadata: ChunkMetadata;
}

export interface IExperienceSource {
  load(): Promise<ExperienceData>;
  chunks(): Promise<ExperienceChunk[]>;
}

// ─── Cache Provider ───────────────────────────────────────────────────────────

export interface ICacheProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  has(key: string): Promise<boolean>;
}

// ─── Template Engine ──────────────────────────────────────────────────────────

export interface ITemplateEngine {
  render(templateName: string, variables: Record<string, unknown>): Promise<string>;
}
