"use client";

import { useAuth } from "@/components/AuthProvider";
import { useEffect, useState } from "react";

const ROLE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  candidate: { bg: "bg-blue-100", text: "text-blue-700", label: "Candidate" },
  recruiter: { bg: "bg-purple-100", text: "text-purple-700", label: "Recruiter" },
  judge: { bg: "bg-amber-100", text: "text-amber-700", label: "Judge" },
  organizer: { bg: "bg-green-100", text: "text-green-700", label: "Organizer" },
  admin: { bg: "bg-red-100", text: "text-red-700", label: "Admin" },
};

export function RoleIndicator() {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !user) return null;

  const role = user.role || "candidate";
  const colors = ROLE_COLORS[role] || ROLE_COLORS.candidate;

  return (
    <div className={`${colors.bg} ${colors.text} px-3 py-1 rounded-full text-xs font-medium`}>
      {colors.label}
    </div>
  );
}
