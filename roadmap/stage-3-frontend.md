# Stage 3 — Web Frontend (Next.js)

> **Goal:** A Next.js application with a functional real-time chat UI and a dynamic landing page with profile tabs powered by the backend API.
>
> **Deliverable:** Visitors can open the landing page, switch between Frontend/Backend/Fullstack profiles, and chat with the bot — all from the browser.
>
> **Depends on:** Stage 1 (API running), Stage 0 (shared-types available)

---

## Steps

### 3.1 — Scaffold Next.js `apps/web`

- [ ] Create `apps/web/` directory
- [ ] Initialize Next.js: `pnpm dlx create-next-app@latest web --ts --tailwind --app --no-src-dir --import-alias "@/*"`
- [ ] Move into `apps/web/` and update `package.json` `name` to `@repo/web`
- [ ] Add `tsconfig.json` extending `packages/tsconfig/nextjs.json`
- [ ] Add `.eslintrc.js` extending `packages/eslint-config/next.js`
- [ ] Install `@repo/shared-types` as workspace dependency
- [ ] Add `apps/web` to Turborepo pipeline
- [ ] Verify `pnpm --filter web dev` starts on port 3000

---

### 3.2 — API Client (`lib/api-client.ts`)

- [ ] Create `app/lib/api-client.ts`:
  - `NEXT_PUBLIC_API_URL` env var for base URL
  - Typed `fetchLanding(profile: ProfileType): Promise<LandingContent>` — uses `@repo/shared-types`
  - Typed `fetchChatHistory(sessionId: string): Promise<ChatSession>`
- [ ] Create `app/lib/ws-client.ts`:
  - Wraps `socket.io-client` connection
  - Exports `createChatSocket(): Socket` — singleton pattern
  - Typed event emitters: `sendMessage(message, sessionId)`, `onToken(cb)`, `onEnd(cb)`
- [ ] Install `socket.io-client`
- [ ] Add `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL` to `.env.local.example`

---

### 3.3 — Chat Hooks

- [ ] Create `app/hooks/useStreamResponse.ts`:
  - Manages `tokens: string[]` state
  - Accumulates incoming `chat:token` events into a single string
  - Exposes `isStreaming`, `reset()`
- [ ] Create `app/hooks/useChat.ts`:
  - Manages `messages: ChatMessage[]` state
  - `sessionId` — generated on mount (`crypto.randomUUID()`) or persisted in `localStorage`
  - `sendMessage(text: string)` — appends user message, emits WebSocket event, accumulates response
  - Exposes `messages`, `isLoading`, `sendMessage`, `clearSession`
- [ ] Create `app/hooks/useLandingProfile.ts`:
  - Manages `activeProfile: ProfileType` state (default: `'fullstack'`)
  - `content: LandingContent | null`, `isLoading`, `error`
  - Fetches on profile change via `fetchLanding(profile)`
  - SWR or React Query for caching (install `@tanstack/react-query`)

---

### 3.4 — Chat UI Components

- [ ] Create `app/components/chat/MessageBubble.tsx`:
  - Renders a single message with role-based styling (user vs assistant)
  - Markdown rendering for assistant messages (install `react-markdown`)
  - Streaming indicator (animated cursor) when `isStreaming`
- [ ] Create `app/components/chat/SuggestedQuestions.tsx`:
  - Renders a list of clickable suggested questions
  - Hardcoded initial suggestions: "Do you have React experience?", "What's your strongest skill?", etc.
  - Hides after first message sent
- [ ] Create `app/components/chat/ChatWindow.tsx`:
  - Uses `useChat` hook
  - Renders message list with `MessageBubble`
  - Auto-scrolls to bottom on new message
  - Input field with send button (Enter to submit)
  - Shows `SuggestedQuestions` until first message
  - Loading skeleton while waiting for first token

---

### 3.5 — Chat Page `/chat`

- [ ] Create `app/chat/page.tsx`:
  - Full-screen layout with header (name + back to landing)
  - Renders `<ChatWindow />`
  - Metadata: `title: "Chat with [Name]"`, `description`
- [ ] Create `app/chat/layout.tsx` with appropriate viewport and theme
- [ ] Add link to `/chat` from root layout or nav
- [ ] Test end-to-end: open browser → ask question → receive streaming response

---

### 3.6 — Landing Components (static shell)

- [ ] Create `app/components/landing/Hero.tsx`:
  - Name, title, photo (placeholder), brief tagline
  - CTA buttons: "Chat with me" → `/chat`, "Download CV" (disabled, Phase 5)
- [ ] Create `app/components/landing/ProfileTabs.tsx`:
  - Renders 3 tabs: Frontend / Backend / Fullstack
  - Active tab styling with Framer Motion underline animation
  - Install `framer-motion`
  - Calls `setActiveProfile` from parent on tab click
- [ ] Create `app/components/landing/DynamicSkills.tsx`:
  - Receives `skills: LandingSkill[]`
  - Renders skill badges grouped by category
  - Skeleton loader while `isLoading`
- [ ] Create `app/components/landing/DynamicExperience.tsx`:
  - Receives `experience: LandingExperience[]`
  - Renders experience timeline cards
  - Skeleton loader while `isLoading`
- [ ] Create `app/components/landing/DynamicProjects.tsx`:
  - Receives `projects: LandingProject[]`
  - Renders project cards with tech stack badges
  - Skeleton loader while `isLoading`

---

### 3.7 — Chat Widget (floating)

- [ ] Create `app/components/landing/ChatWidget.tsx`:
  - Floating button fixed at bottom-right
  - Opens an inline chat panel (not full-page) via Framer Motion slide-up
  - Reuses `ChatWindow` component
  - Minimize/close button
  - Badge with unread count (optional)
- [ ] Add `<ChatWidget />` to root `layout.tsx` so it appears on all pages

---

### 3.8 — Landing Page Assembly + ISR

- [ ] Update `app/page.tsx` (root page):
  - Server component: fetch `LandingContent` for all 3 profiles at build time
  - Pass pre-fetched data to `ProfileTabs` as initial data (React Query hydration)
  - Compose full layout: `Hero` → `ProfileTabs` → dynamic sections
- [ ] Configure ISR: `export const revalidate = 86400` (24h)
- [ ] Add `generateStaticParams` or static pre-fetch for all 3 profiles
- [ ] Add `robots.txt` and `sitemap.xml` (Next.js metadata API)
- [ ] Test: `pnpm --filter web build` → builds without errors, generates static HTML

---

## Completion Checklist

- [ ] `pnpm --filter web dev` — starts on port 3000
- [ ] `pnpm --filter web build` — builds successfully with no type errors
- [ ] Landing page loads with all three profile tabs functional
- [ ] Profile tab switch triggers API call and re-renders dynamic sections
- [ ] Chat page streams responses from the backend in real time
- [ ] Chat widget opens/closes on the landing page
- [ ] Skeleton loaders appear correctly during data fetching
- [ ] No `any` types in components — all props typed via `@repo/shared-types`
