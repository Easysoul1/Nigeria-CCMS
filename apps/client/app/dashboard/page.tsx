"use client";
import * as React from "react";
import { useAuth } from "../../src/providers/auth-provider";
import { Spinner } from "../../src/components/ui/primitives";

const ROLE_HOME: Record<string, string> = {
  ADMIN: "/dashboard/admin",
  REGISTRAR: "/dashboard/registrar",
  JUDGE: "/dashboard/judge",
  LAWYER: "/dashboard/lawyer",
};

export default function DashboardIndex() {
  const { user, loading } = useAuth();

  React.useEffect(() => {
    if (loading) return;
    if (!user) {
      window.location.assign("/login");
      return;
    }
    window.location.assign(ROLE_HOME[user.role] ?? "/login");
  }, [loading, user]);

  return (
    <div className="flex items-center gap-3 text-sm text-text-secondary">
      <Spinner />
      Taking you to your dashboard…
    </div>
  );
}
