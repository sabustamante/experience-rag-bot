import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelWithResponseStreamCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { ChatMessage, ILLMProvider, LLMOptions } from "@repo/shared-types";

interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

@Injectable()
export class BedrockClaudeAdapter implements ILLMProvider, OnModuleInit {
  private readonly logger = new Logger(BedrockClaudeAdapter.name);
  private readonly client: BedrockRuntimeClient;
  private readonly modelId: string;

  constructor(private readonly config: ConfigService) {
    this.client = new BedrockRuntimeClient({
      region: this.config.get<string>("AWS_REGION", "us-east-1"),
    });
    this.modelId = this.config.get<string>(
      "BEDROCK_MODEL_ID",
      "anthropic.claude-3-5-haiku-20241022-v1:0",
    );
  }

  onModuleInit() {
    this.logger.log(`BedrockClaudeAdapter initialized — model: ${this.modelId}`);
  }

  async complete(messages: ChatMessage[], options?: LLMOptions): Promise<string> {
    const tokens: string[] = [];
    for await (const token of this.stream(messages, options)) {
      tokens.push(token);
    }
    return tokens.join("");
  }

  async *stream(messages: ChatMessage[], options?: LLMOptions): AsyncIterable<string> {
    const claudeMessages = this.toClaudeMessages(messages);

    const body = JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: options?.maxTokens ?? 2048,
      temperature: options?.temperature ?? 0.7,
      top_p: options?.topP ?? 0.9,
      system: options?.systemPrompt,
      messages: claudeMessages,
      stop_sequences: options?.stopSequences,
    });

    const command = new InvokeModelWithResponseStreamCommand({
      modelId: this.modelId,
      body,
      contentType: "application/json",
      accept: "application/json",
    });

    try {
      const response = await this.client.send(command);

      if (!response.body) return;

      for await (const event of response.body) {
        if (event.chunk?.bytes) {
          const decoded = new TextDecoder().decode(event.chunk.bytes);
          const parsed = JSON.parse(decoded) as {
            type: string;
            delta?: { type: string; text?: string };
          };

          if (parsed.type === "content_block_delta" && parsed.delta?.text) {
            yield parsed.delta.text;
          }
        }
      }
    } catch (err) {
      this.logger.error("Bedrock streaming error", err);
      throw err;
    }
  }

  async completeStructured<T>(
    messages: ChatMessage[],
    schema: { parse: (data: unknown) => T },
    options?: LLMOptions,
  ): Promise<T> {
    const claudeMessages = this.toClaudeMessages(messages);

    const body = JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: options?.maxTokens ?? 1024,
      temperature: options?.temperature ?? 0.3,
      system: options?.systemPrompt,
      messages: claudeMessages,
    });

    const command = new InvokeModelCommand({
      modelId: this.modelId,
      body,
      contentType: "application/json",
      accept: "application/json",
    });

    const response = await this.client.send(command);
    const raw = JSON.parse(new TextDecoder().decode(response.body)) as {
      content: Array<{ text: string }>;
    };

    const text = raw.content[0]?.text ?? "";
    const jsonMatch = text.match(/```json\s*([\s\S]+?)\s*```/) ?? text.match(/(\{[\s\S]+\})/);
    const json: unknown = JSON.parse(jsonMatch?.[1] ?? text);

    return schema.parse(json);
  }

  private toClaudeMessages(messages: ChatMessage[]): ClaudeMessage[] {
    return messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
  }
}
