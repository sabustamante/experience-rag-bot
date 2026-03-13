import type { Metadata } from "next";

import ui from "@ui-config";

import { LandingShell } from "./components/landing/LandingShell";

// Static metadata — content is fetched client-side by useLandingProfile.
// This keeps the page fully statically exportable for S3/CloudFront hosting.
export const metadata: Metadata = {
  title: ui.name,
  openGraph: {
    title: ui.name,
  },
};

export default function HomePage() {
  // Pass null — useLandingProfile fetches the first profile client-side on mount.
  return <LandingShell initial={null} />;
}
