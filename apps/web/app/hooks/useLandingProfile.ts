"use client";

import { useEffect, useState } from "react";

import type { LandingContent, ProfileType } from "@repo/shared-types";

import { fetchLanding } from "@/app/lib/api-client";

export const PROFILES: ProfileType[] = ["fullstack", "frontend", "backend"];

interface State {
  content: LandingContent | null;
  isLoading: boolean;
  error: string | null;
}

export function useLandingProfile(initial?: LandingContent) {
  const [activeProfile, setActiveProfile] = useState<ProfileType>(initial?.profile ?? "fullstack");
  const [state, setState] = useState<State>({
    content: initial ?? null,
    isLoading: !initial,
    error: null,
  });

  useEffect(() => {
    if (initial && activeProfile === initial.profile) return;
    setState((s) => ({ ...s, isLoading: true, error: null }));
    fetchLanding(activeProfile)
      .then((content) => setState({ content, isLoading: false, error: null }))
      .catch((err: unknown) =>
        setState((s) => ({
          ...s,
          isLoading: false,
          error: err instanceof Error ? err.message : "Failed to load",
        })),
      );
  }, [activeProfile, initial]);

  return { ...state, activeProfile, setActiveProfile };
}
