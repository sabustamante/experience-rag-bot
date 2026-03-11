# Stage 3 — Web Frontend (Next.js)

> **Goal:** A Next.js application with a functional real-time chat UI and a dynamic landing page with profile tabs powered by the backend API.
>
> **Deliverable:** Visitors can open the landing page, switch between Frontend/Backend/Fullstack profiles, and chat with the bot — all from the browser.
>
> **Depends on:** Stage 1 (API running), Stage 0 (shared-types available)

---

## Steps

### 3.1 — Scaffold Next.js `apps/web`

- [x] Create `apps/web/` directory
- [x] Initialize Next.js: `pnpm dlx create-next-app@latest web --ts --tailwind --app --no-src-dir --import-alias "@/*"`
- [x] Move into `apps/web/` and update `package.json` `name` to `@repo/web`
- [x] Add `tsconfig.json` extending `packages/tsconfig/nextjs.json`
- [x] Add `.eslintrc.js` extending `packages/eslint-config/next.js`
- [x] Install `@repo/shared-types` as workspace dependency
- [x] Add `apps/web` to Turborepo pipeline
- [x] Verify `pnpm --filter web dev` starts on port 3000

---

### 3.2 — API Client (`lib/api-client.ts`)

> Note: backend uses HTTP SSE (not WebSocket) — `POST /api/chat/message`. No `ws-client.ts` needed.

- [x] Create `app/lib/api-client.ts` with `streamChat()` — SSE streaming via `fetch` + `ReadableStream`
- [x] `NEXT_PUBLIC_API_URL` env var for base URL
- [ ] Typed `fetchLanding(profile: ProfileType): Promise<LandingContent>` — needed for 3.6–3.8
- [x] Add `NEXT_PUBLIC_API_URL` to `.env.local.example`

---

### 3.3 — Chat Hooks

- [x] Create `app/hooks/useChat.ts`:
  - `sessionId` — generated on mount (`crypto.randomUUID()`) or persisted in `localStorage`
  - `messages: ChatMessage[]` typed via `@repo/shared-types`
  - `sendMessage(text)` — appends user + assistant messages, streams tokens in-place
  - Exposes `messages`, `isStreaming`, `sendMessage`, `clearSession`
- [ ] Create `app/hooks/useLandingProfile.ts` — needed for 3.6–3.8

---

### 3.4 — Chat UI Components

- [x] Create `app/components/chat/MessageBubble.tsx`:
  - Role-based styling (user right / assistant left)
  - Markdown rendering for assistant messages (`react-markdown`)
  - Animated cursor when streaming
- [x] Create `app/components/chat/SuggestedQuestions.tsx`:
  - Clickable question buttons from `ui.ts` config
  - Hides after first message sent
- [x] Create `app/components/chat/ChatWindow.tsx`:
  - Uses `useChat` hook
  - Auto-scrolls to bottom on new message
  - Textarea input, Enter to submit
  - Shows `SuggestedQuestions` until first message

---

### 3.5 — Chat Page `/chat`

- [x] Create `app/chat/page.tsx`:
  - Full-screen layout with header (name + back to home)
  - Renders `<ChatWindow />`
- [x] Create `app/chat/layout.tsx` with viewport and theme color
- [x] Add link to `/chat` from root page (`app/page.tsx`)
- [x] End-to-end verified: browser → ask question → streaming response in real time

---

### 3.6 — Landing Components (static shell)

- [ ] Create `app/components/landing/Hero.tsx`
- [ ] Create `app/components/landing/ProfileTabs.tsx` (Framer Motion)
- [ ] Create `app/components/landing/DynamicSkills.tsx`
- [ ] Create `app/components/landing/DynamicExperience.tsx`
- [ ] Create `app/components/landing/DynamicProjects.tsx`

---

### 3.7 — Chat Widget (floating)

- [ ] Create `app/components/landing/ChatWidget.tsx`
- [ ] Add `<ChatWidget />` to root `layout.tsx`

---

### 3.8 — Landing Page Assembly + ISR

- [ ] Update `app/page.tsx` with full landing layout
- [ ] Configure ISR (`revalidate = 86400`)
- [ ] Add `robots.txt` and `sitemap.xml`
- [ ] `pnpm --filter web build` — builds without errors

---

## Completion Checklist

- [x] `pnpm --filter web dev` — starts on port 3000
- [ ] `pnpm --filter web build` — builds successfully with no type errors
- [ ] Landing page loads with all three profile tabs functional
- [ ] Profile tab switch triggers API call and re-renders dynamic sections
- [x] Chat page streams responses from the backend in real time
- [ ] Chat widget opens/closes on the landing page
- [ ] Skeleton loaders appear correctly during data fetching
- [x] No `any` types in components — all props typed via `@repo/shared-types`
