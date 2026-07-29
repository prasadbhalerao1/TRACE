"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConflictResolver } from "@/components/ConflictResolver";
import {
  fetchDashboard,
  fetchGithubOAuthUrl,
  grantConsent,
  uploadCertificate,
  uploadResume,
  type CandidateProfileResponse,
} from "@/lib/api";

export default function ProfileEditPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [profile, setProfile] = useState<CandidateProfileResponse | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const certificateInputRef = useRef<HTMLInputElement>(null);

  const reload = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    const dashboard = await fetchDashboard(token);
    setProfile(dashboard.profile);
  }, [getToken]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace("/sign-in");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        await reload();
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load profile");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, router, reload]);

  useEffect(() => {
    const githubStatus = searchParams.get("github");
    if (!githubStatus) return;

    let cancelled = false;
    (async () => {
      if (githubStatus === "connected") {
        if (!cancelled) setNotice("GitHub connected — recalculating your Talent Score.");
        await reload().catch(() => undefined);
      } else if (!cancelled) {
        setError(`GitHub connection failed: ${githubStatus}`);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, reload]);

  async function handleConnectGithub() {
    setBusy("github");
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("No session token");
      await grantConsent(token, "github_ingestion");
      const authorizeUrl = await fetchGithubOAuthUrl(token);
      window.location.href = authorizeUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start GitHub connection");
      setBusy(null);
    }
  }

  async function handleResumeUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy("resume");
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("No session token");
      await grantConsent(token, "resume_parsing");
      const updated = await uploadResume(token, file);
      setProfile(updated);
      setNotice("Resume processed — recalculating your Talent Score.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Resume upload failed");
    } finally {
      setBusy(null);
      e.target.value = "";
    }
  }

  async function handleCertificateUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy("certificate");
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("No session token");
      const updated = await uploadCertificate(token, file);
      setProfile(updated);
      setNotice("Certificate uploaded and OCR-scanned.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Certificate upload failed");
    } finally {
      setBusy(null);
      e.target.value = "";
    }
  }

  if (!profile) {
    return <div className="p-8 text-muted-foreground">Loading your profile…</div>;
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-8">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Connect your evidence</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          {notice && <p className="text-sm text-muted-foreground">{notice}</p>}

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">GitHub</p>
              <p className="text-xs text-muted-foreground">
                {profile.github_username ? `Connected as ${profile.github_username}` : "Not connected"}
              </p>
            </div>
            <Button onClick={handleConnectGithub} disabled={busy === "github"} variant="outline">
              {profile.github_username ? "Reconnect" : "Connect GitHub"}
            </Button>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Resume</p>
              <p className="text-xs text-muted-foreground">PDF or DOCX</p>
            </div>
            <Button
              variant="outline"
              disabled={busy === "resume"}
              onClick={() => resumeInputRef.current?.click()}
            >
              {busy === "resume" ? "Uploading…" : "Upload résumé"}
            </Button>
            <input
              ref={resumeInputRef}
              type="file"
              accept=".pdf,.docx,.doc"
              className="hidden"
              onChange={handleResumeUpload}
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Certificates</p>
              <p className="text-xs text-muted-foreground">Image or PDF</p>
            </div>
            <Button
              variant="outline"
              disabled={busy === "certificate"}
              onClick={() => certificateInputRef.current?.click()}
            >
              {busy === "certificate" ? "Scanning…" : "Upload certificate"}
            </Button>
            <input
              ref={certificateInputRef}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={handleCertificateUpload}
            />
          </div>
        </CardContent>
      </Card>

      <ConflictResolver profile={profile} />

      <Button variant="link" onClick={() => router.push("/dashboard")}>
        View your Talent Score →
      </Button>
    </div>
  );
}
