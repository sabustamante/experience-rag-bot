import { fetchLanding } from "@/app/lib/api-client";

import { LandingShell } from "./components/landing/LandingShell";

export const revalidate = 3600; // ISR: regenerate every hour

export default async function HomePage() {
  // Pre-fetch fullstack on the server — other profiles fetched client-side on tab switch
  const initial = await fetchLanding("fullstack").catch(() => null);

  return <LandingShell initial={initial} />;
}
