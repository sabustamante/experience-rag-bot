import { Inject, Injectable } from "@nestjs/common";

import type { LandingContent, ProfileType } from "@repo/shared-types";

import type { ICacheProvider, ILLMProvider } from "../ports";
import { PORT_TOKENS } from "../ports";
import { ExperienceService } from "./experience.service";

const CACHE_TTL_SECONDS = 3600; // 1 hour
const MAX_SKILLS = 12;

const LANDING_SCHEMA = `{
  "profile": "<profile>",
  "headline": "string (max 12 words, punchy, tailored for <profile> audience)",
  "summary": "string (2-3 sentences distilled from the experience)",
  "skills": [
    { "name": "string", "category": "string", "highlight": boolean }
  ],
  "experiences": [
    {
      "company": "string",
      "role": "string",
      "period": "string (e.g. 2022-01 – present)",
      "summary": "string",
      "highlights": ["string"]
    }
  ],
  "projects": [],
  "callToAction": "Let's connect"
}`;

@Injectable()
export class LandingService {
  constructor(
    @Inject(PORT_TOKENS.LLM_PROVIDER) private readonly llm: ILLMProvider,
    @Inject(PORT_TOKENS.CACHE_PROVIDER) private readonly cache: ICacheProvider,
    private readonly experienceService: ExperienceService,
  ) {}

  async getProfileContent(profile: ProfileType): Promise<LandingContent> {
    const cacheKey = `landing:${profile}`;

    const cached = await this.cache.get<LandingContent>(cacheKey);
    if (cached) return cached;

    const content = await this.generateContent(profile);
    await this.cache.set(cacheKey, content, CACHE_TTL_SECONDS);

    return content;
  }

  private async generateContent(profile: ProfileType): Promise<LandingContent> {
    const rawMarkdown = await this.experienceService.getRawContent();

    const prompt = `You are building a portfolio landing page for a "${profile}" engineering audience.
Below is the candidate's full experience in markdown format.

<experience>
${rawMarkdown}
</experience>

Return ONLY a valid JSON object matching this exact schema (no markdown fences, no explanation):
${LANDING_SCHEMA.replace(/<profile>/g, profile)}

Rules:
- headline: max 12 words, specific and impactful for ${profile} engineers
- summary: 2-3 sentences synthesized from the experience
- skills: select the ${MAX_SKILLS} most relevant for a ${profile} audience; set highlight=true for expert/advanced skills
- experiences: include up to 3 most recent, with up to 3 highlights each
- projects: always an empty array
- callToAction: always "Let's connect"`;

    const response = await this.llm.complete(
      [{ id: crypto.randomUUID(), role: "user", content: prompt, createdAt: new Date() }],
      { maxTokens: 2048 },
    );

    return this.parseResponse(response, profile);
  }

  private parseResponse(raw: string, profile: ProfileType): LandingContent {
    // Strip optional markdown code fences the LLM might add
    const json = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const parsed = JSON.parse(json) as LandingContent;

    // Enforce invariants regardless of what the LLM returned
    return {
      ...parsed,
      profile,
      skills: (parsed.skills ?? []).slice(0, MAX_SKILLS),
      experiences: (parsed.experiences ?? []).slice(0, 3),
      projects: [],
      callToAction: parsed.callToAction ?? "Let's connect",
    };
  }
}
