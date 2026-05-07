import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { calcCyclePhase, PHASE_INFO, type CyclePhase } from "@/lib/cycle";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/cycle")({ component: CyclePage });

const PHASE_BG: Record<CyclePhase, string> = {
  menstrual: "bg-destructive/30",
  folicular: "bg-ember/40",
  ovulatoria: "bg-primary/40",
  lutea: "bg-blush/40",
};

function phaseFor(date: Date, start: string, dur: number): CyclePhase {
  const d = Math.floor((date.getTime() - new Date(start).getTime()) / 86400000);
  const day = ((d % dur) + dur) % dur;
  if (day < 5) return "menstrual";
  if (day < 14) return "folicular";
  if (day < 17) return "ovulatoria";
  return "lutea";
}

function CyclePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [selected, setSelected] = useState<string>(new Date().toISOString().slice(0, 10));
  const [cramp, setCramp] = useState(0);
  const [mood, setMood] = useState(0);
  const [bloating, setBloating] = useState(0);
  const [fatigue, setFatigue] = useState(0);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      setProfile(p);
      const { data: l } = await supabase.from("cycle_logs").select("*").eq("user_id", user.id);
      setLogs(l ?? []);
    })();
  }, [user]);

  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthDays = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const offset = monthStart.getDay();

  const cells = useMemo(() => {
    if (!profile?.cycle_start_date) return [];
    return Array.from({ length: monthDays }, (_, i) => {
      const d = new Date(today.getFullYear(), today.getMonth(), i + 1);
      const iso = d.toISOString().slice(0, 10);
      return { iso, day: i + 1, phase: phaseFor(d, profile.cycle_start_date, profile.cycle_duration ?? 28), log: logs.find((l) => l.date === iso) };
    });
  }, [profile, logs, monthDays]);

  const currentPhase = profile?.cycle_start_date ? calcCyclePhase(profile.cycle_start_date, profile.cycle_duration) : null;
  const info = currentPhase ? PHASE_INFO[currentPhase] : null;

  async function save() {
    if (!user) return;
    const phase = profile?.cycle_start_date ? phaseFor(new Date(selected), profile.cycle_start_date, profile.cycle_duration ?? 28) : null;
    const { error } = await supabase.from("cycle_logs").upsert({
      user_id: user.id, date: selected, phase,
      symptoms_cramp: cramp, symptoms_mood: mood, symptoms_bloating: bloating, symptoms_fatigue: fatigue, notes,
    } as any, { onConflict: "user_id,date" } as any);
    if (error) return toast.error(error.message);
    toast.success("Anotado");
    const { data: l } = await supabase.from("cycle_logs").select("*").eq("user_id", user.id);
    setLogs(l ?? []);
  }

  if (!profile?.tracks_cycle) {
    return <div className="px-5 pt-10"><h1 className="text-3xl">Ciclo</h1><p className="mt-3 text-muted-foreground">Acompanhamento de ciclo desativado.</p></div>;
  }

  return (
    <div className="px-5 pt-10">
      <h1 className="text-3xl">Ciclo</h1>
      {info && (
        <div className="mt-4 rounded-3xl bg-gradient-sunrise p-5 text-primary-foreground shadow-warm">
          <div className="text-2xl">{info.emoji} {info.label}</div>
          <p className="mt-1 text-sm opacity-90">{info.tip}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl bg-card/15 p-2"><div className="opacity-70">Treino</div><div className="mt-0.5">{info.workout}</div></div>
            <div className="rounded-xl bg-card/15 p-2"><div className="opacity-70">Dieta</div><div className="mt-0.5">{info.diet}</div></div>
          </div>
        </div>
      )}

      <h2 className="mt-8 text-lg">{today.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</h2>
      <div className="mt-3 grid grid-cols-7 gap-1.5 text-center text-[10px] text-muted-foreground">
        {["D","S","T","Q","Q","S","S"].map((d, i) => <div key={i}>{d}</div>)}
        {Array.from({ length: offset }, (_, i) => <div key={`e${i}`} />)}
        {cells.map((c) => (
          <button key={c.iso} onClick={() => { setSelected(c.iso); const ex = c.log; setCramp(ex?.symptoms_cramp ?? 0); setMood(ex?.symptoms_mood ?? 0); setBloating(ex?.symptoms_bloating ?? 0); setFatigue(ex?.symptoms_fatigue ?? 0); setNotes(ex?.notes ?? ""); }}
            className={`relative aspect-square rounded-xl text-xs font-medium ${PHASE_BG[c.phase]} ${selected === c.iso ? "ring-2 ring-primary" : ""}`}>
            <span className="text-foreground">{c.day}</span>
            {c.log && <span className="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-foreground/60" />}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
        {(Object.keys(PHASE_INFO) as CyclePhase[]).map((k) => (
          <div key={k} className="flex items-center gap-1.5"><span className={`size-3 rounded ${PHASE_BG[k]}`} />{PHASE_INFO[k].label}</div>
        ))}
      </div>

      <h2 className="mt-8 text-lg">Sintomas — {new Date(selected + "T00:00").toLocaleDateString("pt-BR")}</h2>
      <div className="mt-3 space-y-3 rounded-3xl border border-border bg-card p-4 shadow-soft">
        <Slider label="Cólica" value={cramp} onChange={setCramp} />
        <Slider label="Humor (baixo→ótimo)" value={mood} onChange={setMood} />
        <Slider label="Inchaço" value={bloating} onChange={setBloating} />
        <Slider label="Cansaço" value={fatigue} onChange={setFatigue} />
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas…" rows={2} className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
        <button onClick={save} className="w-full rounded-2xl bg-gradient-sunrise py-2.5 text-sm font-medium text-primary-foreground shadow-warm">Salvar</button>
      </div>
    </div>
  );
}

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex justify-between text-xs"><span className="text-muted-foreground">{label}</span><span className="font-medium">{value}</span></div>
      <input type="range" min={0} max={5} value={value} onChange={(e) => onChange(parseInt(e.target.value))} className="mt-1 w-full accent-primary" />
    </div>
  );
}
