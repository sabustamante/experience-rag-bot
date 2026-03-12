import { Inject, Injectable } from "@nestjs/common";

import type { ExperienceChunk, ExperienceData, VectorSearchResult } from "@repo/shared-types";

import type { IExperienceSource } from "../ports";
import { PORT_TOKENS } from "../ports";

@Injectable()
export class ExperienceService {
  constructor(
    @Inject(PORT_TOKENS.EXPERIENCE_SOURCE)
    private readonly experienceSource: IExperienceSource,
  ) {}

  getAllExperience(): Promise<ExperienceData> {
    return this.experienceSource.load();
  }

  getRawContent(): Promise<string> {
    return this.experienceSource.rawContent();
  }

  getChunks(): Promise<ExperienceChunk[]> {
    return this.experienceSource.chunks();
  }

  assembleContext(searchResults: VectorSearchResult[]): string[] {
    return searchResults.map(
      (r) => `[Source: ${r.metadata.source} | Score: ${r.score.toFixed(2)}]\n${r.content}`,
    );
  }
}
