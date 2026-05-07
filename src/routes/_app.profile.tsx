import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Heart, CalendarDays, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { SabotageModal } from "@/components/SabotageModal";

export const Route = createFileRoute("/_app/profile")({ component: ProfilePage });

function ProfilePage() {
  const { user, session } = useAuth();
  const [p, setP] = useState<any>(null);
  const [showAnchor, setShowAnchor] = useState(false);
  const [adapting, setAdapting] = useState(false);
  useEffect(() => { if (user) supabase.from("profiles").select("*").eq("id", user.id).single().then(({ data }) => setP(data)); }, [user]);

  async function toggle(field: "sabotage_mode_enabled" | "group_alerts_enabled", value: boolean) {
    await supabase.from("profiles").update({ [field]: value } as any).eq("id", user!.id);
    setP({ ...p, [field]: value });
    toast.success("Atualizado");
  }

  async function runAdapt() {
    setAdapting(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/adapt-plan`;
      const r = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${session?.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Erro");
      toast.success(`Aderência ${j.score}% — ${j.note}`);
    } catch (e: any) { toast.error(e.message); } finally { setAdapting(false); }
  }

  return (
    <div className="px-5 pt-10">
      <div className="flex items-center gap-4">
        <div className="grid size-16 place-items-center rounded-full bg-gradient-sunrise text-2xl font-medium text-primary-foreground">{p?.name?.[0] ?? "?"}</div>
        <div>
          <h1 className="text-2xl">{p?.name}</h1>
          <p className="text-sm text-muted-foreground">{p?.email}</p>
        </div>
      </div>

      <div className="mt-8 space-y-3">
        <Stat label="Objetivo" value={p?.goal} />
        <Stat label="Peso" value={p?.weight ? `${p.weight} kg` : "—"} />
        <Stat label="Altura" value={p?.height ? `${p.height} cm` : "—"} />
        <Stat label="Streak" value={`${p?.current_streak ?? 0} dias`} />
      </div>

      <h2 className="mt-8 text-lg">Configurações</h2>
      <div className="mt-3 space-y-2">
        {p?.tracks_cycle && (
          <Link to="/cycle" className="flex w-full items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 shadow-soft">
            <span className="flex items-center gap-2 text-sm"><CalendarDays className="size-4 text-primary" />Ciclo menstrual</span>
            <span className="text-xs text-muted-foreground">Ver</span>
          </Link>
        )}
        <button onClick={() => setShowAnchor(true)} className="flex w-full items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 shadow-soft">
          <span className="flex items-center gap-2 text-sm"><Heart className="size-4 text-primary" />Ver minha âncora</span>
        </button>
        <button onClick={runAdapt} disabled={adapting} className="flex w-full items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 shadow-soft disabled:opacity-60">
          <span className="flex items-center gap-2 text-sm"><Sparkles className="size-4 text-primary" />Adaptar plano agora</span>
          <span className="text-xs text-muted-foreground">{adapting ? "…" : "Rodar"}</span>
        </button>
        <Toggle label="Modo Sabotagem" value={p?.sabotage_mode_enabled} onChange={(v) => toggle("sabotage_mode_enabled", v)} />
        <Toggle label="Alertas do grupo" value={p?.group_alerts_enabled} onChange={(v) => toggle("group_alerts_enabled", v)} />
      </div>

      <button onClick={async () => { await supabase.auth.signOut(); window.location.href = "/"; }} className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card py-3 text-sm">
        <LogOut className="size-4" /> Sair
      </button>

      <SabotageModal open={showAnchor} trigger="manual" onClose={() => setShowAnchor(false)} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between rounded-2xl border border-border bg-card px-4 py-3 shadow-soft">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value ?? "—"}</span>
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)} className="flex w-full items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 shadow-soft">
      <span className="text-sm">{label}</span>
      <span className={`relative h-6 w-11 rounded-full transition ${value ? "bg-primary" : "bg-muted"}`}>
        <span className={`absolute top-0.5 size-5 rounded-full bg-card shadow transition ${value ? "left-5" : "left-0.5"}`} />
      </span>
    </button>
  );
}
