"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AdminUsersPage() {
  const mockUsers = [
    { id: 1, name: "Alice Johnson", email: "alice@dataaxle.com", role: "candidate" },
    { id: 2, name: "John Recruiter", email: "john@recruiter.com", role: "recruiter" },
    { id: 3, name: "Admin User", email: "admin@platform.com", role: "admin" }
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">User Role Management</h1>
        <p className="text-sm text-slate">Audit user accounts, check Clerk sync statuses, and adjust RBAC role assignments.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 space-y-4">
          <CardHeader>
            <CardTitle className="text-base font-semibold">User Directory</CardTitle>
            <CardDescription>Review role classifications for active platform users.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {mockUsers.map((user) => (
              <div key={user.id} className="p-4 border rounded-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-zinc-900 shadow-sm">
                <div>
                  <h4 className="text-sm font-semibold text-ink dark:text-zinc-50">{user.name}</h4>
                  <p className="text-xs text-slate mt-0.5">{user.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="capitalize">{user.role}</Badge>
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
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Technical Reference: doc/SRS/00-Master-Architecture-and-Analysis.md</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-slate space-y-2">
          <p>**User Onboarding**: Links Clerk identities to system database rows. Initial assignments are completed during the onboarding step redirect flow.</p>
        </CardContent>
      </Card>
    </div>
  );
}
