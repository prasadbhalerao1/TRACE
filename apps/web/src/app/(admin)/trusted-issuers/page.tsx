"use client";

import { useCallback, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import {
  createTrustedIssuer,
  deleteTrustedIssuer,
  fetchTrustedIssuers,
  updateTrustedIssuer,
  type TrustedIssuerResponse,
  type TrustTier,
} from "@/lib/api";
import { CardListSkeleton } from "@/components/CardListSkeleton";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";

const TRUST_TIERS: TrustTier[] = [
  "platform",
  "university",
  "employer",
  "community",
];

// Certificate verification (services/agents/fraud/tools/issuer_lookup.py) checks a
// candidate's entered issuer against this registry: a match with a
// verification_url_template gets a live URL-based check; a match with no template is
// "known but not automatable" (falls through to Visual Forensics, no extra penalty); no
// match at all is an "unrecognized issuer" signal that contributes its own evidence to
// the candidate's Authenticity Score once a human upholds the resulting flag.
export default function TrustedIssuersPage() {
  const { getToken } = useAuth();
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [aliasesText, setAliasesText] = useState("");
  const [urlTemplate, setUrlTemplate] = useState("");
  const [trustTier, setTrustTier] = useState<TrustTier>("platform");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // The issuer awaiting confirmation. Holding the whole row (not just an id) lets the
  // dialog name what is about to be removed.
  const [pendingDelete, setPendingDelete] =
    useState<TrustedIssuerResponse | null>(null);

  const fetcher = useCallback(async () => {
    const token = await getToken();
    if (!token) throw new Error("No session token");
    return fetchTrustedIssuers(token);
  }, [getToken]);
  const {
    data: issuers,
    loading,
    error,
    retry,
  } = useAsyncResource(fetcher, "admin:trusted-issuers");

  function resetForm() {
    setEditingId(null);
    setName("");
    setAliasesText("");
    setUrlTemplate("");
    setTrustTier("platform");
    setNotes("");
    setFormOpen(false);
  }

  function startEdit(issuer: TrustedIssuerResponse) {
    setEditingId(issuer.id);
    setName(issuer.name);
    setAliasesText((issuer.aliases ?? []).join(", "));
    setUrlTemplate(issuer.verification_url_template ?? "");
    setTrustTier(issuer.trust_tier);
    setNotes(issuer.notes ?? "");
    setFormOpen(true);
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Issuer name is required");
      return;
    }
    setSaving(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("No session token");
      const aliases = aliasesText
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean);
      const body = {
        name: name.trim(),
        aliases: aliases.length > 0 ? aliases : null,
        verification_url_template: urlTemplate.trim() || null,
        trust_tier: trustTier,
        notes: notes.trim() || null,
      };
      if (editingId) {
        await updateTrustedIssuer(token, editingId, body);
        toast.success("Issuer updated");
      } else {
        await createTrustedIssuer(token, body);
        toast.success("Issuer added to trusted registry");
      }
      resetForm();
      retry();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save issuer");
    } finally {
      setSaving(false);
    }
  }

  // Confirmation moved into ConfirmDialog. `window.confirm` cannot be styled, blocks
  // the main thread, has no busy state, and reads as a browser malfunction rather than
  // part of the product.
  async function handleDelete(issuer: TrustedIssuerResponse) {
    setDeletingId(issuer.id);
    try {
      const token = await getToken();
      if (!token) throw new Error("No session token");
      await deleteTrustedIssuer(token, issuer.id);
      toast.success(`Removed ${issuer.name}`);
      retry();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to remove issuer",
      );
    } finally {
      setDeletingId(null);
      setPendingDelete(null);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Trusted Issuer Registry
          </h1>
          <p className="text-sm text-muted-foreground">
            Certificate verification checks the candidate&apos;s entered issuer
            against this list. An issuer not listed here is flagged to reviewers
            as unrecognized instead of silently assumed legitimate.
          </p>
        </div>
        <Button
          onClick={() => (formOpen ? resetForm() : setFormOpen(true))}
          variant={formOpen ? "outline" : "default"}
        >
          {formOpen ? "Cancel" : "Add Issuer"}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {formOpen && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              {editingId ? "Edit Issuer" : "Add Trusted Issuer"}
            </CardTitle>
            <CardDescription>
              Aliases let a candidate&apos;s free-text issuer entry (e.g.
              &quot;Amazon Web Services (AWS)&quot;) still match this registry
              entry.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="issuer-name">Issuer name</Label>
                <Input
                  id="issuer-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Coursera"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="issuer-tier">Trust tier</Label>
                <select
                  id="issuer-tier"
                  className="w-full text-sm border rounded-md px-3 py-2 bg-card capitalize"
                  value={trustTier}
                  onChange={(e) => setTrustTier(e.target.value as TrustTier)}
                >
                  {TRUST_TIERS.map((tier) => (
                    <option key={tier} value={tier} className="capitalize">
                      {tier}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="issuer-aliases">Aliases (comma-separated)</Label>
              <Input
                id="issuer-aliases"
                value={aliasesText}
                onChange={(e) => setAliasesText(e.target.value)}
                placeholder="aws, amazon web services"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="issuer-url">
                Verification URL template (optional)
              </Label>
              <Input
                id="issuer-url"
                value={urlTemplate}
                onChange={(e) => setUrlTemplate(e.target.value)}
                placeholder="https://www.coursera.org/verify/{credential_id}"
              />
              <p className="text-xs text-muted-foreground">
                Use <code>{"{credential_id}"}</code> as a placeholder. Leave
                blank if this issuer is known/trusted but has no automated
                verification page — certificates from it will still fall through
                to Visual Forensics without the unrecognized-issuer penalty.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="issuer-notes">Notes (optional, internal)</Label>
              <Input
                id="issuer-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Why this issuer is trusted, who added it, etc."
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : editingId ? "Save changes" : "Add issuer"}
              </Button>
              <Button variant="outline" onClick={resetForm} disabled={saving}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Registered Issuers
          </CardTitle>
          <CardDescription>
            {issuers?.length ?? 0} issuer(s) in the trusted registry.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && !issuers && <CardListSkeleton />}
          {issuers !== null && issuers?.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No trusted issuers registered yet — every certificate will be
              treated as unrecognized until you add some.
            </p>
          )}
          {issuers?.map((issuer) => (
            <div
              key={issuer.id}
              className="p-4 border rounded-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card shadow-flat"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-semibold text-foreground">
                    {issuer.name}
                  </h4>
                  <span className="text-[10px] uppercase tracking-wide font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md">
                    {issuer.trust_tier}
                  </span>
                  {!issuer.verification_url_template && (
                    <span className="text-[10px] uppercase tracking-wide font-bold text-warning bg-warning/10 px-1.5 py-0.5 rounded-md">
                      no auto-verify
                    </span>
                  )}
                </div>
                {issuer.aliases && issuer.aliases.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Aliases: {issuer.aliases.join(", ")}
                  </p>
                )}
                {issuer.notes && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {issuer.notes}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => startEdit(issuer)}
                >
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPendingDelete(issuer)}
                  disabled={deletingId === issuer.id}
                  className="text-destructive hover:text-destructive"
                >
                  {deletingId === issuer.id ? "Removing…" : "Remove"}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Remove trusted issuer?"
        description={
          <>
            Certificates from{" "}
            <span className="font-medium text-foreground">
              {pendingDelete?.name}
            </span>{" "}
            will start being treated as unrecognized. Existing verifications are not
            revoked.
          </>
        }
        confirmLabel="Remove issuer"
        onConfirm={() => (pendingDelete ? handleDelete(pendingDelete) : undefined)}
      />
    </div>
  );
}
