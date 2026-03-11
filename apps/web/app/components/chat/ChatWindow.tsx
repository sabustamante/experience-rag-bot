"use client";

import { useEffect, useRef, useState } from "react";

import { useChat } from "@/app/hooks/useChat";

import { MessageBubble } from "./MessageBubble";
import { SuggestedQuestions } from "./SuggestedQuestions";

export function ChatWindow() {
  const { messages, isStreaming, sendMessage } = useChat();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const hasMessages = messages.length > 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput("");
    void sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 pt-4">
        {!hasMessages && (
          <div className="flex flex-col items-center justify-center h-full text-center pb-8">
            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center mb-4">
              <span className="text-2xl">💬</span>
            </div>
            <p className="text-gray-600 font-medium mb-1">Ask me anything</p>
            <p className="text-gray-400 text-sm">about my experience, skills, or projects</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isStreaming={isStreaming && i === messages.length - 1 && msg.role === "assistant"}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Suggested questions */}
      {!hasMessages && (
        <SuggestedQuestions
          onSelect={(q) => {
            setInput(q);
            inputRef.current?.focus();
          }}
        />
      )}

      {/* Input */}
      <div className="border-t border-gray-200 p-3 bg-white">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message…"
            rows={1}
            className="flex-1 resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 max-h-32 overflow-y-auto"
            style={{ height: "auto" }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="p-2 rounded-xl bg-indigo-600 text-white disabled:opacity-40 hover:bg-indigo-700 transition-colors cursor-pointer"
            aria-label="Send"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
