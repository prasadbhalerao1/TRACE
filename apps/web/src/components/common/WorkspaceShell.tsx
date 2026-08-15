"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useCurrentUser } from "@/components/CurrentUserProvider";
import { ConnectionState, isConnectionError } from "@/components/common/ConnectionState";
import { SectionError } from "@/components/common/SectionError";
import { PageSkeleton } from "@/components/common/Skeleton";
import { WORKSPACE_NAV, type WorkspaceRole } from "@/components/common/workspaceNav";

export type { WorkspaceNavItem, WorkspaceRole } from "@/components/common/workspaceNav";

interface WorkspaceShellProps {
  /** Role this route is restricted to. Omit for routes that serve every role
   * (`/home`), in which case the sidebar follows the signed-in user's own role and
   * the only gate is "signed in and onboarded". */
  role?: WorkspaceRole;
  children: React.ReactNode;
}

/** Sidebar + role gate shared by every authenticated route group.
 *
 * The sidebar renders immediately, before `GET /me` resolves. Previously each layout
 * returned a bare `<div>Loading…</div>` for the *whole* page until `me` arrived, so
 * every navigation between route groups blanked the entire chrome and repainted it —
 * the single biggest source of perceived jank in the app. Only `children` is gated
 * now: the nav is static markup that never depended on `me` in the first place, and
 * the role check still runs exactly as before (plus server-side on every request).
 */
export function WorkspaceShell({ role, children }: WorkspaceShellProps) {
  const router = useRouter();
  const { me, isLoaded, isSignedIn, error, attempts, reload } = useCurrentUser();

  const viewerRole = me?.profile?.role as WorkspaceRole | undefined;
  // Before `me` resolves there is no role to look up, so fall back to the route's own
  // role (when it has one) to render a plausible sidebar rather than an empty rail.
  const navRole = viewerRole ?? role;
  const { heading, nav } = navRole ? WORKSPACE_NAV[navRole] : { heading: "Workspace", nav: [] };

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace("/sign-in");
      return;
    }
    if (!me) return;
    if (me.onboarding_required || !me.profile) {
      router.replace("/onboarding");
      return;
    }
    // Only role-scoped routes redirect on mismatch; shared routes serve everyone.
    if (role && me.profile.role !== role) {
      router.replace("/home");
    }
  }, [isLoaded, isSignedIn, me, router, role]);

  const signedInAndOnboarded = isLoaded && isSignedIn && Boolean(me?.profile);
  const allowed = signedInAndOnboarded && (role ? viewerRole === role : true);
  // `me === undefined` means the fetch hasn't settled. Once it has, a non-matching role
  // means the effect above is mid-redirect, so keep showing the placeholder rather than
  // flashing content the user isn't entitled to.
  const settling = !isLoaded || me === undefined;

  return (
    <div className="flex flex-col md:flex-row flex-1 min-h-[calc(100vh-65px)]">
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6">
        <div className="space-y-4">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{heading}</h2>
          <nav className="flex flex-col gap-1">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-900 text-sm font-medium text-ink dark:text-zinc-50"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </aside>
      <main className="flex-1 bg-zinc-50 dark:bg-black p-8">
        {error ? (
          // A bare "Failed to fetch" reads as a broken app when it usually just means
          // the API hasn't finished booting. Only genuine API errors get the red box.
          isConnectionError(error) ? (
            <ConnectionState onRetry={reload} retrying={false} attempts={attempts} />
          ) : (
            <SectionError message={error} onRetry={reload} retrying={false} />
          )
        ) : allowed ? (
          children
        ) : settling ? (
          <PageSkeleton />
        ) : null}
      </main>
    </div>
  );
}
