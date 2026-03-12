export type ProfileType = "frontend" | "backend" | "fullstack";

export type Language = "en" | "es";

export interface LandingSkill {
  name: string;
  category: string;
  highlight: boolean;
}

export interface LandingExperience {
  company: string;
  role: string;
  period: string;
  summary: string;
  highlights: string[];
}

export interface LandingProject {
  name: string;
  description: string;
  techStack: string[];
  url?: string;
}

export interface LandingContent {
  profile: ProfileType;
  headline: string;
  summary: string;
  skills: LandingSkill[];
  experiences: LandingExperience[];
  projects: LandingProject[];
  callToAction: string;
}
