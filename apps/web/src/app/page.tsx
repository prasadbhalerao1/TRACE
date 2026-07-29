"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black p-8 text-center">
      <main className="flex w-full max-w-2xl flex-col items-center justify-center gap-8 py-16 px-8 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm">
        <div className="space-y-3">
          <h1 className="text-4xl font-heading font-bold text-ink dark:text-zinc-50 tracking-tight">
            Landing Page
          </h1>
          <p className="text-lg text-slate dark:text-zinc-400 max-w-md mx-auto">
            Welcome to the AI Talent Platform. Secure, verified identity matches and high-performance hackathon evaluations.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
          <Button render={<Link href="/sign-in" />} className="w-full sm:w-auto">
            Sign In / Sign Up
          </Button>
          <Button variant="outline" render={<Link href="/dashboard" />} className="w-full sm:w-auto">
            Go to Dashboard
          </Button>
        </div>
      </main>
    </div>
  );
}
