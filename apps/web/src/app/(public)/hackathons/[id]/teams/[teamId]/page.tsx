"use client";

import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function PublicTeamPage() {
  const params = useParams<{ id: string; teamId: string }>();

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-8">
      <div>
        <h1 className="text-3xl font-heading font-bold tracking-tight text-ink">Team: {params.teamId}</h1>
        <p className="text-sm text-slate">Hackathon: {params.id}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 space-y-4">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Team Specifications</CardTitle>
            <CardDescription>Details about participants, code repository links, and pitch deck analyzer status.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate">
            <div className="flex justify-between border-b pb-2">
              <span className="font-semibold text-ink dark:text-zinc-50">GitHub Repository</span>
              <a href="https://github.com/sample-team/hackathon-project" className="text-blue-600 hover:underline">github.com/sample-team/...</a>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="font-semibold text-ink dark:text-zinc-50">Pitch Deck Analyzer Link</span>
              <Link href="/pitch-deck/sample-report" className="text-blue-600 hover:underline">View Pitch Report</Link>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-ink dark:text-zinc-50">Team Members</h4>
              <ul className="list-disc list-inside text-xs space-y-1">
                <li>Alice Johnson (Lead Backend)</li>
                <li>David Miller (Frontend Developer)</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Public Page Info</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate space-y-2 leading-relaxed">
              <p>This is a publicly accessible, SSR-rendered team specification page viewable by candidate participants, judges, recruiters, and the general public alike.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
