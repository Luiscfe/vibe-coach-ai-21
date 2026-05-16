import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Step } from "./onboarding.profile";
import { Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding/group")({
  component: GroupStep,
});

function GroupStep() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/" });
  }, [loading, user, nav]);

  async function joinAndFinish() {
    if (!user) return;
    setBusy(true);
    try {
      const { data: prof, error: profErr } = await supabase
        .from("profiles")
        .select("goal")
        .eq("id", user.id)
        .single();

      if (profErr || !prof?.goal) {
        // Se não conseguir buscar o objetivo, finaliza onboarding mesmo assim
        await finishOnboarding();
        return;
      }

      const { data: existing } = await supabase
        .from("groups")
        .select("id, member_count")
        .eq("goal", prof.goal)
        .lt("member_count", 5)
        .limit(1);

      let groupId: string | null = null;

      if (existing && existing.length > 0) {
        groupId = existing[0].id;
      } else {
        const { data: ng, error: gErr } = await supabase
          .from("groups")
          .insert({ goal: prof.goal })
          .select("id")
          .single();
        if (!gErr && ng) groupId = ng.id;
      }

      if (groupId) {
        const { error: mErr } = await supabase
          .from("group_members")
          .insert({ group_id: groupId, user_id: user.id });
        if (mErr && !mErr.message.includes("duplicate")) {
          console.warn("Erro ao entrar no grupo:", mErr.message);
          // Não bloqueia — finaliza onboarding mesmo assim
        }
      }

      await finishOnboarding();
    } catch (e: any) {
      toast.error("Erro ao entrar no grupo. Tente novamente.");
      setBusy(false);
    }
  }

  async function finishOnboarding() {
    if (!user) return;
    try {
      await supabase
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("id", user.id);
    } catch (e) {
      console.warn("Erro ao finalizar onboarding:", e);
    } finally {
      window.location.href = "/home";
    }
  }

  async function skip() {
    if (!user) {
      window.location.href = "/";
      return;
    }
    setBusy(true);
    await finishOnboarding();
  }

  if (loading) return null;

  return (
    <div>
      <Step n={5} total={5} />
      <h1 className="mt-6 text-3xl">Seu grupo.</h1>
      <p className="mt-2 text-muted-foreground">
        Você vai entrar em um grupo fechado com até 4 outras pessoas que têm o
        mesmo objetivo. Quem some, leva um alô.
      </p>

      <div className="mt-8 rounded-3xl bg-gradient-sunrise p-6 text-primary-foreground shadow-warm">
        <Users className="size-8" />
        <h2 className="mt-3 text-2xl text-primary-foreground">
          Accountability real
        </h2>
        <p className="mt-1 text-sm opacity-90">
          Pessoas que torcem por você e percebem quando você desaparece.
        </p>
      </div>

      <button
        disabled={busy}
        onClick={joinAndFinish}
        className="mt-8 w-full rounded-2xl bg-gradient-sunrise px-4 py-3.5 font-medium text-primary-foreground shadow-warm disabled:opacity-60"
      >
        {busy ? "Procurando seu grupo…" : "Quero entrar em um grupo"}
      </button>
      <button
        disabled={busy}
        onClick={skip}
        className="mt-3 w-full rounded-2xl px-4 py-3 text-sm text-muted-foreground"
      >
        Pular por enquanto
      </button>
    </div>
  );
}
