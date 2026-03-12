"use client";

import { useEffect, useState } from "react";

import type { LandingContent, ProfileType } from "@repo/shared-types";

import ui from "@ui-config";

import { fetchLanding } from "@/app/lib/api-client";

export const PROFILES = ui.profiles;
const { language } = ui;

interface State {
  content: LandingContent | null;
  isLoading: boolean;
  error: string | null;
}

export function useLandingProfile(initial?: LandingContent) {
  const [activeProfile, setActiveProfile] = useState<ProfileType>(
    initial?.profile ?? PROFILES[0]?.key ?? "fullstack",
  );
  const [state, setState] = useState<State>({
    content: initial ?? null,
    isLoading: !initial,
    error: null,
  });

  useEffect(() => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    fetchLanding(activeProfile, language)
      .then((content) => setState({ content, isLoading: false, error: null }))
      .catch((err: unknown) =>
        setState((s) => ({
          ...s,
          isLoading: false,
          error: err instanceof Error ? err.message : "Failed to load",
        })),
      );
  }, [activeProfile]);

  return { ...state, activeProfile, setActiveProfile };
}
