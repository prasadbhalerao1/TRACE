"use client";

import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { CareerGuidance } from "@/components/CareerGuidance";

// doc/SRS/01 §8: `(candidate)/career/page.tsx` — "roadmap timeline, course cards,
// salary range chart." FR-4.1-4.5 all render here via <CareerGuidance />.
export default function CareerPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || !isSignedIn) {
    return <div className="p-8 text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-8">
      <CareerGuidance />
    </div>
  );
}
