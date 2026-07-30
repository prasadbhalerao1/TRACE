"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { completeOnboarding, type Role } from "@/lib/api";

const ROLES: { value: Role; label: string }[] = [
  { value: "candidate", label: "Candidate" },
  { value: "recruiter", label: "Recruiter" },
  { value: "organizer", label: "Hackathon Organizer" },
  { value: "judge", label: "Judge" },
  { value: "admin", label: "Admin" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [role, setRole] = useState<Role | "">("");
  const [username, setUsername] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!role) return;
    setSubmitting(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("No session token");
      await completeOnboarding(token, {
        role,
        // Only pass username when signing up as candidate and they filled it in.
        ...(role === "candidate" && username.trim() ? { username: username.trim() } : {}),
      });
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-md items-center p-8">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="font-heading">Choose your role</CardTitle>
          {role === "candidate" && (
            <CardDescription>
              Claim your unique portfolio link now — you can always change it later in Profile settings.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="role">I am a…</Label>
              <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Candidate-only: claim unique portfolio URL slug at signup */}
            {role === "candidate" && (
              <div className="space-y-2">
                <Label htmlFor="username">
                  Username{" "}
                  <span className="text-xs font-normal text-zinc-400">(optional — sets your public URL)</span>
                </Label>
                <div className="flex items-center rounded-md border border-input bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                  <span className="select-none pl-3 text-sm text-zinc-400">yourdomain.com/</span>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    placeholder="yourname"
                    className="border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 pl-1"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
              </div>
            )}

            {error && <p className="text-sm text-rose-600">{error}</p>}
            <Button type="submit" disabled={!role || submitting} className="w-full">
              {submitting ? "Setting up…" : "Continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
