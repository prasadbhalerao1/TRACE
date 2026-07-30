"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 bg-zinc-50 dark:bg-black font-sans">
      {/* Hero Section */}
      <section className="relative py-20 px-6 max-w-6xl mx-auto text-center space-y-6">
        <Badge variant="outline" className="px-3 py-1 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/50">
          Multi-Agent AI Talent & Verification System
        </Badge>
        <h1 className="text-4xl md:text-6xl font-heading font-bold text-ink dark:text-zinc-50 tracking-tight max-w-4xl mx-auto leading-tight">
          Next-Generation AI Talent Intelligence & Hiring Platform
        </h1>
        <p className="text-base md:text-lg text-slate dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed">
          Verifiable talent identities, multi-factor LLM candidate matching, automated pitch deck evaluation, and browser-native AI interview verification.
        </p>
        <div className="flex flex-wrap justify-center gap-4 pt-4">
          <Link href="/sign-in">
            <Button size="lg" className="px-8 cursor-pointer">
              Get Started / Sign In
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline" size="lg" className="px-8 cursor-pointer">
              Role Dashboard
            </Button>
          </Link>
        </div>
      </section>

      {/* Role Workspaces Grid */}
      <section className="max-w-6xl mx-auto px-6 pb-20 w-full space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-ink dark:text-zinc-50">Role Workspaces & Feature Modules</h2>
          <p className="text-sm text-slate">Direct workspace entry points for candidates, recruiters, event organizers, judges, and admins.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Candidate */}
          <Card className="hover:border-indigo-500/50 transition">
            <CardHeader>
              <div className="flex justify-between items-center">
                <Badge variant="secondary">Module 01 & 03</Badge>
                <span className="text-xs text-slate">Role 1</span>
              </div>
              <CardTitle className="text-lg font-semibold mt-2">Candidate Portal</CardTitle>
              <CardDescription className="text-xs">
                Talent Score™, Career Guidance roadmap, Interactive Pyodide Code Sandbox, AI Audio Interviews, and Resume Builder.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/profile/edit" className="block w-full">
                <Button variant="outline" size="sm" className="w-full justify-start cursor-pointer">
                  Profile & Ingestion
                </Button>
              </Link>
              <Link href="/career" className="block w-full">
                <Button variant="outline" size="sm" className="w-full justify-start cursor-pointer">
                  AI Career Guidance
                </Button>
              </Link>
              <Link href="/jobs" className="block w-full">
                <Button variant="outline" size="sm" className="w-full justify-start cursor-pointer">
                  Browse & Apply Jobs
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Recruiter */}
          <Card className="hover:border-indigo-500/50 transition">
            <CardHeader>
              <div className="flex justify-between items-center">
                <Badge variant="secondary">Module 02</Badge>
                <span className="text-xs text-slate">Role 2</span>
              </div>
              <CardTitle className="text-lg font-semibold mt-2">Recruiter Workspace</CardTitle>
              <CardDescription className="text-xs">
                Recruiter Copilot search, Flow B LLM candidate match reranking, Drag-and-Drop Pipeline Kanban, and Top Performers feed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/job-postings" className="block w-full">
                <Button variant="outline" size="sm" className="w-full justify-start cursor-pointer">
                  Job Postings & Match Rerank
                </Button>
              </Link>
              <Link href="/copilot" className="block w-full">
                <Button variant="outline" size="sm" className="w-full justify-start cursor-pointer">
                  Recruiter Copilot Assistant
                </Button>
              </Link>
              <Link href="/top-performers" className="block w-full">
                <Button variant="outline" size="sm" className="w-full justify-start cursor-pointer">
                  Top Performers Feed
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Organizer */}
          <Card className="hover:border-indigo-500/50 transition">
            <CardHeader>
              <div className="flex justify-between items-center">
                <Badge variant="secondary">Module 05</Badge>
                <span className="text-xs text-slate">Role 3</span>
              </div>
              <CardTitle className="text-lg font-semibold mt-2">Organizer Dashboard</CardTitle>
              <CardDescription className="text-xs">
                Hackathon event creation, SheetJS CSV/XLSX team roster import, automated code/deck evaluation, and leaderboard finalization.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/organizer/hackathons/new" className="block w-full">
                <Button variant="outline" size="sm" className="w-full justify-start cursor-pointer">
                  Create New Hackathon
                </Button>
              </Link>
              <Link href="/organizer/hackathons/sample-id/manage" className="block w-full">
                <Button variant="outline" size="sm" className="w-full justify-start cursor-pointer">
                  Roster Import & Team Manage
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Judge */}
          <Card className="hover:border-indigo-500/50 transition">
            <CardHeader>
              <div className="flex justify-between items-center">
                <Badge variant="secondary">Module 05</Badge>
                <span className="text-xs text-slate">Role 4</span>
              </div>
              <CardTitle className="text-lg font-semibold mt-2">Judge Panel</CardTitle>
              <CardDescription className="text-xs">
                Review assigned team submissions, view automated code quality & pitch deck scorecards, and enter rubric evaluation scores.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/evaluations" className="block w-full">
                <Button variant="outline" size="sm" className="w-full justify-start cursor-pointer">
                  Evaluation Queue
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Admin */}
          <Card className="hover:border-indigo-500/50 transition">
            <CardHeader>
              <div className="flex justify-between items-center">
                <Badge variant="secondary">Module 00 & 06</Badge>
                <span className="text-xs text-slate">Role 5</span>
              </div>
              <CardTitle className="text-lg font-semibold mt-2">Admin & Audit Console</CardTitle>
              <CardDescription className="text-xs">
                RBAC user role management, multi-tenant organization assignment, system audit logs, and trust/fraud review queue.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/users" className="block w-full">
                <Button variant="outline" size="sm" className="w-full justify-start cursor-pointer">
                  User Directory & Role Assignment
                </Button>
              </Link>
              <Link href="/audit-log" className="block w-full">
                <Button variant="outline" size="sm" className="w-full justify-start cursor-pointer">
                  Audit Log Viewer
                </Button>
              </Link>
              <Link href="/fraud-review" className="block w-full">
                <Button variant="outline" size="sm" className="w-full justify-start cursor-pointer">
                  Trust & Fraud Queue
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Analytics & Pitch Deck */}
          <Card className="hover:border-indigo-500/50 transition">
            <CardHeader>
              <div className="flex justify-between items-center">
                <Badge variant="secondary">Module 04</Badge>
                <span className="text-xs text-slate">Standalone</span>
              </div>
              <CardTitle className="text-lg font-semibold mt-2">PPT & Pitch Analyzer</CardTitle>
              <CardDescription className="text-xs">
                Upload .pptx or .pdf decks for 4-subagent domain evaluation (Structure, Market, Financial, Tech) and narrative synthesis.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/pitch-deck" className="block w-full">
                <Button variant="outline" size="sm" className="w-full justify-start cursor-pointer">
                  Pitch Deck Analyzer
                </Button>
              </Link>
              <Link href="/analytics" className="block w-full">
                <Button variant="outline" size="sm" className="w-full justify-start cursor-pointer">
                  Recruitment Analytics
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
