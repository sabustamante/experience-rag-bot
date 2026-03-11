import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Chat — Portfolio Bot",
  description: "Ask me anything about my experience, skills, and projects.",
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
};

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
