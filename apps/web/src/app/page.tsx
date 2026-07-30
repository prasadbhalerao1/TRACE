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
          <Button render={<Link href="/sign-in" />} size="lg" className="px-8">
            Get Started / Sign In
          </Button>
          <Button variant="outline" render={<Link href="/dashboard" />} size="lg" className="px-8">
            Role Dashboard
          </Button>
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
              <Button render={<Link href="/profile/edit" />} variant="outline" size="sm" className="w-full justify-start">
                Profile & Ingestion
              </Button>
              <Button render={<Link href="/career" />} variant="outline" size="sm" className="w-full justify-start">
                AI Career Guidance
              </Button>
              <Button render={<Link href="/jobs" />} variant="outline" size="sm" className="w-full justify-start">
                Browse & Apply Jobs
              </Button>
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
              <Button render={<Link href="/job-postings" />} variant="outline" size="sm" className="w-full justify-start">
                Job Postings & Match Rerank
              </Button>
              <Button render={<Link href="/copilot" />} variant="outline" size="sm" className="w-full justify-start">
                Recruiter Copilot Assistant
              </Button>
              <Button render={<Link href="/top-performers" />} variant="outline" size="sm" className="w-full justify-start">
                Top Performers Feed
              </Button>
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
              <Button render={<Link href="/organizer/hackathons/new" />} variant="outline" size="sm" className="w-full justify-start">
                Create New Hackathon
              </Button>
              <Button render={<Link href="/organizer/hackathons/sample-id/manage" />} variant="outline" size="sm" className="w-full justify-start">
                Roster Import & Team Manage
              </Button>
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
              <Button render={<Link href="/evaluations" />} variant="outline" size="sm" className="w-full justify-start">
                Evaluation Queue
              </Button>
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
              <Button render={<Link href="/users" />} variant="outline" size="sm" className="w-full justify-start">
                User Directory & Role Assignment
              </Button>
              <Button render={<Link href="/audit-log" />} variant="outline" size="sm" className="w-full justify-start">
                Audit Log Viewer
              </Button>
              <Button render={<Link href="/fraud-review" />} variant="outline" size="sm" className="w-full justify-start">
                Trust & Fraud Queue
              </Button>
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
              <Button render={<Link href="/pitch-deck" />} variant="outline" size="sm" className="w-full justify-start">
                Pitch Deck Analyzer
              </Button>
              <Button render={<Link href="/analytics" />} variant="outline" size="sm" className="w-full justify-start">
                Recruitment Analytics
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
