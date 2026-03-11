import Link from "next/link";

import ui from "@ui-config";

interface Props {
  headline: string;
  isLoading: boolean;
}

export function Hero({ headline, isLoading }: Props) {
  return (
    <div className="text-center py-16 px-4">
      {/* Avatar */}
      <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-5">
        <span className="text-2xl font-bold text-indigo-700">
          {ui.name
            .split(" ")
            .slice(0, 2)
            .map((w) => w[0])
            .join("")
            .toUpperCase()}
        </span>
      </div>

      {/* Name + headline */}
      <h1 className="text-3xl font-bold text-gray-900 mb-2">{ui.name}</h1>
      {isLoading ? (
        <div className="h-5 w-72 bg-gray-200 rounded animate-pulse mx-auto mb-6" />
      ) : (
        <p className="text-lg text-gray-500 mb-6 max-w-lg mx-auto">{headline}</p>
      )}

      {/* CTAs */}
      <div className="flex gap-3 justify-center">
        <Link
          href="/chat"
          className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          Chat with me
        </Link>
        <button
          disabled
          className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-400 text-sm font-medium cursor-not-allowed"
          title="Coming soon"
        >
          Download CV
        </button>
      </div>
    </div>
  );
}
