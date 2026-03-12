import type { LandingSkill } from "@repo/shared-types";

interface Props {
  skills: LandingSkill[];
  isLoading: boolean;
}

export function DynamicSkills({ skills, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="flex flex-wrap gap-2 justify-center">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-7 w-20 rounded-full bg-gray-200 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {skills.map((skill) => (
        <span
          key={skill.name}
          className="px-3 py-1 rounded-full text-sm border border-gray-200 bg-gray-50 text-gray-600"
        >
          {skill.name}
        </span>
      ))}
    </div>
  );
}
