import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Check, X, Sparkles, Settings2, Moon } from "lucide-react";
import { toast } from "sonner";
import { SabotageModal } from "@/components/SabotageModal";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/_app/workout")({ component: WorkoutPage });

const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

type PlanRow = {
  id?: string;
  day_of_week: number;
  muscle_group: string;
  workout_name: string;
  duration_minutes: number;
  intensity?: number;
};

const PERIOD_EXERCISES = [
  { name: "Caminhada leve", desc: "20-30 min em ritmo confortável" },
  { name: "Yoga restaurativa", desc: "Posturas para aliviar cólica" },
  { name: "Alongamento lombar", desc: "Gato-vaca, criança, torção suave" },
  { name: "Pilates de solo", desc: "Movimentos sem impacto" },
  { name: "Respiração diafragmática", desc: "10 min, reduz tensão" },
  { name: "Mobilidade de quadril", desc: "Círculos e abertura suave" },
];

function generatePlanFor(goal?: string | null, level?: string | null): PlanRow[] {
  const dur = level === "iniciante" ? 35 : level === "avancado" ? 60 : 45;
  if (goal === "emagrecer" || goal === "perder_peso") {
    return [
      { day_of_week: 1, muscle_group: "Cardio + Core", workout_name: "HIIT queima", duration_minutes: dur },
      { day_of_week: 2, muscle_group: "Corpo todo", workout_name: "Full body resistência", duration_minutes: dur },
      { day_of_week: 3, muscle_group: "Cardio", workout_name: "Corrida intervalada", duration_minutes: dur - 5 },
      { day_of_week: 4, muscle_group: "Inferiores", workout_name: "Pernas + glúteos", duration_minutes: dur },
      { day_of_week: 5, muscle_group: "Cardio + Core", workout_name: "Funcional", duration_minutes: dur },
      { day_of_week: 6, muscle_group: "Ativo", workout_name: "Caminhada longa", duration_minutes: 50 },
    ];
  }
  if (goal === "ganhar_massa" || goal === "hipertrofia") {
    return [
      { day_of_week: 1, muscle_group: "Peito + Tríceps", workout_name: "Push A", duration_minutes: dur },
      { day_of_week: 2, muscle_group: "Costas + Bíceps", workout_name: "Pull A", duration_minutes: dur },
      { day_of_week: 3, muscle_group: "Pernas", workout_name: "Legs A", duration_minutes: dur + 5 },
      { day_of_week: 4, muscle_group: "Ombros + Core", workout_name: "Push B", duration_minutes: dur },
      { day_of_week: 5, muscle_group: "Costas + Bíceps", workout_name: "Pull B", duration_minutes: dur },
      { day_of_week: 6, muscle_group: "Pernas", workout_name: "Legs B", duration_minutes: dur + 5 },
    ];
  }
  // definir / manter
  return [
    { day_of_week: 1, muscle_group: "Peito + Tríceps", workout_name: "Push", duration_minutes: dur },
    { day_of_week: 2, muscle_group: "Costas + Bíceps", workout_name: "Pull", duration_minutes: dur },
    { day_of_week: 3, muscle_group: "Pernas", workout_name: "Legs", duration_minutes: dur },
    { day_of_week: 4, muscle_group: "Cardio + Core", workout_name: "HIIT", duration_minutes: 30 },
    { day_of_week: 5, muscle_group: "Corpo todo", workout_name: "Full body", duration_minutes: dur },
  ];
}

function WorkoutPage() {
  const { user } = useAuth();
  const [plan, setPlan] = useState<PlanRow[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [todayLog, setTodayLog] = useState<any>(null);
  const [sabotage, setSabotage] = useState(false);
  const [pendingSkip, setPendingSkip] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  // cycle prompt state
  const [cycleStep, setCycleStep] = useState<"ask" | "confirm" | "showing" | "dismissed" | null>(null);
  const [periodExercises, setPeriodExercises] = useState(false);

  async function load() {
    if (!user) return;
    const { data: pf } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    setProfile(pf);
    const { data: p } = await supabase.from("workout_plan").select("*").eq("user_id", user.id).order("day_of_week");
    setPlan((p ?? []) as any);
    const today = new Date().toISOString().slice(0, 10);
    const { data: l } = await supabase.from("workout_logs").select("*").eq("user_id", user.id).eq("date", today).maybeSingle();
    setTodayLog(l);
  }
  useEffect(() => { load(); }, [user]);

  // Cycle prompt: show when within 1 day of predicted cycle start
  useEffect(() => {
    if (!profile?.tracks_cycle || !profile?.cycle_start_date) return;
    if (profile.gender !== "feminino") return;
    const start = new Date(profile.cycle_start_date).getTime();
    const dur = (profile.cycle_duration ?? 28) * 86400000;
    const now = Date.now();
    const diff = now - start;
    const dayInCycle = Math.floor(((diff % dur) + dur) % dur / 86400000);
    const daysUntilNext = (profile.cycle_duration ?? 28) - dayInCycle;
    const within = daysUntilNext <= 1 || dayInCycle <= 1;
    if (!within) return;
    const key = `cycle_prompt_${user!.id}_${profile.cycle_start_date}`;
    const stored = localStorage.getItem(key);
    if (stored === "confirmed_exercises") { setPeriodExercises(true); setCycleStep("showing"); return; }
    if (stored === "dismissed") { setCycleStep("dismissed"); return; }
    if (stored === "started_no_ex") return;
    setCycleStep("ask");
  }, [profile, user]);

  function persistCycle(value: string) {
    const key = `cycle_prompt_${user!.id}_${profile.cycle_start_date}`;
    localStorage.setItem(key, value);
  }

  const dow = new Date().getDay();
  const today = plan.find((p) => p.day_of_week === dow);

  async function log(status: "concluido" | "pulado") {
    if (!today) return toast.error("Sem treino hoje");
    if (status === "pulado" && !pendingSkip) {
      setSabotage(true);
      setPendingSkip(true);
      return;
    }
    const { error } = await supabase.from("workout_logs").insert({
      user_id: user!.id, muscle_group: today.muscle_group, workout_name: today.workout_name,
      duration_minutes: today.duration_minutes, status,
    });
    if (error) return toast.error(error.message);
    toast.success(status === "concluido" ? "Mandou bem!" : "Tudo bem, amanhã é outro dia");
    setPendingSkip(false);
    load();
  }

  async function generateWithAI() {
    if (!user) return;
    setGenerating(true);
    try {
      const rows = generatePlanFor(profile?.goal, profile?.experience_level);
      await supabase.from("workout_plan").delete().eq("user_id", user.id);
      const { error } = await supabase.from("workout_plan").insert(rows.map((r) => ({ ...r, user_id: user.id })));
      if (error) throw error;
      toast.success("Plano gerado com IA ✨");
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="px-5 pt-10">
      <h1 className="text-3xl">Treino</h1>

      {/* Cycle awareness card */}
      <AnimatePresence>
        {cycleStep === "ask" && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mt-5 rounded-3xl border border-border bg-card p-4 shadow-soft">
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent"><Moon className="size-5 text-primary" /></span>
              <div className="flex-1">
                <div className="text-sm font-medium">Tudo bem por aí?</div>
                <div className="mt-0.5 text-sm text-muted-foreground">Seu ciclo pode estar chegando 🌙</div>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => setCycleStep("confirm")} className="flex-1 rounded-full bg-gradient-sunrise py-2 text-xs font-medium text-primary-foreground shadow-warm">Sim, já começou</button>
                  <button onClick={() => { persistCycle("dismissed"); setCycleStep("dismissed"); }} className="flex-1 rounded-full border border-border bg-card py-2 text-xs">Ainda não</button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
        {cycleStep === "confirm" && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mt-5 rounded-3xl border border-border bg-card p-4 shadow-soft">
            <div className="text-sm">
              Quer ver exercícios pensados pra esse momento? São leves, ajudam com cólica e não têm risco de vazamento 🩷
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={() => { persistCycle("confirmed_exercises"); setPeriodExercises(true); setCycleStep("showing"); }} className="flex-1 rounded-full bg-gradient-sunrise py-2 text-xs font-medium text-primary-foreground shadow-warm">Sim, mostrar</button>
              <button onClick={() => { persistCycle("started_no_ex"); setCycleStep("dismissed"); }} className="flex-1 rounded-full border border-border bg-card py-2 text-xs">Agora não</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI / customize actions */}
      <div className="mt-5 grid grid-cols-2 gap-2">
        <button onClick={generateWithAI} disabled={generating}
          className="flex items-center justify-center gap-1.5 rounded-2xl bg-gradient-sunrise px-3 py-3 text-xs font-medium text-primary-foreground shadow-warm disabled:opacity-60">
          <Sparkles className="size-4" /> {generating ? "Gerando…" : "Gerar meu treino com IA"}
        </button>
        <button onClick={() => setCustomOpen(true)}
          className="flex items-center justify-center gap-1.5 rounded-2xl border border-border bg-card px-3 py-3 text-xs font-medium shadow-soft">
          <Settings2 className="size-4 text-primary" /> Personalizar treino
        </button>
      </div>

      {/* Period exercises override today's card */}
      {periodExercises ? (
        <div className="mt-6 rounded-3xl border border-border bg-card p-5 shadow-soft">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
            <Moon className="size-3.5" /> Treino para o ciclo
          </div>
          <div className="mt-1 text-2xl">Cuidado com você</div>
          <ul className="mt-4 space-y-2">
            {PERIOD_EXERCISES.map((e) => (
              <li key={e.name} className="rounded-2xl bg-accent/60 p-3">
                <div className="text-sm font-medium">{e.name}</div>
                <div className="text-xs text-muted-foreground">{e.desc}</div>
              </li>
            ))}
          </ul>
          <button onClick={() => { setPeriodExercises(false); }} className="mt-4 w-full rounded-full border border-border bg-card py-2 text-xs">Voltar ao treino normal</button>
        </div>
      ) : (
        <div className="mt-6 rounded-3xl bg-gradient-sunrise p-6 text-primary-foreground shadow-warm">
          <div className="text-xs uppercase tracking-wider opacity-80">Hoje</div>
          <div className="mt-1 text-2xl">{today?.workout_name ?? "Descanso"}</div>
          <div className="mt-1 text-sm opacity-90">{today ? `${today.muscle_group} · ${today.duration_minutes} min` : "Aproveite para descansar"}</div>
          {today && !todayLog && (
            <div className="mt-4 flex gap-2">
              <button onClick={() => log("concluido")} className="flex-1 rounded-full bg-card text-foreground py-2.5 text-sm font-medium"><Check className="mr-1 inline size-4" />Concluí</button>
              <button onClick={() => log("pulado")} className="rounded-full bg-card/20 px-4 py-2.5 text-sm"><X className="size-4" /></button>
            </div>
          )}
          {todayLog && <div className="mt-4 rounded-full bg-card/20 px-4 py-2 text-center text-sm">{todayLog.status === "concluido" ? "Concluído ✓" : "Pulado"}</div>}
        </div>
      )}

      <h2 className="mt-8 text-lg">Plano da semana</h2>
      <div className="mt-3 space-y-2">
        {days.map((d, i) => {
          const it = plan.find((p) => p.day_of_week === i);
          return (
            <div key={i} className={`flex items-center justify-between rounded-2xl border p-4 ${i === dow ? "border-primary bg-accent" : "border-border bg-card"}`}>
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{d}</div>
                <div className="font-medium">{it?.workout_name ?? "Descanso"}</div>
                {it?.muscle_group && <div className="text-xs text-muted-foreground">{it.muscle_group}</div>}
              </div>
              <div className="text-xs text-muted-foreground">{it?.duration_minutes ? `${it.duration_minutes} min` : "—"}</div>
            </div>
          );
        })}
      </div>

      {plan.length === 0 && (
        <p className="mt-4 text-center text-xs text-muted-foreground">Toque em "Gerar meu treino com IA" para começar.</p>
      )}

      <SabotageModal open={sabotage} trigger="skip_workout" onClose={() => { setSabotage(false); }} />
      {pendingSkip && !sabotage && (
        <div className="fixed inset-x-0 bottom-28 z-30 mx-auto flex max-w-md gap-2 px-5">
          <button onClick={() => setPendingSkip(false)} className="flex-1 rounded-full bg-card py-3 text-sm shadow-elev">Vou treinar</button>
          <button onClick={() => log("pulado")} className="flex-1 rounded-full bg-foreground/80 py-3 text-sm text-primary-foreground shadow-elev">Pular mesmo</button>
        </div>
      )}

      <CustomizeModal open={customOpen} onClose={() => setCustomOpen(false)} plan={plan} onSaved={load} />
    </div>
  );
}

function CustomizeModal({ open, onClose, plan, onSaved }: { open: boolean; onClose: () => void; plan: PlanRow[]; onSaved: () => void }) {
  const { user } = useAuth();
  const [rows, setRows] = useState<PlanRow[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const base = Array.from({ length: 7 }, (_, i) => {
      const existing = plan.find((p) => p.day_of_week === i);
      return existing ?? { day_of_week: i, muscle_group: "", workout_name: "", duration_minutes: 0, intensity: 1 };
    });
    setRows(base);
  }, [open, plan]);

  function update(idx: number, patch: Partial<PlanRow>) {
    setRows((r) => r.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  }

  async function save() {
    if (!user) return;
    setSaving(true);
    try {
      await supabase.from("workout_plan").delete().eq("user_id", user.id);
      const toInsert = rows
        .filter((r) => r.workout_name.trim() && r.muscle_group.trim() && r.duration_minutes > 0)
        .map((r) => ({
          user_id: user.id,
          day_of_week: r.day_of_week,
          muscle_group: r.muscle_group,
          workout_name: r.workout_name,
          duration_minutes: r.duration_minutes,
          intensity: r.intensity ?? 1,
        }));
      if (toInsert.length) {
        const { error } = await supabase.from("workout_plan").insert(toInsert);
        if (error) throw error;
      }
      toast.success("Treino personalizado salvo");
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 backdrop-blur-sm"
          onClick={onClose}>
          <motion.div initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-card p-5 shadow-elev">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted" />
            <h2 className="text-xl">Personalizar treino</h2>
            <p className="mt-1 text-xs text-muted-foreground">Edite cada dia. Deixe em branco para descanso.</p>
            <div className="mt-4 space-y-3">
              {rows.map((r, i) => (
                <div key={i} className="rounded-2xl border border-border bg-background p-3">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">{days[i]}</div>
                  <input value={r.workout_name} onChange={(e) => update(i, { workout_name: e.target.value })} placeholder="Nome do treino" className="mt-2 w-full rounded-xl border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
                  <input value={r.muscle_group} onChange={(e) => update(i, { muscle_group: e.target.value })} placeholder="Grupo muscular" className="mt-2 w-full rounded-xl border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <label className="text-xs text-muted-foreground">
                      Duração (min)
                      <input type="number" min={0} max={180} value={r.duration_minutes} onChange={(e) => update(i, { duration_minutes: parseInt(e.target.value || "0") })} className="mt-1 w-full rounded-xl border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
                    </label>
                    <label className="text-xs text-muted-foreground">
                      Intensidade
                      <select value={r.intensity ?? 1} onChange={(e) => update(i, { intensity: parseFloat(e.target.value) })} className="mt-1 w-full rounded-xl border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring">
                        <option value={0.7}>Leve</option>
                        <option value={1}>Moderada</option>
                        <option value={1.3}>Intensa</option>
                      </select>
                    </label>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={onClose} className="flex-1 rounded-full border border-border bg-card py-3 text-sm">Cancelar</button>
              <button onClick={save} disabled={saving} className="flex-[2] rounded-full bg-gradient-sunrise py-3 text-sm font-medium text-primary-foreground shadow-warm disabled:opacity-60">{saving ? "Salvando…" : "Salvar"}</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
