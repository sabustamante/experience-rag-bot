import { Inject, Injectable } from "@nestjs/common";

import type { LandingContent, LandingExperience, LandingSkill, ProfileType } from "@repo/shared-types";

import type { ICacheProvider, ILLMProvider } from "../ports";
import { PORT_TOKENS } from "../ports";
import { ExperienceService } from "./experience.service";

const CACHE_TTL_SECONDS = 3600; // 1 hour

@Injectable()
export class LandingService {
  constructor(
    @Inject(PORT_TOKENS.LLM_PROVIDER) private readonly llm: ILLMProvider,
    @Inject(PORT_TOKENS.CACHE_PROVIDER) private readonly cache: ICacheProvider,
    private readonly experienceService: ExperienceService,
  ) {}

  async getProfileContent(profile: ProfileType): Promise<LandingContent> {
    const cacheKey = `landing:${profile}`;

    // Cache-aside: check cache first
    const cached = await this.cache.get<LandingContent>(cacheKey);
    if (cached) return cached;

    // Generate content for the given profile
    const content = await this.generateContent(profile);

    // Store in cache
    await this.cache.set(cacheKey, content, CACHE_TTL_SECONDS);

    return content;
  }

  private async generateContent(profile: ProfileType): Promise<LandingContent> {
    const experience = await this.experienceService.getAllExperience();

    // Build a lightweight LandingContent from real experience data
    const skills: LandingSkill[] = experience.skills
      .filter((s) => this.isRelevantSkill(s.category, profile))
      .slice(0, 12)
      .map((s) => ({
        name: s.name,
        category: s.category,
        highlight: s.proficiencyLevel === "expert" || s.proficiencyLevel === "advanced",
      }));

    const experiences: LandingExperience[] = experience.workExperiences.slice(0, 3).map((w) => ({
      company: w.company.name,
      role: w.role,
      period: `${w.startDate} – ${w.endDate ?? "present"}`,
      summary: w.summary,
      highlights: w.achievements.slice(0, 3).map((a) => a.description),
    }));

    const headline = await this.generateHeadline(profile, experience.summary);

    return {
      profile,
      headline,
      summary: experience.summary,
      skills,
      experiences,
      projects: [],
      callToAction: "Let's connect",
    };
  }

  private async generateHeadline(profile: ProfileType, summary: string): Promise<string> {
    const prompt = `Given this professional summary, write a one-line headline (max 12 words)
tailored for a ${profile} engineering audience. Be specific and impactful.
Summary: ${summary}
Headline:`;

    const tokens: string[] = [];
    for await (const token of this.llm.stream([
      { id: crypto.randomUUID(), role: "user", content: prompt, createdAt: new Date() },
    ])) {
      tokens.push(token);
    }
    return tokens.join("").trim();
  }

  private isRelevantSkill(category: string, profile: ProfileType): boolean {
    if (profile === "general") return true;
    const frontendCategories = ["Frameworks & Libraries", "Languages"];
    const backendCategories = ["Languages", "Databases & Storage", "Cloud & Infrastructure", "Architecture & Patterns"];
    if (profile === "frontend") return frontendCategories.includes(category);
    if (profile === "backend") return backendCategories.includes(category);
    return true; // fullstack — all
  }
}
