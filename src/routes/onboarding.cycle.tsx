import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Step, Label } from "./onboarding.profile";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding/cycle")({
  component: CycleStep,
});

function CycleStep() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [tracks, setTracks] = useState<boolean | null>(null);
  const [start, setStart] = useState("");
  const [duration, setDuration] = useState("28");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!loading && !user) nav({ to: "/" }); }, [loading, user, nav]);

  async function next() {
    if (tracks === null) return;
    setBusy(true);
    const payload: any = { tracks_cycle: tracks };
    if (tracks) {
      if (!start) { setBusy(false); return toast.error("Informe o último ciclo"); }
      payload.cycle_start_date = start;
      payload.cycle_duration = parseInt(duration) || 28;
    }
    const { error } = await supabase.from("profiles").update(payload).eq("id", user!.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    nav({ to: "/onboarding/group" });
  }

  return (
    <div>
      <Step n={4} total={5} />
      <h1 className="mt-6 text-3xl">Seu ciclo.</h1>
      <p className="mt-2 text-muted-foreground">Vamos adaptar treinos e alimentação automaticamente em cada fase.</p>

      <div className="mt-8 grid grid-cols-2 gap-3">
        <button onClick={() => setTracks(true)} className={`rounded-2xl border p-5 text-left ${tracks === true ? "border-primary bg-accent" : "border-border bg-card"}`}>
          <div className="text-2xl">🌒</div>
          <div className="mt-1 font-medium">Sim, acompanho</div>
        </button>
        <button onClick={() => setTracks(false)} className={`rounded-2xl border p-5 text-left ${tracks === false ? "border-primary bg-accent" : "border-border bg-card"}`}>
          <div className="text-2xl">↗️</div>
          <div className="mt-1 font-medium">Não, pular</div>
        </button>
      </div>

      {tracks && (
        <div className="mt-6 space-y-4">
          <div>
            <Label>Primeiro dia do último ciclo</Label>
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="mt-2 w-full rounded-2xl border border-input bg-card px-4 py-3 outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <Label>Duração média (dias)</Label>
            <input type="number" min={20} max={40} value={duration} onChange={(e) => setDuration(e.target.value)} className="mt-2 w-full rounded-2xl border border-input bg-card px-4 py-3 outline-none focus:ring-2 focus:ring-ring" />
          </div>
        </div>
      )}

      <button disabled={busy || tracks === null} onClick={next} className="mt-10 w-full rounded-2xl bg-gradient-sunrise px-4 py-3.5 font-medium text-primary-foreground shadow-warm disabled:opacity-60">Continuar</button>
    </div>
  );
}
