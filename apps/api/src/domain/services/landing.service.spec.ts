import { Test } from "@nestjs/testing";

import type { ExperienceData } from "@repo/shared-types";

import { PORT_TOKENS } from "../ports";
import { ExperienceService } from "./experience.service";
import { LandingService } from "./landing.service";

function* fakeStream(tokens: string[]) {
  for (const t of tokens) yield t;
}

const mockExperienceData: ExperienceData = {
  summary: "Experienced full-stack engineer",
  skills: [
    { name: "TypeScript", category: "Languages", proficiencyLevel: "expert" },
    { name: "NestJS", category: "Frameworks & Libraries", proficiencyLevel: "advanced" },
    { name: "PostgreSQL", category: "Databases & Storage", proficiencyLevel: "advanced" },
  ],
  workExperiences: [
    {
      id: "acme",
      company: { id: "acme", name: "Acme Corp" },
      role: "Senior Engineer",
      startDate: "2022-01",
      current: true,
      summary: "Built core banking API",
      responsibilities: ["Designed microservices"],
      achievements: [{ title: "A1", description: "Reduced response time by 40%" }],
      techStack: ["TypeScript", "NestJS"],
      projects: [],
    },
  ],
  education: [],
  certifications: [],
};

describe("LandingService", () => {
  let service: LandingService;

  const mockLlm = { stream: jest.fn() };
  const mockCache = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
  };
  const mockExperienceService = {
    getAllExperience: jest.fn().mockResolvedValue(mockExperienceData),
  };

  beforeEach(async () => {
    mockLlm.stream.mockReturnValue(fakeStream(["Senior Full-Stack Engineer"]));

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
    mockLlm.stream.mockReturnValue(fakeStream(["Senior Full-Stack Engineer"]));
    mockCache.get.mockResolvedValue(null);
    mockCache.set.mockResolvedValue(undefined);
    mockExperienceService.getAllExperience.mockResolvedValue(mockExperienceData);
  });

  it("should return cached content when available", async () => {
    const cached = {
      profile: "fullstack",
      headline: "Cached",
      summary: "",
      skills: [],
      experiences: [],
      projects: [],
      callToAction: "",
    };
    mockCache.get.mockResolvedValueOnce(cached);

    const result = await service.getProfileContent("fullstack");

    expect(result).toBe(cached);
    expect(mockExperienceService.getAllExperience).not.toHaveBeenCalled();
  });

  it("should generate and cache content on cache miss", async () => {
    const result = await service.getProfileContent("backend");

    expect(mockCache.get).toHaveBeenCalledWith("landing:backend");
    expect(mockExperienceService.getAllExperience).toHaveBeenCalled();
    expect(mockCache.set).toHaveBeenCalledWith("landing:backend", expect.any(Object), 3600);
    expect(result.profile).toBe("backend");
  });

  it("should filter skills by profile type", async () => {
    const result = await service.getProfileContent("frontend");

    // Frontend should get Languages and Frameworks but not Databases
    const categories = result.skills.map((s) => s.category);
    expect(categories).not.toContain("Databases & Storage");
  });
});
