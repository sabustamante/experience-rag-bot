import * as fs from "fs";
import * as path from "path";

import matter from "gray-matter";
import type {
  Certification,
  Company,
  Education,
  ExperienceData,
  Skill,
  WorkExperience,
} from "@repo/shared-types";

const MARKDOWN_DIR = path.join(__dirname, "..", "markdown");

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Resolves the path for a single markdown file using the .env/.env.example pattern.
 * Prefers `<stem>.md` (personal data, gitignored); falls back to `<stem>.example.md`.
 */
function resolveMarkdownPath(stem: string): string {
  const real = `${stem}.md`;
  const example = `${stem}.example.md`;
  if (fs.existsSync(real)) return real;
  if (fs.existsSync(example)) return example;
  throw new Error(`No markdown file found for: ${stem} (tried .md and .example.md)`);
}

/**
 * Reads all markdown files from a directory.
 * For each stem, prefers `<stem>.md` over `<stem>.example.md`.
 */
function readMarkdownFiles(dir: string): matter.GrayMatterFile<string>[] {
  if (!fs.existsSync(dir)) return [];

  const allFiles = fs.readdirSync(dir);

  const realStems = new Set(
    allFiles
      .filter((f) => f.endsWith(".md") && !f.endsWith(".example.md"))
      .map((f) => f.slice(0, -3)),
  );

  const filesToLoad = allFiles.filter((f) => {
    if (f.endsWith(".example.md")) {
      const stem = f.slice(0, -".example.md".length);
      return !realStems.has(stem);
    }
    return f.endsWith(".md");
  });

  return filesToLoad.map((f) => {
    const raw = fs.readFileSync(path.join(dir, f), "utf-8");
    return matter(raw);
  });
}

// ─── Parsers ─────────────────────────────────────────────────────────────────

function parseSummary(): string {
  const file = matter(fs.readFileSync(resolveMarkdownPath(path.join(MARKDOWN_DIR, "summary")), "utf-8"));
  // Strip frontmatter and heading, return plain text
  return file.content
    .replace(/^#\s+.+\n/m, "")
    .trim();
}

function parseSkills(): Skill[] {
  const file = matter(fs.readFileSync(resolveMarkdownPath(path.join(MARKDOWN_DIR, "skills")), "utf-8"));
  const skills: Skill[] = [];

  let currentCategory = "";
  for (const line of file.content.split("\n")) {
    const h2 = line.match(/^##\s+(.+)/);
    if (h2) {
      currentCategory = h2[1].trim();
      continue;
    }

    const skillLine = line.match(/^-\s+(.+?)\s*(?:—\s*(.+))?$/);
    if (skillLine && currentCategory) {
      const [, name, level] = skillLine;
      const proficiencyMap: Record<string, Skill["proficiencyLevel"]> = {
        beginner: "beginner",
        intermediate: "intermediate",
        advanced: "advanced",
        expert: "expert",
      };
      skills.push({
        name: name.trim(),
        category: currentCategory,
        proficiencyLevel: proficiencyMap[level?.trim().toLowerCase() ?? ""] ?? "intermediate",
      });
    }
  }

  return skills;
}

function parseWorkExperiences(): WorkExperience[] {
  const files = readMarkdownFiles(path.join(MARKDOWN_DIR, "companies"));
  return files.map((file): WorkExperience => {
    const fm = file.data as Record<string, unknown>;

    const company: Company = {
      id: String(fm["companyId"] ?? ""),
      name: String(fm["companyName"] ?? ""),
      industry: fm["companyIndustry"] ? String(fm["companyIndustry"]) : undefined,
      location: fm["companyLocation"] ? String(fm["companyLocation"]) : undefined,
    };

    const responsibilities = extractSection(file.content, "Responsibilities");
    const achievementLines = extractSection(file.content, "Achievements");
    const summaryText = extractSection(file.content, "Summary").join(" ");

    return {
      id: String(fm["id"] ?? ""),
      company,
      role: String(fm["role"] ?? ""),
      startDate: String(fm["startDate"] ?? ""),
      endDate: fm["endDate"] ? String(fm["endDate"]) : undefined,
      current: Boolean(fm["current"] ?? false),
      summary: summaryText,
      responsibilities,
      achievements: achievementLines.map((line, i) => ({
        title: `Achievement ${i + 1}`,
        description: line,
      })),
      techStack: Array.isArray(fm["techStack"])
        ? (fm["techStack"] as string[])
        : [],
      projects: [],
    };
  });
}

function parseEducation(): Education[] {
  const file = matter(fs.readFileSync(resolveMarkdownPath(path.join(MARKDOWN_DIR, "education")), "utf-8"));
  const educations: Education[] = [];

  const blocks = file.content.split(/^##\s+/m).filter(Boolean);
  for (const block of blocks) {
    const lines = block.trim().split("\n").filter(Boolean);
    const name = lines[0]?.trim() ?? "";

    const fieldMap: Record<string, string> = {};
    for (const line of lines.slice(1)) {
      const match = line.match(/^-\s+(\w+):\s*(.+)/);
      if (match) fieldMap[match[1]] = match[2].trim();
    }

    educations.push({
      id: name.toLowerCase().replace(/\s+/g, "-"),
      institution: fieldMap["institution"] ?? "",
      degree: fieldMap["degree"] ?? "",
      field: fieldMap["field"] ?? "",
      startDate: fieldMap["startDate"] ?? "",
      endDate: fieldMap["endDate"],
      current: fieldMap["current"] === "true",
    });
  }

  return educations;
}

function parseCertifications(): Certification[] {
  // No certifications file yet — returns empty array
  return [];
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function extractSection(content: string, heading: string): string[] {
  const regex = new RegExp(`^##\\s+${heading}\\s*$`, "m");
  const start = content.search(regex);
  if (start === -1) return [];

  const afterHeading = content.slice(start).split("\n").slice(1);
  const lines: string[] = [];

  for (const line of afterHeading) {
    if (line.match(/^##\s/)) break;
    const item = line.match(/^-\s+(.+)/);
    if (item) lines.push(item[1].trim());
  }

  return lines;
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function parseExperienceData(): ExperienceData {
  return {
    summary: parseSummary(),
    skills: parseSkills(),
    workExperiences: parseWorkExperiences(),
    education: parseEducation(),
    certifications: parseCertifications(),
  };
}
