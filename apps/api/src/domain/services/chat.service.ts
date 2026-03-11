import { Inject, Injectable } from "@nestjs/common";

import type { ChatMessage } from "@repo/shared-types";

import type { IEmbeddingProvider, ILLMProvider, IVectorStore } from "../ports";
import { PORT_TOKENS } from "../ports";
import { ExperienceService } from "./experience.service";

const SYSTEM_PROMPT = `You are a professional career assistant with deep knowledge of the person's
professional experience, skills, projects, and achievements. Your role is to answer questions
about their career history accurately and concisely, grounding every answer in the provided
context. If the context does not contain enough information to answer, say so honestly.
Do not invent or speculate about experience not present in the context.`;

const TOP_K = 5;

@Injectable()
export class ChatService {
  constructor(
    @Inject(PORT_TOKENS.LLM_PROVIDER) private readonly llm: ILLMProvider,
    @Inject(PORT_TOKENS.VECTOR_STORE) private readonly vectorStore: IVectorStore,
    @Inject(PORT_TOKENS.EMBEDDING_PROVIDER)
    private readonly embeddings: IEmbeddingProvider,
    private readonly experienceService: ExperienceService,
  ) {}

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
    yield* this.llm.stream(messages, { systemPrompt: SYSTEM_PROMPT });
  }
}
