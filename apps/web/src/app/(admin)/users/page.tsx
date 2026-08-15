"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  fetchAdminUsers,
  updateUserRole,
  type AdminUserResponse,
  type Role,
} from "@/lib/api";
import { CardListSkeleton } from "@/components/CardListSkeleton";

const ASSIGNABLE_ROLES: Role[] = ["candidate", "recruiter", "organizer", "judge", "admin"];

export default function AdminUsersPage() {
  const { getToken } = useAuth();
  const [users, setUsers] = useState<AdminUserResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function load() {
    try {
      const token = await getToken();
      if (!token) throw new Error("No session token");
      const data = await fetchAdminUsers(token);
      setUsers(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error("No session token");
        const data = await fetchAdminUsers(token);
        if (cancelled) return;
        setUsers(data);
        setError(null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load users");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getToken]);

  async function handleRoleChange(userId: string, role: Role) {
    setUpdatingId(userId);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("No session token");
      await updateUserRole(token, userId, role);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">User Role Management</h1>
        <p className="text-sm text-slate">Audit user accounts, review activity, and adjust RBAC role assignments.</p>
      </div>

      {error && <p className="text-sm text-rose-flagged">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 space-y-4">
          <CardHeader>
            <CardTitle className="text-base font-semibold">User Directory</CardTitle>
            <CardDescription>Review role classifications for active platform users.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {users === null && !error && <CardListSkeleton />}
            {users !== null && users.length === 0 && (
              <p className="text-sm text-slate">No users found.</p>
            )}
            {users?.map((user) => (
              <div key={user.id} className="p-4 border rounded-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-zinc-900 shadow-sm">
                <div>
                  <h4 className="text-sm font-semibold text-ink dark:text-zinc-50">{user.full_name ?? user.email}</h4>
                  <p className="text-xs text-slate mt-0.5">{user.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="capitalize">{user.role}</Badge>
                  <select
                    className="text-xs border rounded-md px-2 py-1 bg-white dark:bg-zinc-900 dark:border-zinc-700 capitalize"
                    value={user.role}
                    disabled={updatingId === user.id}
                    onChange={(e) => handleRoleChange(user.id, e.target.value as Role)}
                  >
                    {ASSIGNABLE_ROLES.map((r) => (
                      <option key={r} value={r} className="capitalize">
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">RBAC Information</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate space-y-2 leading-relaxed">
              <p>Platform security uses RBAC roles: `candidate`, `recruiter`, `organizer`, `judge`, `admin`.</p>
              <p>Role constraints are checked on all FastAPI endpoints via JWT token signatures.</p>
              <p>Changing a role here writes an entry to the audit log.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Technical Reference: doc/SRS/00-Master-Architecture-and-Analysis.md</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-slate space-y-2">
          <p>**User Onboarding**: Accounts are created by signup and completed during the onboarding step redirect flow, where the initial role assignment is made.</p>
        </CardContent>
      </Card>
    </div>
  );
}
