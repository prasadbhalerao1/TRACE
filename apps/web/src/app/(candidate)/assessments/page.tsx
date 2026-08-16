"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchMyAssessments, type AssessmentResponse } from "@/lib/api";
import { CardListSkeleton } from "@/components/CardListSkeleton";

const ASSESSMENT_TYPE_LABELS: Record<AssessmentResponse["type"], string> = {
  coding: "Coding Challenge",
  mcq: "Multiple Choice Quiz",
  project_analysis: "Project Analysis",
};

export default function CandidateAssessmentsInboxPage() {
  const { getToken } = useAuth();
  const [assessments, setAssessments] = useState<AssessmentResponse[] | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error("No session token");
        const result = await fetchMyAssessments(token);
        if (!cancelled) setAssessments(result);
      } catch (err) {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : "Failed to load assessments",
          );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getToken]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          My Assessments
        </h1>
        <p className="text-sm text-muted-foreground">
          Assessments recruiters have assigned to you.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Assigned Assessments
          </CardTitle>
          <CardDescription>
            Open one to start or continue a coding challenge, quiz, or project
            review.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          {!error && assessments === null && <CardListSkeleton />}
          {assessments !== null && assessments.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No assessments assigned yet — check back after a recruiter assigns
              you one.
            </p>
          )}
          {assessments?.map((assessment) => (
            <Link
              key={assessment.id}
              href={`/assessments/${assessment.id}`}
              className="p-4 border rounded-md hover:border-primary transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card shadow-flat"
            >
              <div>
                <h4 className="text-sm font-semibold text-foreground">
                  {ASSESSMENT_TYPE_LABELS[assessment.type]}
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Assigned on{" "}
                  {new Date(assessment.created_at).toLocaleDateString()}
                </p>
              </div>
              <Badge variant="outline" className="capitalize">
                {assessment.type.replace("_", " ")}
              </Badge>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
