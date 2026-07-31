"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import Link from "next/link";
import { fetchMe } from "@/lib/api";

export default function RecruiterLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace("/sign-in");
      return;
    }

    let cancelled = false;
    (async () => {
      const token = await getToken();
      if (!token) return;
      const me = await fetchMe(token);
      if (cancelled) return;
      if (me.onboarding_required || !me.profile) {
        router.replace("/onboarding");
        return;
      }
      if (me.profile.role !== "recruiter") {
        router.replace("/dashboard");
        return;
      }
      setAllowed(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, getToken, router]);

  if (!allowed) {
    return <div className="p-8 text-muted-foreground">Loading Recruiter panel…</div>;
  }

  return (
    <div className="flex flex-col md:flex-row flex-1 min-h-[calc(100vh-65px)]">
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6">
        <div className="space-y-4">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recruiter Workspace</h2>
          <nav className="flex flex-col gap-1">
            <Link href="/dashboard" className="px-3 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-900 text-sm font-medium text-ink dark:text-zinc-50">Dashboard</Link>
            <Link href="/jobs/new" className="px-3 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-900 text-sm font-medium text-ink dark:text-zinc-50">Post a Job</Link>
            <Link href="/job-postings" className="px-3 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-900 text-sm font-medium text-ink dark:text-zinc-50">My Jobs</Link>
            <Link href="/recruiter/interviews" className="px-3 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-900 text-sm font-medium text-ink dark:text-zinc-50">Interviews</Link>
            <Link href="/copilot" className="px-3 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-900 text-sm font-medium text-ink dark:text-zinc-50">Recruiter Copilot</Link>
            <Link href="/analytics" className="px-3 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-900 text-sm font-medium text-ink dark:text-zinc-50">Analytics</Link>
            <Link href="/top-performers" className="px-3 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-900 text-sm font-medium text-ink dark:text-zinc-50">Top Performers</Link>
          </nav>
        </div>
      </aside>
      <main className="flex-1 bg-zinc-50 dark:bg-black p-8">{children}</main>
    </div>
  );
}
