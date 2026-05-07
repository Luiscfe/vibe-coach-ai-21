import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { SabotageModal } from "@/components/SabotageModal";

export const Route = createFileRoute("/_app/workout")({ component: WorkoutPage });

const days = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

function WorkoutPage() {
  const { user } = useAuth();
  const [plan, setPlan] = useState<any[]>([]);
  const [todayLog, setTodayLog] = useState<any>(null);
  const [sabotage, setSabotage] = useState(false);
  const [pendingSkip, setPendingSkip] = useState(false);

  async function load() {
    if (!user) return;
    const { data: p } = await supabase.from("workout_plan").select("*").eq("user_id", user.id).order("day_of_week");
    setPlan(p ?? []);
    const today = new Date().toISOString().slice(0, 10);
    const { data: l } = await supabase.from("workout_logs").select("*").eq("user_id", user.id).eq("date", today).maybeSingle();
    setTodayLog(l);
  }
  useEffect(() => { load(); }, [user]);

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

  return (
    <div className="px-5 pt-10">
      <h1 className="text-3xl">Treino</h1>

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

      <h2 className="mt-8 text-lg">Plano da semana</h2>
      <div className="mt-3 space-y-2">
        {days.map((d, i) => {
          const it = plan.find((p) => p.day_of_week === i);
          return (
            <div key={i} className={`flex items-center justify-between rounded-2xl border p-4 ${i === dow ? "border-primary bg-accent" : "border-border bg-card"}`}>
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{d}</div>
                <div className="font-medium">{it?.workout_name ?? "Descanso"}</div>
              </div>
              <div className="text-xs text-muted-foreground">{it?.duration_minutes ? `${it.duration_minutes} min` : "—"}</div>
            </div>
          );
        })}
      </div>
      {plan.length === 0 && (
        <button
          onClick={async () => {
            const seeds = [
              { day_of_week: 1, muscle_group: "Peito + Tríceps", workout_name: "Push", duration_minutes: 45 },
              { day_of_week: 2, muscle_group: "Costas + Bíceps", workout_name: "Pull", duration_minutes: 45 },
              { day_of_week: 3, muscle_group: "Pernas", workout_name: "Leg day", duration_minutes: 50 },
              { day_of_week: 4, muscle_group: "Core + Cardio", workout_name: "HIIT", duration_minutes: 30 },
              { day_of_week: 5, muscle_group: "Corpo todo", workout_name: "Full body", duration_minutes: 45 },
            ];
            await supabase.from("workout_plan").insert(seeds.map((s) => ({ ...s, user_id: user!.id })));
            load();
          }}
          className="mt-4 w-full rounded-2xl border border-dashed border-border py-3 text-sm text-muted-foreground"
        >Gerar plano inicial</button>
      )}
    </div>
  );
}
