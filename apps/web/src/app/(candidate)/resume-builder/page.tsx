"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DocumentGenerationError,
  fetchDashboard,
  fetchMyDocuments,
  generateCoverLetter,
  generateResume,
  publishPortfolio,
  unpublishPortfolio,
  type CandidateProfileResponse,
  type GeneratedCoverLetterContent,
  type GeneratedDocumentResponse,
  type GeneratedResumeContent,
} from "@/lib/api";

export default function ResumeBuilderPage() {
  const { getToken } = useAuth();
  const [profile, setProfile] = useState<CandidateProfileResponse | null>(null);
  const [documents, setDocuments] = useState<GeneratedDocumentResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [findings, setFindings] = useState<GeneratedDocumentResponse["fact_check_findings"]>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [resumeJd, setResumeJd] = useState("");
  const [coverLetterJd, setCoverLetterJd] = useState("");
  const [usernameInput, setUsernameInput] = useState("");

  const reload = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    const [dashboard, docs] = await Promise.all([fetchDashboard(token), fetchMyDocuments(token)]);
    setProfile(dashboard.profile);
    setUsernameInput(dashboard.profile.username ?? "");
    setDocuments(docs);
  }, [getToken]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await reload();
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reload]);

  async function handleGenerateResume() {
    setBusy("resume");
    setError(null);
    setFindings(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("No session token");
      await generateResume(token, resumeJd.trim() || undefined);
      await reload();
    } catch (err) {
      if (err instanceof DocumentGenerationError && err.findings) {
        setFindings(err.findings);
        setError("The generated resume didn't pass the fact-check guardrail — nothing was delivered.");
      } else {
        setError(err instanceof Error ? err.message : "Resume generation failed");
      }
    } finally {
      setBusy(null);
    }
  }

  async function handleGenerateCoverLetter() {
    if (!coverLetterJd.trim()) {
      setError("A target job description is required for a cover letter.");
      return;
    }
    setBusy("cover_letter");
    setError(null);
    setFindings(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("No session token");
      await generateCoverLetter(token, coverLetterJd.trim());
      await reload();
    } catch (err) {
      if (err instanceof DocumentGenerationError && err.findings) {
        setFindings(err.findings);
        setError("The generated cover letter didn't pass the fact-check guardrail — nothing was delivered.");
      } else {
        setError(err instanceof Error ? err.message : "Cover letter generation failed");
      }
    } finally {
      setBusy(null);
    }
  }

  async function handlePublish() {
    setBusy("publish");
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("No session token");
      const updated = await publishPortfolio(token, usernameInput.trim().toLowerCase());
      setProfile(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not publish portfolio");
    } finally {
      setBusy(null);
    }
  }

  async function handleUnpublish() {
    setBusy("unpublish");
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("No session token");
      const updated = await unpublishPortfolio(token);
      setProfile(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not unpublish portfolio");
    } finally {
      setBusy(null);
    }
  }

  if (!profile) {
    return <div className="p-8 text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-8">
      {error && (
        <div className="rounded-lg border border-rose-flagged/30 bg-rose-flagged/5 p-3 text-sm text-rose-flagged">
          {error}
          {findings && findings.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {findings
                .filter((f) => !f.supported)
                .map((f, i) => (
                  <li key={i}>
                    <span className="font-medium">{f.claim}</span>
                    {f.note ? ` — ${f.note}` : ""}
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="font-heading">ATS-friendly resume</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Optionally paste a target job description — bullet points get re-ranked and re-worded to
            emphasize matching skills, grounded only in your actual profile (never fabricated).
          </p>
          <Textarea
            placeholder="Paste a target job description to optimize for it (optional)…"
            value={resumeJd}
            onChange={(e) => setResumeJd(e.target.value)}
            rows={4}
          />
          <Button onClick={handleGenerateResume} disabled={busy === "resume"}>
            {busy === "resume" ? "Generating…" : "Generate resume PDF"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Cover letter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Cover letters are always written for a specific role — paste the job description below.
          </p>
          <Textarea
            placeholder="Paste the target job description (required)…"
            value={coverLetterJd}
            onChange={(e) => setCoverLetterJd(e.target.value)}
            rows={4}
          />
          <Button onClick={handleGenerateCoverLetter} disabled={busy === "cover_letter"}>
            {busy === "cover_letter" ? "Generating…" : "Generate cover letter"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Public portfolio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Publishes a public page at <code>/&lt;username&gt;</code> with your profile, projects, and
            verified badges — no sign-in required to view it.
          </p>
          <div className="flex items-center gap-2">
            <Input
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              placeholder="your-username"
            />
            <Button onClick={handlePublish} disabled={busy === "publish" || !usernameInput.trim()}>
              {profile.portfolio_published ? "Update" : "Publish"}
            </Button>
            {profile.portfolio_published && (
              <Button variant="outline" onClick={handleUnpublish} disabled={busy === "unpublish"}>
                Unpublish
              </Button>
            )}
          </div>
          {profile.portfolio_published && profile.username && (
            <p className="text-sm">
              Live at{" "}
              <Link
                href={`/${profile.username}`}
                target="_blank"
                className="text-teal-verified underline"
              >
                /{profile.username}
              </Link>
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading">History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {documents.length === 0 && (
            <p className="text-sm text-muted-foreground">No documents generated yet.</p>
          )}
          {documents.map((doc) => (
            <DocumentRow key={doc.id} doc={doc} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function DocumentRow({ doc }: { doc: GeneratedDocumentResponse }) {
  const statusColor =
    doc.fact_check_status === "passed"
      ? "text-teal-verified"
      : doc.fact_check_status === "failed"
        ? "text-rose-flagged"
        : "text-amber-pending";

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          {doc.document_type === "resume" ? "Resume" : "Cover letter"}
          {doc.target_job_description ? " (JD-optimized)" : ""}
        </p>
        <span className={`text-xs font-medium ${statusColor}`}>{doc.fact_check_status}</span>
      </div>
      <p className="text-xs text-muted-foreground">{new Date(doc.generated_at).toLocaleString()}</p>
      {doc.file_url && (
        <a
          href={doc.file_url}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block text-sm text-teal-verified underline"
        >
          Download PDF
        </a>
      )}
      {doc.document_type === "cover_letter" && doc.fact_check_status === "passed" && (
        <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
          {(doc.content as GeneratedCoverLetterContent).body}
        </p>
      )}
      {doc.document_type === "resume" && doc.fact_check_status === "passed" && !doc.file_url && (
        <p className="mt-2 text-sm text-muted-foreground">
          {(doc.content as GeneratedResumeContent).summary}
        </p>
      )}
    </div>
  );
}
