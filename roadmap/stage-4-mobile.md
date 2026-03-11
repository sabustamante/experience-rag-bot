# Stage 4 — Mobile App (React Native / Expo)

> **Goal:** A React Native app (iOS + Android) that exposes the chat functionality using the same backend API. Reuses hook logic from the web app where possible.
>
> **Deliverable:** The app runs on iOS and Android simulators, connects to the local API, and streams chat responses natively.
>
> **Depends on:** Stage 1 (API running), Stage 0 (shared-types), Stage 3 (hooks pattern reference)

---

## Steps

### 4.1 — Scaffold Expo `apps/mobile`

- [ ] Create `apps/mobile/` directory
- [ ] Initialize Expo: `pnpm dlx create-expo-app@latest mobile --template tabs`
- [ ] Update `package.json` `name` to `@repo/mobile`
- [ ] Add `tsconfig.json` extending `packages/tsconfig/react-native.json`
- [ ] Add `.eslintrc.js` extending `packages/eslint-config/base.js`
- [ ] Install `@repo/shared-types` as workspace dependency
- [ ] Add `apps/mobile` to Turborepo pipeline (`dev`, `build` tasks)
- [ ] Verify `pnpm --filter mobile start` launches Expo Go QR code

---

### 4.2 — WebSocket Client + Chat Hooks (Mobile)

- [ ] Install `socket.io-client` (same version as web)
- [ ] Create `src/lib/ws-client.ts`:
  - Same interface as web `ws-client.ts`
  - Handle React Native specific socket.io options if needed (`transports: ['websocket']`)
- [ ] Create `src/lib/api-client.ts`:
  - Typed fetch helpers reusing `@repo/shared-types`
  - Base URL from `Constants.expoConfig.extra.apiUrl` (Expo config)
- [ ] Create `src/hooks/useChat.ts`:
  - Same logic as web's `useChat` hook
  - Session ID stored with `AsyncStorage` instead of `localStorage`
  - Install `@react-native-async-storage/async-storage`
- [ ] Create `src/hooks/useStreamResponse.ts`:
  - Identical to web version (pure state logic, no DOM dependency)
- [ ] Add `apiUrl` and `wsUrl` to `app.config.ts` `extra` field, reading from `process.env`

---

### 4.3 — Native Chat UI Components

- [ ] Create `src/components/chat/MessageBubble.tsx`:
  - Native `View` + `Text` with role-based styles
  - Markdown support: install `react-native-markdown-display`
  - Animated streaming cursor using `Animated.loop`
- [ ] Create `src/components/chat/ChatInput.tsx`:
  - `TextInput` with multiline support
  - Send button (disabled while streaming)
  - Keyboard-aware (`KeyboardAvoidingView`)
- [ ] Create `src/components/chat/SuggestedQuestions.tsx`:
  - Horizontal `ScrollView` with touchable question chips
  - Same questions as web version
- [ ] Create `src/components/chat/ChatWindow.tsx`:
  - `FlatList` for message rendering (better performance than ScrollView for long conversations)
  - Auto-scroll to last message using `FlatList` `ref.scrollToEnd()`
  - Renders `MessageBubble`, `ChatInput`, `SuggestedQuestions`
  - Loading indicator while awaiting first token

---

### 4.4 — Screens and Navigation

- [ ] Configure Expo Router in `app/` directory:
  - `app/(tabs)/_layout.tsx` — tab navigator
  - `app/(tabs)/index.tsx` — Chat screen (primary tab)
  - `app/(tabs)/about.tsx` — About / mini landing (secondary tab)
- [ ] Create `src/screens/ChatScreen.tsx`:
  - Full-screen layout with header (name, clear session button)
  - Renders `<ChatWindow />`
  - Status bar styling
- [ ] Create `src/screens/AboutScreen.tsx`:
  - Static content: name, photo, brief bio
  - Links to full web landing (open in browser via `Linking.openURL`)
  - "Open Chat" button navigates to Chat tab
- [ ] Configure tab icons using `@expo/vector-icons`

---

### 4.5 — EAS Build Configuration

- [ ] Install EAS CLI: `pnpm dlx eas-cli`
- [ ] Run `eas init` inside `apps/mobile/` to link to Expo account
- [ ] Create `eas.json` with build profiles:
  - `development` — debug build, connects to local API
  - `preview` — internal distribution (TestFlight / internal track)
  - `production` — app store submission
- [ ] Update `app.config.ts` to inject correct API URLs per profile:
  - `development` → `http://localhost:3000`
  - `preview/production` → `https://api.yourdomain.com`
- [ ] Add `apps/mobile` build step to CI workflow (only on `main` push, `preview` profile)
- [ ] Verify `eas build --platform ios --profile development` completes

---

## Completion Checklist

- [ ] `pnpm --filter mobile start` — Expo DevTools opens
- [ ] App runs on iOS simulator — chat sends and receives streaming responses
- [ ] App runs on Android emulator — same behavior
- [ ] Session persists across app restarts (AsyncStorage)
- [ ] `eas build --profile development` — completes without errors
- [ ] No web-specific APIs used (no `localStorage`, no `window`, no DOM)
- [ ] All types imported from `@repo/shared-types` — no local re-definitions
