import type { UiConfig } from "./ui.types";

const ui: UiConfig = {
  name: "Your Name",
  language: "en",
  profiles: [
    { key: "fullstack", label: "Full-stack" },
    { key: "frontend", label: "Frontend" },
    { key: "backend", label: "Backend" },
  ],
  chat: {
    onlineStatus: "Online",
    emptyHeading: "Ask me anything",
    emptySubtitle: "about my experience, skills, or projects",
    suggestedLabel: "Suggested questions",
    inputPlaceholder: "Type a message…",
    suggestedQuestions: [
      "What's your experience with Node.js?",
      "What cloud platforms have you worked with?",
      "Tell me about a challenging project you built.",
      "What's your strongest technical skill?",
      "Do you have experience with React?",
    ],
  },
};

export default ui;
