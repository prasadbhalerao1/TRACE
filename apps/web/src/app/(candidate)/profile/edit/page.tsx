"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ConflictResolver } from "@/components/ConflictResolver";
import { useCurrentUser } from "@/components/CurrentUserProvider";
import {
  connectLeetcode,
  fetchDashboard,
  fetchGithubOAuthUrl,
  grantConsent,
  pollIngestionStatus,
  uploadCertificate,
  uploadResume,
  updateProfile,
  publishPortfolio,
  type CandidateProfileResponse,
} from "@/lib/api";

export default function ProfileEditPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { me } = useCurrentUser();
  const [profile, setProfile] = useState<CandidateProfileResponse | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [leetcodeInput, setLeetcodeInput] = useState("");
  const [usernameInput, setUsernameInput] = useState("");
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const certificateInputRef = useRef<HTMLInputElement>(null);

  const hasInitialized = useRef(false);
  const [fullName, setFullName] = useState("");
  const [headline, setHeadline] = useState("");
  const [location, setLocation] = useState("");
  const [college, setCollege] = useState("");
  const [degree, setDegree] = useState("");

  const reload = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    const dashboard = await fetchDashboard(token);
    setProfile(dashboard.profile);

    if (!hasInitialized.current) {
      if (dashboard.profile) {
        setHeadline(dashboard.profile.headline ?? "");
        setLocation(dashboard.profile.location ?? "");
        const edu = dashboard.profile.education?.[0] as { institution?: string; degree?: string } | undefined;
        setCollege(edu?.institution ?? "");
        setDegree(edu?.degree ?? "");
        setUsernameInput(dashboard.profile.username ?? "");
      }
      if (me?.profile) {
        setFullName(me.profile.full_name ?? "");
      }
      hasInitialized.current = true;
    }
  }, [getToken, me]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace("/sign-in");
      return;
    }
    // Wait for the shared user context to resolve so reload()'s one-time fullName seed
    // (gated on hasInitialized) sees a real `me` instead of running early and being
    // skipped permanently on the next reload() call once `me` arrives.
    if (!me) return;

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
  }, [isLoaded, isSignedIn, me, router, reload]);

  useEffect(() => {
    const githubStatus = searchParams.get("github");
    if (!githubStatus) return;

    let cancelled = false;
    (async () => {
      if (githubStatus === "connected") {
        if (!cancelled) setNotice("GitHub connected — processing in the background.");
        try {
          const token = await getToken();
          if (token) {
            const result = await pollIngestionStatus(token);
            if (!cancelled) {
              setNotice(
                result.status === "failed"
                  ? null
                  : "GitHub connected — Talent Score updated.",
              );
              if (result.status === "failed") setError(result.error ?? "GitHub sync failed");
            }
          }
        } catch {
          // best-effort — the dashboard's own load will still reflect eventual state
        }
        await reload().catch(() => undefined);
      } else if (!cancelled) {
        setError(`GitHub connection failed: ${githubStatus}`);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, reload, getToken]);

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

  async function handleConnectLeetcode() {
    if (!leetcodeInput.trim()) return;
    setBusy("leetcode");
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("No session token");
      const updated = await connectLeetcode(token, leetcodeInput.trim());
      setProfile(updated);
      setNotice("LeetCode connected — problem-solving stats synced.");
      setLeetcodeInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect LeetCode");
    } finally {
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
      await uploadResume(token, file);
      // Ingestion (parsing + Talent Score recompute) now runs in the background —
      // the upload response returns immediately with ingestion_status: "processing".
      setNotice("Resume uploaded — processing in the background.");
      const result = await pollIngestionStatus(token);
      if (result.status === "failed") {
        setError(result.error ?? "Resume processing failed");
      } else {
        setNotice("Resume processed — Talent Score updated.");
      }
      await reload();
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
      await uploadCertificate(token, file);
      setNotice("Certificate uploaded — processing in the background.");
      const result = await pollIngestionStatus(token);
      if (result.status === "failed") {
        setError(result.error ?? "Certificate processing failed");
      } else {
        setNotice("Certificate processed and OCR-scanned.");
      }
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Certificate upload failed");
    } finally {
      setBusy(null);
      e.target.value = "";
    }
  }

  async function handleSaveProfileInfo() {
    setBusy("save_profile");
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("No session token");
      const updated = await updateProfile(token, {
        full_name: fullName,
        headline: headline,
        location: location,
        college: college,
        degree: degree,
      });
      setProfile(updated);
      setNotice("Profile information updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile information");
    } finally {
      setBusy(null);
    }
  }

  async function handleSetUsername() {
    const trimmed = usernameInput.trim().toLowerCase();
    if (!trimmed) return;
    setBusy("username");
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("No session token");
      const updated = await publishPortfolio(token, trimmed);
      setProfile(updated);
      setNotice(`Portfolio username set to "${trimmed}". Your public link is now active.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set username");
    } finally {
      setBusy(null);
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
            <div className="flex-1">
              <p className="text-sm font-medium">LeetCode</p>
              <p className="text-xs text-muted-foreground">
                {profile.leetcode_username ? `Connected as ${profile.leetcode_username}` : "Not connected"}
              </p>
              <Input
                value={leetcodeInput}
                onChange={(e) => setLeetcodeInput(e.target.value)}
                placeholder={profile.leetcode_username ?? "LeetCode username"}
                className="mt-2 max-w-52"
              />
            </div>
            <Button
              onClick={handleConnectLeetcode}
              disabled={busy === "leetcode" || !leetcodeInput.trim()}
              variant="outline"
            >
              {busy === "leetcode" ? "Connecting…" : profile.leetcode_username ? "Reconnect" : "Connect"}
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

      <Card className="border-zinc-200 bg-white text-zinc-900 shadow-md shadow-zinc-200/40">
        <CardHeader className="pb-3 border-b border-zinc-100">
          <CardTitle className="font-heading text-sm font-semibold tracking-wider text-zinc-500 uppercase">Edit Profile Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-mono">Full Name</label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Jane Doe"
              className="border-zinc-200 bg-zinc-50/30 focus-visible:ring-indigo-500/20"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-mono">Headline</label>
            <Input
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="e.g. Senior Software Engineer"
              className="border-zinc-200 bg-zinc-50/30 focus-visible:ring-indigo-500/20"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-mono">Location</label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. San Francisco, CA"
              className="border-zinc-200 bg-zinc-50/30 focus-visible:ring-indigo-500/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-mono">College / University</label>
              <Input
                value={college}
                onChange={(e) => setCollege(e.target.value)}
                placeholder="e.g. Stanford University"
                className="border-zinc-200 bg-zinc-50/30 focus-visible:ring-indigo-500/20"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-mono">Degree</label>
              <Input
                value={degree}
                onChange={(e) => setDegree(e.target.value)}
                placeholder="e.g. B.S. in Computer Science"
                className="border-zinc-200 bg-zinc-50/30 focus-visible:ring-indigo-500/20"
              />
            </div>
          </div>

          <Button
            onClick={handleSaveProfileInfo}
            disabled={busy === "save_profile"}
            className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-medium mt-2"
          >
            {busy === "save_profile" ? "Saving..." : "Save Profile Details"}
          </Button>
        </CardContent>
      </Card>

      <ConflictResolver profile={profile} />

      {/* Portfolio Username — lets existing candidates set/change their URL slug */}
      <Card className="border-zinc-200 bg-white text-zinc-900 shadow-md shadow-zinc-200/40">
        <CardHeader className="pb-3 border-b border-zinc-100">
          <CardTitle className="font-heading text-sm font-semibold tracking-wider text-zinc-500 uppercase">Portfolio Username</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          <p className="text-xs text-zinc-500 leading-relaxed">
            Your unique public URL: <span className="font-mono text-indigo-600">/{profile.username ?? "not set"}</span>
            {profile.username && (
              <a
                href={`/${profile.username}`}
                target="_blank"
                rel="noreferrer"
                className="ml-2 text-indigo-500 hover:underline"
              >
                View →
              </a>
            )}
          </p>
          <div className="flex items-center gap-2">
            <div className="flex flex-1 items-center rounded-md border border-zinc-200 bg-zinc-50/30 ring-offset-background focus-within:ring-2 focus-within:ring-indigo-500/30 focus-within:ring-offset-1">
              <span className="select-none pl-3 text-sm text-zinc-400">yourdomain.com/</span>
              <Input
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                placeholder={profile.username ?? "yourname"}
                className="border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 pl-1"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <Button
              onClick={handleSetUsername}
              disabled={busy === "username" || !usernameInput.trim()}
              className="bg-zinc-900 hover:bg-zinc-800 text-white font-medium"
            >
              {busy === "username" ? "Saving…" : profile.username ? "Update" : "Set Username"}
            </Button>
          </div>
          <p className="text-[11px] text-zinc-400">
            Only lowercase letters, numbers, and hyphens. Min 2 chars.
          </p>
        </CardContent>
      </Card>

      <Button variant="link" onClick={() => router.push("/dashboard")}>
        View your Talent Score →
      </Button>
    </div>
  );
}
