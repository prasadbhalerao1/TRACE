"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { fetchMe, type MeResponse } from "@/lib/api";

interface CurrentUserContextValue {
  // undefined = auth/fetch not settled yet, null = signed out, MeResponse = resolved.
  me: MeResponse | null | undefined;
  isLoaded: boolean;
  isSignedIn: boolean | undefined;
  error: string | null;
  reload: () => void;
}

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null);

// Every route-group layout ((admin), (candidate), (judge), (organizer), (recruiter))
// independently called getToken() + fetchMe() on mount, guaranteeing a redundant GET /me
// round trip on every navigation between route groups. This provider fetches it once,
// shared via context, so layouts only need to read the result and apply their own role
// check/redirect.
export function CurrentUserProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isLoaded, isSignedIn, getToken, logout } = useAuth();
  const [me, setMe] = useState<MeResponse | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const tick = useRef(0);

  const reload = useCallback(() => {
    tick.current += 1;
    setMe(undefined);
    setError(null);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setMe(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        if (!token || cancelled) return;
        const result = await fetchMe(token);
        if (cancelled) return;
        setMe(result);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Failed to load account";
        // Check for 401 in error message (token expired/invalid)
        if (message.includes("401")) {
          logout();
          router.replace("/sign-in");
          return;
        }
        setError(message);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn, getToken, logout, router, tick.current]);

  return (
    <CurrentUserContext.Provider value={{ me, isLoaded, isSignedIn, error, reload }}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser(): CurrentUserContextValue {
  const ctx = useContext(CurrentUserContext);
  if (!ctx) {
    throw new Error("useCurrentUser must be used within a CurrentUserProvider");
  }
  return ctx;
}
