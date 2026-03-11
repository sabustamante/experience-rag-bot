import { Test } from "@nestjs/testing";

import type { ExperienceChunk, ExperienceData, VectorSearchResult } from "@repo/shared-types";

import { PORT_TOKENS } from "../ports";
import { ExperienceService } from "./experience.service";

const mockExperienceData: ExperienceData = {
  summary: "Experienced software engineer",
  skills: [],
  workExperiences: [],
  education: [],
  certifications: [],
};

const mockChunks: ExperienceChunk[] = [
  {
    chunkId: "summary-main",
    content: "Experienced software engineer",
    metadata: { chunkId: "summary-main", source: "summary.md", type: "summary" },
  },
];

describe("ExperienceService", () => {
  let service: ExperienceService;
  const mockSource = {
    load: jest.fn().mockResolvedValue(mockExperienceData),
    chunks: jest.fn().mockResolvedValue(mockChunks),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ExperienceService,
        { provide: PORT_TOKENS.EXPERIENCE_SOURCE, useValue: mockSource },
      ],
    }).compile();

    service = module.get(ExperienceService);
    jest.clearAllMocks();
  });

  it("should load all experience data", async () => {
    const result = await service.getAllExperience();
    expect(result).toEqual(mockExperienceData);
    expect(mockSource.load).toHaveBeenCalledTimes(1);
  });

  it("should return chunks", async () => {
    const result = await service.getChunks();
    expect(result).toEqual(mockChunks);
    expect(mockSource.chunks).toHaveBeenCalledTimes(1);
  });

  it("should assemble context from search results", () => {
    const results: VectorSearchResult[] = [
      {
        chunkId: "c1",
        content: "I worked at Acme Corp",
        score: 0.92,
        metadata: { chunkId: "c1", source: "companies/acme.md", type: "work_experience" },
      },
    ];
    const context = service.assembleContext(results);
    expect(context).toHaveLength(1);
    expect(context[0]).toContain("Acme Corp");
    expect(context[0]).toContain("0.92");
  });
});
