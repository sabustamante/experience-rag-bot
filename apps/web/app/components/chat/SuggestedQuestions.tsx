"use client";

const SUGGESTIONS = [
  "What's your experience with Node.js?",
  "What cloud platforms have you worked with?",
  "Tell me about a challenging project you built.",
  "What's your strongest technical skill?",
  "Do you have experience with React?",
];

interface Props {
  onSelect: (question: string) => void;
}

export function SuggestedQuestions({ onSelect }: Props) {
  return (
    <div className="px-4 pb-4">
      <p className="text-xs text-gray-400 mb-2 text-center">Suggested questions</p>
      <div className="flex flex-wrap gap-2 justify-center">
        {SUGGESTIONS.map((q) => (
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
