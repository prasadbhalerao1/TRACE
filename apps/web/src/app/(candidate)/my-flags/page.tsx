"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function CandidateFlagsPage() {
  const [disputed, setDisputed] = useState(false);
  const [disputeText, setDisputeText] = useState("");

  function handleSubmitDispute(e: React.FormEvent) {
    e.preventDefault();
    if (!disputeText.trim()) return;
    setDisputed(true);
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Trust Flags & Disputes</h1>
        <p className="text-sm text-slate">Review system integrity flags raised on your profile and submit disputes.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Active Profile Flags</CardTitle>
            <CardDescription>Integrity issues flagged by the platform&apos;s multi-agent checking system.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 rounded-md">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-sm font-semibold text-rose-flagged">Tab Focus Violation during AI Interview</h4>
                  <p className="text-xs text-slate mt-1">System detected candidate switched tabs 3 times during the core assessment interview.</p>
                  <span className="inline-block mt-2 px-2 py-0.5 text-[10px] font-semibold bg-rose-flagged text-white rounded">Flagged: 2026-07-29</span>
                </div>
                <span className="text-xs font-semibold text-rose-flagged uppercase">High Severity</span>
              </div>
            </div>

            {!disputed ? (
              <form onSubmit={handleSubmitDispute} className="space-y-4 pt-4 border-t">
                <h4 className="text-sm font-semibold text-ink">Dispute Flag</h4>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate">Explain the circumstances of this flag:</label>
                  <textarea
                    required
                    className="w-full min-h-24 p-3 border rounded text-sm bg-background text-foreground focus:outline-none"
                    placeholder="Provide details for review (e.g., system alert window, popup blocking etc.)"
                    value={disputeText}
                    onChange={(e) => setDisputeText(e.target.value)}
                  />
                </div>
                <Button type="submit">Submit Dispute</Button>
              </form>
            ) : (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-md text-sm mt-4">
                <h4 className="font-semibold text-emerald-800 dark:text-emerald-400">Dispute Submitted Successfully</h4>
                <p className="text-xs text-slate mt-1">Admin review has been scheduled. You will be notified of the decision within 48 hours.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Integrity Policy</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate space-y-2 leading-relaxed">
              <p>**Proof over Paperwork**: DataAxle maintains strict checks on coding copy-paste, interview navigation focus, and metadata plagiarism.</p>
              <p>Flags do **not** auto-reject candidates; recruiters see all candidates alongside flag notes to ensure unbiased evaluation.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Technical Reference: doc/SRS/06-SRS-Trust-Fraud-Prevention.md</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-slate space-y-2">
          <p>**Dispute Mechanism**: Submitting a dispute inserts a pending review item in the Admin `fraud_review` queue and logs a ledger state update. Administrators can either dismiss the flag or uphold it based on access audit trails.</p>
        </CardContent>
      </Card>
    </div>
  );
}
