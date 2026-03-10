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

```
Commit: feature/mobile-scaffold
Description: Scaffold Expo SDK 51 app under apps/mobile with Expo Router (tabs
template). Registered in the Turborepo pipeline with shared tsconfig/eslint
configs. Uses @repo/shared-types for type sharing with the backend and web app.
```

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

```
Commit: feature/mobile-chat-hooks
Description: Add WebSocket client and useChat/useStreamResponse hooks for mobile.
Logic mirrors the web hooks with React Native adaptations: session ID uses
AsyncStorage and socket.io is forced to WebSocket transport. API/WS URLs
configured via Expo app config extra fields.
```

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

```
Commit: feature/mobile-chat-components
Description: Add native chat components using React Native primitives. FlatList
replaces ScrollView for efficient message rendering. ChatInput handles keyboard
avoidance natively. Streaming cursor uses Animated API for smooth animation
without external dependencies.
```

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

```
Commit: feature/mobile-screens
Description: Add Chat and About screens with Expo Router tab navigation. Chat
screen is the primary entry point. About screen provides a static profile summary
with a deep link to the full web landing. Tab icons from @expo/vector-icons.
```

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

```
Commit: feature/mobile-eas-build
Description: Configure EAS Build with development, preview, and production profiles.
Each profile injects the correct API/WS URLs via app.config.ts. CI triggers a
preview build on pushes to main. Development profile allows local API connections
for simulator testing.
```

---

## Completion Checklist

- [ ] `pnpm --filter mobile start` — Expo DevTools opens
- [ ] App runs on iOS simulator — chat sends and receives streaming responses
- [ ] App runs on Android emulator — same behavior
- [ ] Session persists across app restarts (AsyncStorage)
- [ ] `eas build --profile development` — completes without errors
- [ ] No web-specific APIs used (no `localStorage`, no `window`, no DOM)
- [ ] All types imported from `@repo/shared-types` — no local re-definitions
