import { Test } from "@nestjs/testing";

import type { LandingContent } from "@repo/shared-types";

import { PORT_TOKENS } from "../ports";
import { ExperienceService } from "./experience.service";
import { LandingService } from "./landing.service";

const RAW_MARKDOWN = "# Summary\n\nExperienced full-stack engineer...";

const mockLandingContent: LandingContent = {
  profile: "fullstack",
  headline: "Full-Stack Engineer building scalable products",
  summary: "Experienced engineer with 5+ years.",
  skills: [
    { name: "TypeScript", category: "Languages", highlight: true },
    { name: "NestJS", category: "Frameworks & Libraries", highlight: true },
  ],
  experiences: [
    {
      company: "Acme Corp",
      role: "Senior Engineer",
      period: "2022-01 – present",
      summary: "Built core banking API",
      highlights: ["Reduced response time by 40%"],
    },
  ],
  projects: [],
  callToAction: "Let's connect",
};

describe("LandingService", () => {
  let service: LandingService;

  const mockLlm = { complete: jest.fn(), stream: jest.fn() };
  const mockCache = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
  };
  const mockExperienceService = {
    getRawContent: jest.fn().mockResolvedValue(RAW_MARKDOWN),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        LandingService,
        { provide: PORT_TOKENS.LLM_PROVIDER, useValue: mockLlm },
        { provide: PORT_TOKENS.CACHE_PROVIDER, useValue: mockCache },
        { provide: ExperienceService, useValue: mockExperienceService },
      ],
    }).compile();

    service = module.get(LandingService);

    jest.clearAllMocks();
    mockLlm.complete.mockResolvedValue(JSON.stringify(mockLandingContent));
    mockCache.get.mockResolvedValue(null);
    mockCache.set.mockResolvedValue(undefined);
    mockExperienceService.getRawContent.mockResolvedValue(RAW_MARKDOWN);
  });

  it("should return cached content when available", async () => {
    const cached = { ...mockLandingContent, profile: "fullstack" as const };
    mockCache.get.mockResolvedValueOnce(cached);

    const result = await service.getProfileContent("fullstack");

    expect(result).toBe(cached);
    expect(mockExperienceService.getRawContent).not.toHaveBeenCalled();
    expect(mockLlm.complete).not.toHaveBeenCalled();
  });

  it("should generate and cache content on cache miss", async () => {
    const result = await service.getProfileContent("backend");

    expect(mockCache.get).toHaveBeenCalledWith("landing:backend");
    expect(mockExperienceService.getRawContent).toHaveBeenCalled();
    expect(mockLlm.complete).toHaveBeenCalledTimes(1);
    expect(mockCache.set).toHaveBeenCalledWith("landing:backend", expect.any(Object), 3600);
    expect(result.profile).toBe("backend");
  });

  it("should call the LLM once with raw markdown and profile in the prompt", async () => {
    await service.getProfileContent("frontend");

    expect(mockLlm.complete).toHaveBeenCalledTimes(1);
    const [messages] = mockLlm.complete.mock.calls[0] as [Array<{ content: string }>];
    expect(messages[0].content).toContain(RAW_MARKDOWN);
    expect(messages[0].content).toContain("frontend");
  });

  it("should parse the LLM JSON response and enforce invariants", async () => {
    const result = await service.getProfileContent("fullstack");

    expect(result.profile).toBe("fullstack");
    expect(result.projects).toEqual([]);
    expect(result.callToAction).toBe("Let's connect");
    expect(result.skills.length).toBeLessThanOrEqual(12);
    expect(result.experiences.length).toBeLessThanOrEqual(3);
  });

  it("should strip markdown fences from LLM response", async () => {
    mockLlm.complete.mockResolvedValue("```json\n" + JSON.stringify(mockLandingContent) + "\n```");

    const result = await service.getProfileContent("fullstack");
    expect(result.headline).toBe(mockLandingContent.headline);
  });
});
