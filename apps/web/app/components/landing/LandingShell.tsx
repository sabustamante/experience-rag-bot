"use client";

import type { LandingContent } from "@repo/shared-types";

import { useLandingProfile } from "@/app/hooks/useLandingProfile";

import { ChatWidget } from "./ChatWidget";
import { DynamicExperience } from "./DynamicExperience";
import { DynamicSkills } from "./DynamicSkills";
import { Hero } from "./Hero";
import { ProfileTabs } from "./ProfileTabs";

interface Props {
  initial: LandingContent | null;
}

export function LandingShell({ initial }: Props) {
  const { content, isLoading, activeProfile, setActiveProfile } = useLandingProfile(
    initial ?? undefined,
  );

  return (
    <div className="min-h-dvh bg-white">
      <div className="max-w-2xl mx-auto px-4 pb-24">
        {/* Hero */}
        <Hero
          headline={content?.headline ?? ""}
          summary={content?.summary ?? ""}
          isLoading={isLoading}
        />

        {/* Profile tabs */}
        <div className="mb-8">
          <ProfileTabs active={activeProfile} onChange={setActiveProfile} />
        </div>

        {/* Skills */}
        <section className="mb-10">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4 text-center">
            Skills
          </h2>
          <DynamicSkills skills={content?.skills ?? []} isLoading={isLoading} />
        </section>

        {/* Experience */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4 text-center">
            Experience
          </h2>
          <DynamicExperience experiences={content?.experiences ?? []} isLoading={isLoading} />
        </section>
      </div>

      {/* Floating chat widget */}
      <ChatWidget />
    </div>
  );
}
