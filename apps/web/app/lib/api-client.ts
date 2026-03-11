import type { LandingContent, ProfileType } from "@repo/shared-types";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export async function fetchLanding(profile: ProfileType): Promise<LandingContent> {
  const res = await fetch(`${API}/api/landing/${profile}`, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`Failed to fetch landing content for profile: ${profile}`);
  return res.json() as Promise<LandingContent>;
}

/**
 * Consumes the SSE stream from POST /api/chat/message.
 * Calls onToken for each token received, resolves when [DONE] arrives.
 */
export async function streamChat(
  message: string,
  sessionId: string,
  onToken: (token: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`${API}/api/chat/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, sessionId }),
    signal,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Request failed" }));
    throw new Error((err as { message: string }).message ?? "Request failed");
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop()!;
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") return;
      try {
        const parsed = JSON.parse(data) as { token: string };
        onToken(parsed.token);
      } catch {
        // skip malformed lines
      }
    }
  }
}
