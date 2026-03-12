import type { Language, ProfileType } from "@repo/shared-types";

export interface ProfileConfig {
  key: ProfileType;
  label: string;
}

export interface UiConfig {
  name: string;
  language: Language;
  profiles: ProfileConfig[];
  chat: {
    onlineStatus: string;
    emptyHeading: string;
    emptySubtitle: string;
    suggestedLabel: string;
    inputPlaceholder: string;
    suggestedQuestions: string[];
  };
}
