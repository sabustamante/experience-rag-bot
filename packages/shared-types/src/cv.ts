// Phase 5 — shapes defined, implementations deferred

export interface JobPosting {
  id?: string;
  title: string;
  company?: string;
  description: string;
  requirements: string[];
  niceToHave?: string[];
  techStack?: string[];
  location?: string;
  remote?: boolean;
}

export interface CVFilters {
  includeSkills?: string[];
  excludeSkills?: string[];
  focusAreas?: string[];
  maxExperiences?: number;
  maxProjects?: number;
  targetRole?: string;
}

export interface GeneratedCV {
  id: string;
  jobPosting: JobPosting;
  filters: CVFilters;
  content: string;
  format: "pdf" | "markdown" | "docx";
  generatedAt: Date;
  atsScore?: number;
}
