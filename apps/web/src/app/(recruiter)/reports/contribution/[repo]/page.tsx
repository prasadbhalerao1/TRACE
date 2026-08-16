"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ContributionBarChart } from "@/components/ContributionBarChart";
import {
  fetchContributionReports,
  type ContributionReportResponse,
} from "@/lib/api";

export default function RecruiterContributionReportPage() {
  const params = useParams<{ repo: string }>();
  const repoFullName = decodeURIComponent(params.repo);
  const { getToken } = useAuth();
  const [reports, setReports] = useState<ContributionReportResponse[] | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error("No session token");
        const result = await fetchContributionReports(token, repoFullName);
        if (!cancelled) setReports(result);
      } catch (err) {
        if (!cancelled)
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load contribution report",
          );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getToken, repoFullName]);

  if (error) return <div className="p-8 text-destructive">{error}</div>;
  if (!reports)
    return (
      <div className="p-8 text-muted-foreground">
        Loading contribution report…
      </div>
    );

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Team Contribution Report
        </h1>
        <p className="text-sm text-muted-foreground">
          Commit attribution and weighted contribution share per team member.
        </p>
      </div>

      {reports.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No contribution report generated yet for this repo.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2 space-y-4">
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Repository: {repoFullName}
              </CardTitle>
              <CardDescription>
                contribution_share = normalize(0.35·lines_survived +
                0.25·commits + 0.20·PRs_opened + 0.20·PR_reviews)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ContributionBarChart reports={reports} />
              <div className="space-y-3">
                {reports.map((r) => (
                  <div
                    key={r.id}
                    className="flex justify-between items-center border-b pb-2 text-sm"
                  >
                    <div>
                      <span className="font-semibold text-foreground">
                        {r.github_username}
                      </span>
                      {r.anomaly_note && (
                        <p className="text-xs text-warning">{r.anomaly_note}</p>
                      )}
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p className="font-semibold text-foreground">
                        {((r.contribution_share ?? 0) * 100).toFixed(0)}% share
                      </p>
                      <p>
                        {r.commits} commits · {r.prs_opened} PRs opened ·{" "}
                        {r.prs_reviewed} reviews
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  Reading This Report
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-2 leading-relaxed">
                <p>
                  Anomalies (zero attributable contribution despite team
                  membership) are a report note for human review, never an
                  automatic penalty.
                </p>
                <Badge variant="outline">
                  Raw components shown, not just the final share
                </Badge>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
