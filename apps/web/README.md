# @repo/web

Next.js 16 frontend for the experience RAG bot. Provides a `/chat` page that streams responses from the NestJS API in real time.

## Prerequisites

- Node.js 22+
- pnpm 10+
- The API running on `http://localhost:3001` (see [`infra/`](../../infra/))

## Setup

### 1. Install dependencies

From the monorepo root:

```bash
pnpm install
```

### 2. Configure environment

```bash
cp apps/web/.env.local.example apps/web/.env.local
# Edit .env.local if the API runs on a different URL
```

`.env.local.example`:

```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 3. Customize UI text and personal info

All UI strings (your name, chat texts, suggested questions) live in a single gitignored config file so you can pull updates without merge conflicts.

```bash
cp apps/web/app/config/ui.example.ts apps/web/app/config/ui.ts
# Edit ui.ts freely — it will never be committed
```

`ui.ts` fields:

| Field                     | Description                                    |
| ------------------------- | ---------------------------------------------- |
| `name`                    | Your name — shown in the chat header           |
| `chat.onlineStatus`       | Status label under your name (e.g. `"Online"`) |
| `chat.emptyHeading`       | Heading shown when there are no messages       |
| `chat.emptySubtitle`      | Subtitle under the heading                     |
| `chat.suggestedLabel`     | Label above the suggested question buttons     |
| `chat.inputPlaceholder`   | Placeholder text in the message input          |
| `chat.suggestedQuestions` | Array of clickable question buttons            |

Example (Spanish):

```ts
const ui: UiConfig = {
  name: "Samuel Bustamante",
  chat: {
    onlineStatus: "En línea",
    emptyHeading: "Preguntame lo que quieras",
    emptySubtitle: "sobre mi experiencia, habilidades o proyectos",
    suggestedLabel: "Preguntas sugeridas",
    inputPlaceholder: "Escribí un mensaje…",
    suggestedQuestions: [
      "¿Cuál es tu experiencia con React?",
      "¿Con qué plataformas cloud trabajaste?",
      "Contame un proyecto desafiante que hayas construido.",
      "¿Cuál es tu habilidad técnica más fuerte?",
      "¿Tenés experiencia con Node.js?",
    ],
  },
};
```

### 4. Run the dev server

```bash
pnpm --filter @repo/web dev
# → http://localhost:3000
```

Open `http://localhost:3000/chat` and start chatting.

## How the UI config works

At build time, `next.config.ts` checks whether `app/config/ui.ts` exists:

- If it does → bundles **your personal** `ui.ts`
- If it doesn't → bundles the committed **`ui.example.ts`** as fallback

Both files export the same `UiConfig` type, so TypeScript always type-checks correctly.

The `@ui-config` import alias wires this up across all components — no component imports directly from either file.

## Project structure

```
apps/web/
├── app/
│   ├── config/
│   │   ├── ui.example.ts   # Committed defaults — copy to ui.ts to personalize
│   │   ├── ui.ts           # Your personal config (gitignored)
│   │   └── ui.types.ts     # UiConfig interface
│   ├── components/chat/
│   │   ├── ChatWindow.tsx
│   │   ├── MessageBubble.tsx
│   │   └── SuggestedQuestions.tsx
│   ├── hooks/
│   │   └── useChat.ts
│   ├── lib/
│   │   └── api-client.ts   # SSE streaming client
│   ├── chat/
│   │   └── page.tsx        # /chat route
│   └── page.tsx            # / root page
├── .env.local.example
└── next.config.ts
```
