"use client";

import ui from "@ui-config";

interface Props {
  onSelect: (question: string) => void;
}

export function SuggestedQuestions({ onSelect }: Props) {
  return (
    <div className="px-4 pb-4">
      <p className="text-xs text-gray-400 mb-2 text-center">{ui.chat.suggestedLabel}</p>
      <div className="flex flex-wrap gap-2 justify-center">
        {ui.chat.suggestedQuestions.map((q) => (
          <button
            key={q}
            onClick={() => onSelect(q)}
            className="text-xs px-3 py-1.5 rounded-full border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors cursor-pointer"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
