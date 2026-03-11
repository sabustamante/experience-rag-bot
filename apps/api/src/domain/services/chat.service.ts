import * as fs from "fs";
import * as path from "path";

import { Inject, Injectable } from "@nestjs/common";

import type { ChatMessage } from "@repo/shared-types";

import type { IEmbeddingProvider, ILLMProvider, IVectorStore } from "../ports";
import { PORT_TOKENS } from "../ports";
import { ExperienceService } from "./experience.service";

function loadSystemPrompt(): string {
  const base = process.cwd();
  const personal = path.join(base, "system-prompt.md");
  const example = path.join(base, "system-prompt.example.md");
  if (fs.existsSync(personal)) return fs.readFileSync(personal, "utf-8").trim();
  if (fs.existsSync(example)) return fs.readFileSync(example, "utf-8").trim();
  throw new Error(
    "No system prompt file found. Add system-prompt.md or system-prompt.example.md next to the API.",
  );
}

const TOP_K = 5;

@Injectable()
export class ChatService {
  private readonly systemPrompt: string;

  constructor(
    @Inject(PORT_TOKENS.LLM_PROVIDER) private readonly llm: ILLMProvider,
    @Inject(PORT_TOKENS.VECTOR_STORE) private readonly vectorStore: IVectorStore,
    @Inject(PORT_TOKENS.EMBEDDING_PROVIDER)
    private readonly embeddings: IEmbeddingProvider,
    private readonly experienceService: ExperienceService,
  ) {
    this.systemPrompt = loadSystemPrompt();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async *chat(message: string, _sessionId: string): AsyncIterable<string> {
    // 1. Embed the user query
    const queryEmbedding = await this.embeddings.embed(message);

    // 2. Semantic vector search
    const results = await this.vectorStore.search(queryEmbedding, TOP_K);

    // 3. Assemble context from search results
    const contextChunks = this.experienceService.assembleContext(results);
    const context = contextChunks.join("\n\n---\n\n");

    // 4. Build conversation with RAG context
    const messages: ChatMessage[] = [
      {
        id: crypto.randomUUID(),
        role: "user",
        content: `Context about the person's professional experience:\n\n${context}\n\n---\n\nQuestion: ${message}`,
        createdAt: new Date(),
      },
    ];

    // 5. Stream LLM response
    yield* this.llm.stream(messages, { systemPrompt: this.systemPrompt });
  }
}
