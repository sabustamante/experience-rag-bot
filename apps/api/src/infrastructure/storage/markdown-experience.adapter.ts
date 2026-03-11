import { Injectable } from "@nestjs/common";

import { chunkExperienceData, parseExperienceData } from "@repo/experience-data";
import type { ExperienceChunk, ExperienceData, IExperienceSource } from "@repo/shared-types";

@Injectable()
export class MarkdownExperienceAdapter implements IExperienceSource {
  private cachedData: ExperienceData | null = null;

  load(): Promise<ExperienceData> {
    if (!this.cachedData) {
      this.cachedData = parseExperienceData();
    }
    return Promise.resolve(this.cachedData as ExperienceData);
  }

  async chunks(): Promise<ExperienceChunk[]> {
    const data = await this.load();
    return chunkExperienceData(data);
  }
}
