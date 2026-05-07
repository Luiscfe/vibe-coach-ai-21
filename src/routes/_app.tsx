import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import { CoachFab } from "@/components/CoachFab";

export const Route = createFileRoute("/_app")({
  component: AppShell,
});

function AppShell() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { nav({ to: "/" }); return; }
    supabase.from("profiles").select("onboarding_completed").eq("id", user.id).single().then(({ data }) => {
      if (!data?.onboarding_completed) nav({ to: "/onboarding/profile" });
      else setChecked(true);
    });
  }, [user, loading, nav]);

  if (!checked) return <div className="flex min-h-screen items-center justify-center"><div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;

  return (
    <div className="min-h-screen bg-gradient-soft pb-24">
      <div className="mx-auto max-w-md">
        <Outlet />
      </div>
      <CoachFab />
      <BottomNav />
    </div>
  );
}
