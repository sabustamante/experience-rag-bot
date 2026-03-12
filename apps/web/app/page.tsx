import ui from "@ui-config";

import { fetchLanding } from "@/app/lib/api-client";

import { LandingShell } from "./components/landing/LandingShell";

export const revalidate = 0; // no ISR cache while testing

export default async function HomePage() {
  // Pre-fetch first profile on the server — other profiles fetched client-side on tab switch
  const firstProfile = ui.profiles[0]?.key ?? "fullstack";
  const initial = await fetchLanding(firstProfile, ui.language).catch(() => null);

  return <LandingShell initial={initial} />;
}
