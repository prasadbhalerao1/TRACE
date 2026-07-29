import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SUB_SCORE_LABELS, type TalentScoreResponse } from "@/lib/api";

export function EvidenceReceipt({ score }: { score: TalentScoreResponse }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading">Evidence Receipt</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {Object.entries(SUB_SCORE_LABELS).map(([key, label]) => {
          const sub = score.sub_scores[key];
          const wasRenormalized = score.renormalized_subscores.includes(key);
          return (
            <div key={key} className="border-b border-border pb-2 last:border-0 last:pb-0">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium text-foreground">{label}</span>
                <span className="text-sm tabular-nums text-muted-foreground">
                  {sub?.value !== null && sub?.value !== undefined
                    ? sub.value.toFixed(1)
                    : wasRenormalized
                      ? "N/A — reweighted"
                      : "N/A"}
                </span>
              </div>
              {sub?.rationale && (
                <p className="mt-0.5 text-xs text-muted-foreground">{sub.rationale}</p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
