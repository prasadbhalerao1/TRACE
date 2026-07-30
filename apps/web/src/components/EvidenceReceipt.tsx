import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SUB_SCORE_LABELS, type TalentScoreResponse } from "@/lib/api";

export function EvidenceReceipt({ score }: { score: TalentScoreResponse }) {
  return (
    <Card className="border-zinc-200 bg-white text-zinc-900 shadow-md shadow-zinc-200/40">
      <CardHeader className="pb-3 border-b border-zinc-100 mb-4">
        <CardTitle className="font-heading text-xs font-bold tracking-wider text-zinc-500 uppercase">Evidence Receipt</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {Object.entries(SUB_SCORE_LABELS).map(([key, label]) => {
          const sub = score.sub_scores[key];
          const wasRenormalized = score.renormalized_subscores.includes(key);
          return (
            <div key={key} className="border-b border-zinc-100 pb-3 last:border-0 last:pb-0">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-bold text-zinc-600 uppercase tracking-wider font-mono">{label}</span>
                <span className="text-xs font-bold font-mono text-zinc-700">
                  {sub?.value !== null && sub?.value !== undefined
                    ? sub.value.toFixed(1)
                    : wasRenormalized
                      ? "N/A — reweighted"
                      : "N/A"}
                </span>
              </div>
              {sub?.rationale && (
                <p className="mt-1 text-xs text-zinc-500 font-sans leading-relaxed">{sub.rationale}</p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
