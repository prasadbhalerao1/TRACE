"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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
  // Holds only what must be fetched. The signed-out value is *derived* below rather than
  // written by an effect — being signed out is not new information that needs storing,
  // it's already known from `isSignedIn`, and setting it in an effect meant one extra
  // render on every sign-out.
  const [fetchedMe, setFetchedMe] = useState<MeResponse | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  // State, not a ref: a ref mutation doesn't re-render, so listing `tick.current` in the
  // dependency array below never actually re-ran the effect — React compares the value
  // captured at the *previous* render, which the mutation had already changed in place.
  // `reload()` therefore only refetched by accident, when some other dependency happened
  // to change too. Incrementing state makes the refetch deterministic.
  const [reloadCount, setReloadCount] = useState(0);

  const reload = useCallback(() => {
    setReloadCount((n) => n + 1);
    setFetchedMe(undefined);
    setError(null);
  }, []);

  useEffect(() => {
    // Signed out: nothing to fetch, and nothing to store — `me` below already resolves
    // to null from `isSignedIn` alone.
    if (!isLoaded || !isSignedIn) return;

    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        if (!token || cancelled) return;
        const result = await fetchMe(token);
        if (cancelled) return;
        setFetchedMe(result);
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
  }, [isLoaded, isSignedIn, getToken, logout, router, reloadCount]);

  // undefined = still settling, null = definitively signed out, MeResponse = loaded.
  const me: MeResponse | null | undefined =
    isLoaded && !isSignedIn ? null : fetchedMe;

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
