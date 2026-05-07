import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { calcCyclePhase, PHASE_INFO, dayInCycle } from "@/lib/cycle";
import { motion } from "framer-motion";
import { Flame, MessageCircle, Play, Pencil } from "lucide-react";
import { MealPhotoScanner } from "@/components/MealPhotoScanner";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/home")({
  component: HomePage,
});

function HomePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [todayCal, setTodayCal] = useState(0);
  const [todayWorkout, setTodayWorkout] = useState<any>(null);

  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState("");

  async function loadAll() {
    if (!user) return;
    const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    setProfile(p);
    const today = new Date().toISOString().slice(0, 10);
    const { data: meals } = await supabase.from("eating_logs").select("calories").eq("user_id", user.id).gte("datetime", today);
    setTodayCal((meals ?? []).reduce((a: number, m: any) => a + (m.calories || 0), 0));
    const dow = new Date().getDay();
    const { data: w } = await supabase.from("workout_plan").select("*").eq("user_id", user.id).eq("day_of_week", dow).maybeSingle();
    setTodayWorkout(w);
  }
  useEffect(() => { loadAll(); }, [user]);

  async function saveGoal() {
    const n = parseInt(goalInput);
    if (!n || n < 800 || n > 6000) { toast.error("Meta entre 800 e 6000 kcal"); return; }
    const { error } = await supabase.from("profiles").update({ daily_calorie_goal: n } as any).eq("id", user!.id);
    if (error) return toast.error(error.message);
    setProfile({ ...profile, daily_calorie_goal: n });
    setEditingGoal(false);
    toast.success("Meta atualizada");
  }

  const hour = new Date().getHours();
  const greet = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const phase = profile?.tracks_cycle ? calcCyclePhase(profile.cycle_start_date, profile.cycle_duration) : null;
  const phaseInfo = phase ? PHASE_INFO[phase] : null;
  const calGoal = profile?.daily_calorie_goal ?? 2000;
  const pct = Math.min(100, Math.round((todayCal / calGoal) * 100));

  return (
    <div className="px-5 pt-10">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-sm text-muted-foreground">{greet},</p>
        <h1 className="text-3xl">{profile?.name?.split(" ")[0] ?? "—"}.</h1>
      </motion.div>

      {phaseInfo && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="mt-6 rounded-3xl border border-border bg-card p-5 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="text-3xl">{phaseInfo.emoji}</div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Fase {phaseInfo.label} · dia {dayInCycle(profile.cycle_start_date, profile.cycle_duration)}</div>
              <div className="font-medium">{phaseInfo.tip}</div>
            </div>
          </div>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="mt-4 rounded-3xl bg-gradient-sunrise p-6 text-primary-foreground shadow-warm">
        <div className="text-xs uppercase tracking-wider opacity-80">Treino do dia</div>
        <div className="mt-1 text-2xl">{todayWorkout?.workout_name ?? "Descanso ativo"}</div>
        <div className="mt-1 text-sm opacity-90">{todayWorkout ? `${todayWorkout.duration_minutes} min · ${todayWorkout.muscle_group}` : "Aproveite para se mobilizar"}</div>
        <Link to="/workout" className="mt-4 inline-flex items-center gap-2 rounded-full bg-card/20 px-4 py-2 text-sm font-medium backdrop-blur">
          <Play className="size-4" /> Iniciar
        </Link>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="mt-4 rounded-3xl border border-border bg-card p-5 shadow-soft">
        <div className="flex items-baseline justify-between">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Calorias hoje</div>
          {!editingGoal ? (
            <button onClick={() => { setGoalInput(String(calGoal)); setEditingGoal(true); }} className="flex items-center gap-1 text-sm">
              <span className="font-semibold">{todayCal}</span>
              <span className="text-muted-foreground">/ {calGoal}</span>
              <Pencil className="size-3 text-muted-foreground" />
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <input autoFocus value={goalInput} onChange={(e) => setGoalInput(e.target.value)} inputMode="numeric" className="w-20 rounded-lg border border-input bg-background px-2 py-1 text-right text-sm outline-none focus:ring-2 focus:ring-ring" />
              <button onClick={saveGoal} className="rounded-lg bg-primary px-2 py-1 text-xs text-primary-foreground">OK</button>
            </div>
          )}
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }} className="h-full bg-gradient-sunrise" />
        </div>
        <div className="mt-2 text-xs text-muted-foreground">Restam <span className="font-medium text-foreground">{Math.max(0, calGoal - todayCal)}</span> kcal</div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-4">
        <MealPhotoScanner onSaved={loadAll} />
      </motion.div>


      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Streak</div>
          <div className="mt-2 flex items-center gap-2">
            <Flame className="size-7 text-primary animate-flame" />
            <div className="text-3xl">{profile?.current_streak ?? 0}</div>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">dias seguidos</div>
        </div>
        <Link to="/coach" className="relative flex flex-col justify-between overflow-hidden rounded-3xl bg-gradient-ember p-5 text-primary-foreground shadow-warm">
          <MessageCircle className="size-6" />
          <div>
            <div className="text-xs uppercase tracking-wider opacity-80">Coach IA</div>
            <div className="text-lg font-medium">Falar agora</div>
          </div>
        </Link>
      </div>
    </div>
  );
}
