import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { IEmbeddingProvider } from "@repo/shared-types";

@Injectable()
export class BedrockTitanEmbeddingAdapter implements IEmbeddingProvider, OnModuleInit {
  private readonly logger = new Logger(BedrockTitanEmbeddingAdapter.name);
  private readonly client: BedrockRuntimeClient;
  private readonly modelId: string;

  constructor(private readonly config: ConfigService) {
    this.client = new BedrockRuntimeClient({
      region: this.config.get<string>("AWS_REGION", "us-east-1"),
    });
    this.modelId = this.config.get<string>(
      "BEDROCK_EMBEDDING_MODEL_ID",
      "amazon.titan-embed-text-v2:0",
    );
  }

  async onModuleInit() {
    this.logger.log(`BedrockTitanEmbeddingAdapter initialized — model: ${this.modelId}`);
  }

  async embed(text: string): Promise<number[]> {
    const body = JSON.stringify({ inputText: text, dimensions: 1024, normalize: true });

    const command = new InvokeModelCommand({
      modelId: this.modelId,
      body,
      contentType: "application/json",
      accept: "application/json",
    });

    try {
      const response = await this.client.send(command);
      const parsed = JSON.parse(new TextDecoder().decode(response.body)) as {
        embedding: number[];
      };
      return parsed.embedding;
    } catch (err) {
      this.logger.error(`Embedding error for text: "${text.slice(0, 50)}..."`, err);
      throw err;
    }
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    // Titan v2 doesn't support batch — sequential with delay to avoid throttling
    const results: number[][] = [];
    for (const text of texts) {
      results.push(await this.embed(text));
    }
    return results;
  }

  getDimensions(): number {
    return 1024;
  }
}
