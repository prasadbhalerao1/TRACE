import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CandidateProfileResponse } from "@/lib/api";

export function ConflictResolver({ profile }: { profile: CandidateProfileResponse }) {
  const conflicts = (profile.merged_conflicts ?? []).filter((c) => !c.resolved);
  if (conflicts.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading">Conflicts found</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {conflicts.map((conflict, i) => (
          <p key={i} className="text-sm text-amber-600 dark:text-amber-400">
            {conflict.description}
          </p>
        ))}
      </CardContent>
    </Card>
  );
}
