import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-gray-50">
      <main className="flex flex-col items-center text-center px-6 py-16 max-w-lg">
        <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mb-6">
          <span className="text-3xl">👋</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Portfolio</h1>
        <p className="text-gray-500 mb-8 leading-relaxed">
          Welcome! Ask my AI assistant about my experience, skills, and projects.
        </p>
        <Link
          href="/chat"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors"
        >
          <span>💬</span>
          Chat with me
        </Link>
      </main>
    </div>
  );
}
