"use client";

import type { ProfileType } from "@repo/shared-types";

import { PROFILES } from "@/app/hooks/useLandingProfile";

const LABELS: Record<ProfileType, string> = {
  fullstack: "Full-stack",
  frontend: "Frontend",
  backend: "Backend",
  general: "General",
};

interface Props {
  active: ProfileType;
  onChange: (profile: ProfileType) => void;
}

export function ProfileTabs({ active, onChange }: Props) {
  return (
    <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit mx-auto">
      {PROFILES.map((profile) => (
        <button
          key={profile}
          onClick={() => onChange(profile)}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
            active === profile
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {LABELS[profile]}
        </button>
      ))}
    </div>
  );
}
