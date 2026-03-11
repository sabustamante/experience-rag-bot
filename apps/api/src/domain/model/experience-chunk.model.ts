import type { ChunkMetadata, ExperienceChunk } from "@repo/shared-types";

export type { ExperienceChunk, ChunkMetadata };

export interface EmbeddedChunk extends ExperienceChunk {
  embedding: number[];
}
