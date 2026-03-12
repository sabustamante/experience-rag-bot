import { Injectable } from "@nestjs/common";

import { chunkExperienceData, getRawMarkdown, parseExperienceData } from "@repo/experience-data";
import type { ExperienceChunk, ExperienceData, IExperienceSource } from "@repo/shared-types";

@Injectable()
export class MarkdownExperienceAdapter implements IExperienceSource {
  private cachedData: ExperienceData | null = null;

  load(): Promise<ExperienceData> {
    if (!this.cachedData) {
      this.cachedData = parseExperienceData();
    }
    const data = this.cachedData;
    return Promise.resolve(data);
  }

  async chunks(): Promise<ExperienceChunk[]> {
    const data = await this.load();
    return chunkExperienceData(data);
  }

  rawContent(): Promise<string> {
    return Promise.resolve(getRawMarkdown());
  }
}
