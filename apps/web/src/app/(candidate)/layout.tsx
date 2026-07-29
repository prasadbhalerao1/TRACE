"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { fetchMe } from "@/lib/api";

export default function CandidateLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace("/sign-in");
      return;
    }

    let cancelled = false;
    (async () => {
      const token = await getToken();
      if (!token) return;
      const me = await fetchMe(token);
      if (cancelled) return;
      if (me.onboarding_required || !me.profile) {
        router.replace("/onboarding");
        return;
      }
      if (me.profile.role !== "candidate") {
        router.replace("/dashboard");
        return;
      }
      setAllowed(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, getToken, router]);

  if (!allowed) {
    return <div className="p-8 text-muted-foreground">Loading…</div>;
  }

  return <>{children}</>;
}
