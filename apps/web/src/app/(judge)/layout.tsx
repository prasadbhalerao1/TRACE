"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import Link from "next/link";
import { useCurrentUser } from "@/components/CurrentUserProvider";
import { SectionError } from "@/components/common/SectionError";

export default function JudgeLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { me, isLoaded, isSignedIn, error, reload } = useCurrentUser();

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace("/sign-in");
      return;
    }
    if (!me) return;
    if (me.onboarding_required || !me.profile) {
      router.replace("/onboarding");
      return;
    }
    if (me.profile.role !== "judge") {
      router.replace("/dashboard");
    }
  }, [isLoaded, isSignedIn, me, router]);

  if (error) {
    return (
      <div className="p-8">
        <SectionError message={error} onRetry={reload} retrying={false} />
      </div>
    );
  }

  const allowed = isLoaded && isSignedIn && me?.profile?.role === "judge";

  if (!allowed) {
    return <div className="p-8 text-muted-foreground">Loading Judge panel…</div>;
  }

  return (
    <div className="flex flex-col md:flex-row flex-1 min-h-[calc(100vh-65px)]">
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6">
        <div className="space-y-4">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Judge Workspace</h2>
          <nav className="flex flex-col gap-1">
            <Link href="/dashboard" className="px-3 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-900 text-sm font-medium text-ink dark:text-zinc-50">Dashboard</Link>
            <Link href="/evaluations" className="px-3 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-900 text-sm font-medium text-ink dark:text-zinc-50">Evaluations Queue</Link>
            <Link href="/submissions/sample-submission" className="px-3 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-900 text-sm font-medium text-ink dark:text-zinc-50">Score Rubric</Link>
          </nav>
        </div>
      </aside>
      <main className="flex-1 bg-zinc-50 dark:bg-black p-8">{children}</main>
    </div>
  );
}
