"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

export function AuthHeaderControls() {
  const { isSignedIn, logout } = useAuth();

  if (!isSignedIn) {
    return (
      <div className="flex gap-2">
        <Link href="/sign-in" className="text-sm font-medium hover:underline">
          Sign In
        </Link>
        <Link href="/sign-up" className="text-sm font-medium hover:underline">
          Sign Up
        </Link>
      </div>
    );
  }

  return (
    <button
      onClick={logout}
      className="text-sm font-medium hover:underline"
    >
      Log Out
    </button>
  );
}
