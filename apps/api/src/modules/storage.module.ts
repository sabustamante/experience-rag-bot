import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { PORT_TOKENS } from "../domain/ports";
import { InMemoryCacheAdapter } from "../infrastructure/cache/in-memory-cache.adapter";
import { MarkdownExperienceAdapter } from "../infrastructure/storage/markdown-experience.adapter";
import { PgVectorAdapter } from "../infrastructure/storage/pgvector.adapter";

@Module({
  providers: [
    MarkdownExperienceAdapter,
    PgVectorAdapter,
    InMemoryCacheAdapter,
    {
      provide: PORT_TOKENS.EXPERIENCE_SOURCE,
      useFactory: (config: ConfigService, markdown: MarkdownExperienceAdapter) => {
        const source = config.get<string>("EXPERIENCE_SOURCE", "markdown");
        if (source === "markdown") return markdown;
        throw new Error(`Unknown experience source: ${source}`);
      },
      inject: [ConfigService, MarkdownExperienceAdapter],
    },
    {
      provide: PORT_TOKENS.VECTOR_STORE,
      useExisting: PgVectorAdapter,
    },
    {
      provide: PORT_TOKENS.CACHE_PROVIDER,
      useFactory: (config: ConfigService, memory: InMemoryCacheAdapter) => {
        const provider = config.get<string>("CACHE_PROVIDER", "memory");
        if (provider === "memory") return memory;
        throw new Error(`Unknown cache provider: ${provider}`);
      },
      inject: [ConfigService, InMemoryCacheAdapter],
    },
  ],
  exports: [
    PORT_TOKENS.EXPERIENCE_SOURCE,
    PORT_TOKENS.VECTOR_STORE,
    PORT_TOKENS.CACHE_PROVIDER,
  ],
})
export class StorageModule {}
