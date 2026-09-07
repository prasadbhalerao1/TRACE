"use client";

import { EvidencePopover } from "@/components/common/ScoreDisplay";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SUB_SCORE_LABELS, type TalentScoreResponse } from "@/lib/api";

/** Per-sub-score provenance: the rationale, and the agent runs behind it.
 *
 * The evidence IDs were previously recorded by the backend and never rendered, so a
 * "receipt" showed a number and a sentence but not the thing that made it a receipt.
 * They are reachable now through `EvidencePopover`.
 */
export function EvidenceReceipt({ score }: { score: TalentScoreResponse }) {
  return (
    <Card className="shadow-flat">
      <CardHeader className="mb-4 border-b border-border pb-3">
        <CardTitle className="text-section font-semibold text-foreground">
          Evidence receipt
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {Object.entries(SUB_SCORE_LABELS).map(([key, label]) => {
          const sub = score.sub_scores[key];
          const wasRenormalized = score.renormalized_subscores.includes(key);
          const pending = sub?.value === null || sub?.value === undefined;

          return (
            <div
              key={key}
              className="border-b border-border pb-3 last:border-0 last:pb-0"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="flex items-center gap-1.5 text-meta font-medium text-muted-foreground">
                  {label}
                  <EvidencePopover label={label} subScore={sub} />
                </span>
                {pending ? (
                  // Never 0 and never a dash: "no evidence" and "bad evidence" are
                  // different findings, and only one of them is about the candidate.
                  <span className="text-meta text-muted-foreground">
                    {wasRenormalized
                      ? "Not scored, weight redistributed"
                      : "Not yet computable"}
                  </span>
                ) : (
                  <span
                    data-numeric
                    className="font-mono text-meta font-medium text-foreground"
                  >
                    {sub.value?.toFixed(1)}
                  </span>
                )}
              </div>
              {sub?.rationale ? (
                <p className="mt-1 text-meta leading-relaxed text-muted-foreground">
                  {sub.rationale}
                </p>
              ) : null}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
