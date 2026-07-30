"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

import { CandidateDashboard } from "@/components/CandidateDashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fetchMe, type UserProfile } from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace("/sign-in");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error("No session token");
        const me = await fetchMe(token);
        if (cancelled) return;
        if (me.onboarding_required || !me.profile) {
          router.replace("/onboarding");
          return;
        }
        setProfile(me.profile);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load profile");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, getToken, router]);

  if (error) {
    return <div className="p-8 text-rose-500 font-medium">{error}</div>;
  }

  if (!profile) {
    return <div className="p-8 text-slate animate-pulse">Loading your dashboard…</div>;
  }

  if (profile.role === "candidate") {
    return (
      <div className="mx-auto w-full max-w-4xl p-8">
        <CandidateDashboard />
      </div>
    );
  }

  if (profile.role === "recruiter") {
    return (
      <div className="mx-auto w-full max-w-4xl p-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading">Recruiter Dashboard</CardTitle>
            <CardDescription>Manage active jobs, discover matched candidates, and monitor recruitment pipelines.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate">
              Welcome back, <span className="font-medium text-ink">{profile.full_name ?? profile.email}</span>. You can manage your candidate pipelines and post jobs from the sidebar or using the quick links below.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <Card className="hover:border-primary transition-colors">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Job Postings</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground mb-4">Create, publish, and manage structured job vacancies.</p>
                  <Link href="/jobs/new" className="block w-full">
                    <Button variant="outline" className="w-full cursor-pointer">Create Job</Button>
                  </Link>
                </CardContent>
              </Card>
              <Card className="hover:border-primary transition-colors">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Recruiter Copilot</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground mb-4">Search and match candidates using natural language commands.</p>
                  <Link href="/copilot" className="block w-full">
                    <Button variant="outline" className="w-full cursor-pointer">Launch Copilot</Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (profile.role === "organizer") {
    return (
      <div className="mx-auto w-full max-w-4xl p-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading">Organizer Dashboard</CardTitle>
            <CardDescription>Manage hackathons, assign judges, and evaluate team submissions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate">
              Welcome back, <span className="font-medium text-ink">{profile.full_name ?? profile.email}</span>. Oversee hackathon events and review competitor statistics.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <Card className="hover:border-primary transition-colors">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Hackathons Setup</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground mb-4">Register new hackathons and define tracks/criteria.</p>
                  <Link href="/organizer/hackathons/new" className="block w-full">
                    <Button variant="outline" className="w-full cursor-pointer">Create Event</Button>
                  </Link>
                </CardContent>
              </Card>
              <Card className="hover:border-primary transition-colors">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Active Roster</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground mb-4 font-normal">Manage tracks, judge allocations, and team members.</p>
                  <Link href="/organizer/hackathons/sample-hackathon/manage" className="block w-full">
                    <Button variant="outline" className="w-full cursor-pointer">Manage Roster</Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (profile.role === "judge") {
    return (
      <div className="mx-auto w-full max-w-4xl p-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading">Judge Dashboard</CardTitle>
            <CardDescription>Score competitor submissions against structured evaluation rubrics.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate">
              Welcome back, <span className="font-medium text-ink">{profile.full_name ?? profile.email}</span>. Review and evaluate project uploads assigned to you.
            </p>
            <div className="grid grid-cols-1 gap-4 pt-4">
              <Card className="hover:border-primary transition-colors">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">My Evaluation Queue</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground mb-4">View pending project submissions awaiting your grading.</p>
                  <Link href="/evaluations" className="block w-full">
                    <Button variant="outline" className="w-full cursor-pointer">View Queue</Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (profile.role === "admin") {
    return (
      <div className="mx-auto w-full max-w-4xl p-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading">Admin Dashboard</CardTitle>
            <CardDescription>System auditing, user roles, and fraud dispute reviews.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate">
              Welcome back, <span className="font-medium text-ink">{profile.full_name ?? profile.email}</span>. Manage platform operations, security logs, and integrity controls.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <Card className="hover:border-primary transition-colors">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Fraud Queue</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground mb-4">Review trust flags, plagiarism flags, and candidate disputes.</p>
                  <Link href="/fraud-review" className="block w-full">
                    <Button variant="outline" className="w-full cursor-pointer">Fraud Queue</Button>
                  </Link>
                </CardContent>
              </Card>
              <Card className="hover:border-primary transition-colors">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Platform Audits</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground mb-4">Examine audit trails, system access, and role configurations.</p>
                  <Link href="/audit-log" className="block w-full">
                    <Button variant="outline" className="w-full cursor-pointer">Security Audit Logs</Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl p-8">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Welcome</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate">
            Signed in as {profile.role}.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
