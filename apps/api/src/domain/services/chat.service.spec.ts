import { Test } from "@nestjs/testing";

import type { VectorSearchResult } from "@repo/shared-types";

import { PORT_TOKENS } from "../ports";
import { ChatService } from "./chat.service";
import { ExperienceService } from "./experience.service";

const mockResults: VectorSearchResult[] = [
  {
    chunkId: "c1",
    content: "Led architecture migration",
    score: 0.9,
    metadata: { chunkId: "c1", source: "acme.md", type: "work_experience" },
  },
];

function* fakeStream(tokens: string[]) {
  for (const t of tokens) yield t;
}

describe("ChatService", () => {
  let service: ChatService;

  const mockLlm = { stream: jest.fn() };
  const mockVectorStore = { search: jest.fn().mockResolvedValue(mockResults) };
  const mockEmbeddings = { embed: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]) };
  const mockExperienceService = { assembleContext: jest.fn().mockReturnValue(["Context text"]) };

  beforeEach(async () => {
    mockLlm.stream.mockReturnValue(fakeStream(["Hello", " world"]));

    const module = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: PORT_TOKENS.LLM_PROVIDER, useValue: mockLlm },
        { provide: PORT_TOKENS.VECTOR_STORE, useValue: mockVectorStore },
        { provide: PORT_TOKENS.EMBEDDING_PROVIDER, useValue: mockEmbeddings },
        { provide: ExperienceService, useValue: mockExperienceService },
      ],
    }).compile();

    service = module.get(ChatService);
    jest.clearAllMocks();
    mockLlm.stream.mockReturnValue(fakeStream(["Hello", " world"]));
    mockVectorStore.search.mockResolvedValue(mockResults);
    mockEmbeddings.embed.mockResolvedValue([0.1, 0.2, 0.3]);
    mockExperienceService.assembleContext.mockReturnValue(["Context text"]);
  });

  it("should embed the query and search vector store", async () => {
    const tokens: string[] = [];
    for await (const t of service.chat("What did you build at Acme?", "session-1")) {
      tokens.push(t);
    }

    expect(mockEmbeddings.embed).toHaveBeenCalledWith("What did you build at Acme?");
    expect(mockVectorStore.search).toHaveBeenCalledWith([0.1, 0.2, 0.3], 5);
    expect(mockExperienceService.assembleContext).toHaveBeenCalledWith(mockResults);
  });

  it("should stream LLM tokens", async () => {
    const tokens: string[] = [];
    for await (const t of service.chat("Tell me about your experience", "session-1")) {
      tokens.push(t);
    }
    expect(tokens).toEqual(["Hello", " world"]);
  });
});
