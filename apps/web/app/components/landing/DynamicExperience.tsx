import type { LandingExperience } from "@repo/shared-types";

interface Props {
  experiences: LandingExperience[];
  isLoading: boolean;
}

export function DynamicExperience({ experiences, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 p-5 space-y-3 animate-pulse">
            <div className="h-4 w-40 bg-gray-200 rounded" />
            <div className="h-3 w-24 bg-gray-100 rounded" />
            <div className="h-3 w-full bg-gray-100 rounded" />
            <div className="h-3 w-5/6 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {experiences.map((exp) => (
        <div key={`${exp.company}-${exp.role}`} className="rounded-xl border border-gray-200 p-5">
          <div className="flex items-start justify-between gap-4 mb-1">
            <div>
              <p className="font-semibold text-gray-900">{exp.role}</p>
              <p className="text-sm text-indigo-600">{exp.company}</p>
            </div>
            <span className="text-xs text-gray-400 shrink-0">{exp.period}</span>
          </div>
          <p className="text-sm text-gray-600 mt-2">{exp.summary}</p>
          {exp.highlights.length > 0 && (
            <ul className="mt-3 space-y-1">
              {exp.highlights.map((h, i) => (
                <li key={i} className="text-sm text-gray-500 flex gap-2">
                  <span className="text-indigo-400 shrink-0">•</span>
                  {h}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
