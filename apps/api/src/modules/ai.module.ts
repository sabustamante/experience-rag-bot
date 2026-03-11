import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { BedrockClaudeAdapter } from "../infrastructure/ai/bedrock-claude.adapter";
import { BedrockTitanEmbeddingAdapter } from "../infrastructure/ai/bedrock-titan-embedding.adapter";
import { PORT_TOKENS } from "../domain/ports";

@Module({
  providers: [
    BedrockClaudeAdapter,
    BedrockTitanEmbeddingAdapter,
    {
      provide: PORT_TOKENS.LLM_PROVIDER,
      useFactory: (config: ConfigService, bedrock: BedrockClaudeAdapter) => {
        const provider = config.get<string>("AI_LLM_PROVIDER", "bedrock");
        if (provider === "bedrock") return bedrock;
        throw new Error(`Unknown LLM provider: ${provider}`);
      },
      inject: [ConfigService, BedrockClaudeAdapter],
    },
    {
      provide: PORT_TOKENS.EMBEDDING_PROVIDER,
      useFactory: (config: ConfigService, titan: BedrockTitanEmbeddingAdapter) => {
        const provider = config.get<string>("AI_EMBEDDING_PROVIDER", "bedrock");
        if (provider === "bedrock") return titan;
        throw new Error(`Unknown embedding provider: ${provider}`);
      },
      inject: [ConfigService, BedrockTitanEmbeddingAdapter],
    },
  ],
  exports: [PORT_TOKENS.LLM_PROVIDER, PORT_TOKENS.EMBEDDING_PROVIDER],
})
export class AIModule {}
