export interface Skill {
  name: string;
  category: string;
  proficiencyLevel: "beginner" | "intermediate" | "advanced" | "expert";
  yearsOfExperience?: number;
  tags?: string[];
}

export interface Achievement {
  title: string;
  description: string;
  impact?: string;
  date?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  responsibilities: string[];
  achievements: Achievement[];
  techStack: string[];
  url?: string;
  startDate?: string;
  endDate?: string;
}

export interface Company {
  id: string;
  name: string;
  industry?: string;
  location?: string;
  website?: string;
}

export interface WorkExperience {
  id: string;
  company: Company;
  role: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  summary: string;
  responsibilities: string[];
  achievements: Achievement[];
  techStack: string[];
  projects: Project[];
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  gpa?: number;
  achievements?: string[];
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  issueDate: string;
  expiryDate?: string;
  credentialId?: string;
  url?: string;
}

export interface ExperienceData {
  summary: string;
  skills: Skill[];
  workExperiences: WorkExperience[];
  education: Education[];
  certifications: Certification[];
}
