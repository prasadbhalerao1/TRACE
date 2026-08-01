"use client";

import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadPresentation } from "@/lib/api";

// Doc/SRS/04 §2's actor table: "Candidate/Team uploads deck" — upload lives inside the
// (candidate) route group (guarded to role=candidate by this group's layout.tsx), same
// as profile/edit/page.tsx. The report VIEW (../[id]) is a separate route OUTSIDE any
// role group, since judges/recruiters/investors also need to view it per the SRS §1
// "fully self-contained, usable standalone" note — same "shared route, not per-role"
// pattern already established for /dashboard (see .agents/decisions.md).
export default function PitchDeckUploadPage() {
  const router = useRouter();
  const { getToken } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [linkedRepo, setLinkedRepo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("No session token");
      const { presentation_id } = await uploadPresentation(token, file, linkedRepo || undefined);
      router.push(`/pitch-deck/${presentation_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-8">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Upload your pitch deck</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Accepts .pptx, .ppt, and .pdf. Analysis covers problem/solution clarity, innovation, business
            potential, and technical feasibility — plus a plagiarism/AI-content signal, never a verdict.
          </p>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="space-y-1.5">
            <Label htmlFor="linked-repo">Linked repository (optional)</Label>
            <Input
              id="linked-repo"
              placeholder="owner/repo or https://github.com/owner/repo"
              value={linkedRepo}
              onChange={(e) => setLinkedRepo(e.target.value)}
              disabled={busy}
            />
            <p className="text-xs text-muted-foreground">
              Used to cross-check technical claims in the deck against your actual code, if provided.
            </p>
          </div>

          <Button disabled={busy} onClick={() => fileInputRef.current?.click()}>
            {busy ? "Uploading…" : "Choose deck to upload"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pptx,.ppt,.pdf"
            className="hidden"
            onChange={handleFileChange}
          />
        </CardContent>
      </Card>
    </div>
  );
}
