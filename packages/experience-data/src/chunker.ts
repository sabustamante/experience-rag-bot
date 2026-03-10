import type { ChunkMetadata, ExperienceChunk, ExperienceData } from "@repo/shared-types";

// ─── Chunking strategies ──────────────────────────────────────────────────────

function chunkSummary(data: ExperienceData): ExperienceChunk[] {
  return [
    {
      chunkId: "summary-main",
      content: data.summary,
      metadata: {
        chunkId: "summary-main",
        source: "summary.md",
        type: "summary",
      } satisfies ChunkMetadata,
    },
  ];
}

function chunkSkills(data: ExperienceData): ExperienceChunk[] {
  // Group skills by category — one chunk per category
  const byCategory = new Map<string, string[]>();
  for (const skill of data.skills) {
    const existing = byCategory.get(skill.category) ?? [];
    existing.push(`${skill.name} (${skill.proficiencyLevel})`);
    byCategory.set(skill.category, existing);
  }

  return Array.from(byCategory.entries()).map(([category, skills]) => {
    const chunkId = `skill-${category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    return {
      chunkId,
      content: `Skills — ${category}:\n${skills.map((s) => `- ${s}`).join("\n")}`,
      metadata: {
        chunkId,
        source: "skills.md",
        type: "skill",
        tags: [category.toLowerCase()],
      } satisfies ChunkMetadata,
    };
  });
}

function chunkWorkExperiences(data: ExperienceData): ExperienceChunk[] {
  const chunks: ExperienceChunk[] = [];

  for (const exp of data.workExperiences) {
    // One chunk for the overall role summary
    const summaryId = `work-${exp.id}-summary`;
    chunks.push({
      chunkId: summaryId,
      content: [
        `Role: ${exp.role} at ${exp.company.name}`,
        `Period: ${exp.startDate} – ${exp.endDate ?? "present"}`,
        `Industry: ${exp.company.industry ?? "N/A"}`,
        `Tech Stack: ${exp.techStack.join(", ")}`,
        `Summary: ${exp.summary}`,
      ].join("\n"),
      metadata: {
        chunkId: summaryId,
        source: `companies/${exp.company.id}.md`,
        type: "work_experience",
        companyId: exp.company.id,
        tags: exp.techStack.map((t) => t.toLowerCase()),
      } satisfies ChunkMetadata,
    });

    // One chunk for responsibilities
    if (exp.responsibilities.length > 0) {
      const respId = `work-${exp.id}-responsibilities`;
      chunks.push({
        chunkId: respId,
        content: [
          `Responsibilities as ${exp.role} at ${exp.company.name}:`,
          ...exp.responsibilities.map((r) => `- ${r}`),
        ].join("\n"),
        metadata: {
          chunkId: respId,
          source: `companies/${exp.company.id}.md`,
          type: "work_experience",
          companyId: exp.company.id,
        } satisfies ChunkMetadata,
      });
    }

    // One chunk for achievements
    if (exp.achievements.length > 0) {
      const achId = `work-${exp.id}-achievements`;
      chunks.push({
        chunkId: achId,
        content: [
          `Achievements as ${exp.role} at ${exp.company.name}:`,
          ...exp.achievements.map((a) => `- ${a.description}`),
        ].join("\n"),
        metadata: {
          chunkId: achId,
          source: `companies/${exp.company.id}.md`,
          type: "work_experience",
          companyId: exp.company.id,
        } satisfies ChunkMetadata,
      });
    }
  }

  return chunks;
}

function chunkEducation(data: ExperienceData): ExperienceChunk[] {
  return data.education.map((edu) => {
    const chunkId = `education-${edu.id}`;
    return {
      chunkId,
      content: [
        `Education: ${edu.degree} in ${edu.field}`,
        `Institution: ${edu.institution}`,
        `Period: ${edu.startDate} – ${edu.endDate ?? "present"}`,
        edu.achievements?.length
          ? `Achievements:\n${edu.achievements.map((a) => `- ${a}`).join("\n")}`
          : "",
      ]
        .filter(Boolean)
        .join("\n"),
      metadata: {
        chunkId,
        source: "education.md",
        type: "education",
      } satisfies ChunkMetadata,
    };
  });
}

function chunkCertifications(data: ExperienceData): ExperienceChunk[] {
  return data.certifications.map((cert) => {
    const chunkId = `cert-${cert.id}`;
    return {
      chunkId,
      content: [
        `Certification: ${cert.name}`,
        `Issuer: ${cert.issuer}`,
        `Issued: ${cert.issueDate}`,
        cert.expiryDate ? `Expires: ${cert.expiryDate}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
      metadata: {
        chunkId,
        source: "certifications.md",
        type: "certification",
      } satisfies ChunkMetadata,
    };
  });
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function chunkExperienceData(data: ExperienceData): ExperienceChunk[] {
  return [
    ...chunkSummary(data),
    ...chunkSkills(data),
    ...chunkWorkExperiences(data),
    ...chunkEducation(data),
    ...chunkCertifications(data),
  ];
}
