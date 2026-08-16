import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SUB_SCORE_LABELS, type TalentScoreResponse } from "@/lib/api";

export function EvidenceReceipt({ score }: { score: TalentScoreResponse }) {
  return (
    <Card className="border-border bg-card text-foreground shadow-flat ">
      <CardHeader className="pb-3 border-b border-border mb-4">
        <CardTitle className="text-section font-semibold text-foreground">
          Evidence Receipt
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {Object.entries(SUB_SCORE_LABELS).map(([key, label]) => {
          const sub = score.sub_scores[key];
          const wasRenormalized = score.renormalized_subscores.includes(key);
          return (
            <div
              key={key}
              className="border-b border-border pb-3 last:border-0 last:pb-0"
            >
              <div className="flex items-baseline justify-between">
                <span className="text-meta font-medium text-muted-foreground">
                  {label}
                </span>
                <span className="text-xs font-bold font-mono text-foreground">
                  {sub?.value !== null && sub?.value !== undefined
                    ? sub.value.toFixed(1)
                    : wasRenormalized
                      ? "N/A — reweighted"
                      : "N/A"}
                </span>
              </div>
              {sub?.rationale && (
                <p className="mt-1 text-xs text-muted-foreground font-sans leading-relaxed">
                  {sub.rationale}
                </p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
