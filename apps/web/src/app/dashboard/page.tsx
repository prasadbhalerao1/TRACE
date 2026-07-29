"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { CandidateDashboard } from "@/components/CandidateDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    return <div className="p-8 text-rose-flagged">{error}</div>;
  }

  if (!profile) {
    return <div className="p-8 text-slate">Loading your dashboard…</div>;
  }

  if (profile.role === "candidate") {
    return (
      <div className="mx-auto w-full max-w-2xl p-8">
        <CandidateDashboard />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl p-8">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading">
            Welcome, {profile.full_name ?? profile.email}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate">
            You&apos;re signed in as{" "}
            <span className="font-medium text-ink capitalize">{profile.role}</span>.
            This is your empty {profile.role} dashboard — module features land here
            starting in Phase 1.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
