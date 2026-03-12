import type { ChunkMetadata, ExperienceChunk, ExperienceData } from "@repo/shared-types";

// ─── Date helpers ─────────────────────────────────────────────────────────────

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function formatDate(date: string): string {
  if (!date) return "";
  const parts = date.split("-");
  const year = parts[0];
  const month = parts[1];
  if (!month) return year;
  return `${MONTHS[parseInt(month, 10) - 1]} ${year}`;
}

function formatPeriod(startDate: string, endDate: string | undefined): string {
  const start = formatDate(startDate);
  const end = endDate ? formatDate(endDate) : "present";
  return `${start} – ${end}`;
}

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

  const sorted = [...data.workExperiences].sort((a, b) => b.startDate.localeCompare(a.startDate));

  for (const exp of sorted) {
    // One chunk for the overall role summary
    const summaryId = `work-${exp.id}-summary`;
    chunks.push({
      chunkId: summaryId,
      content: [
        `Role: ${exp.role} at ${exp.company.name}`,
        `Period: ${formatPeriod(exp.startDate, exp.endDate)}`,
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
        `Period: ${formatPeriod(edu.startDate, edu.endDate)}`,
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
