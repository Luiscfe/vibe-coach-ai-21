import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { CoachPromptBar } from "@/components/CoachPromptBar";
import { Trash2, ChevronLeft, ChevronRight, Flame } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/home")({ component: HomePage });

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function getWeekDays(center: Date) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(center);
    d.setDate(center.getDate() - 3 + i);
    return d;
  });
}

// Gráfico circular reutilizável
function CircleProgress({ value, max, color, size = 64, strokeWidth = 5 }: {
  value: number; max: number; color: string; size?: number; strokeWidth?: number;
}) {
  const r = (size - strokeWidth * 2) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(value / (max || 1), 1);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="currentColor" strokeWidth={strokeWidth} className="text-muted/30" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={`${pct * circ} ${circ}`} strokeLinecap="round" />
    </svg>
  );
}

function HomePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [meals, setMeals] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const channelRef = useRef<any>(null);

  const todayStr = new Date().toISOString().slice(0, 10);
  const selectedDateStr = selectedDate.toISOString().slice(0, 10);
  const isToday = selectedDateStr === todayStr;

  const loadProfile = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    setProfile(data);
  }, [user]);

  const loadMeals = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("eating_logs")
      .select("*")
      .eq("user_id", user.id)
      .gte("datetime", selectedDateStr)
      .lt("datetime", selectedDateStr + "T23:59:59")
      .order("datetime", { ascending: false });
    setMeals(data ?? []);
  }, [user, selectedDateStr]);

  useEffect(() => { loadProfile(); }, [loadProfile]);
  useEffect(() => { loadMeals(); }, [loadMeals]);

  // Realtime apenas para hoje
  useEffect(() => {
    if (!user || !isToday) return;
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    channelRef.current = supabase
      .channel(`home_meals_${user.id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "eating_logs",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const m = payload.new as any;
        if (m.datetime?.slice(0, 10) === todayStr)
          setMeals((prev) => prev.find((x) => x.id === m.id) ? prev : [m, ...prev]);
      })
      .on("postgres_changes", {
        event: "DELETE", schema: "public", table: "eating_logs",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setMeals((prev) => prev.filter((x) => x.id !== payload.old.id));
      })
      .subscribe();
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, [user, isToday, todayStr]);

  async function deleteMeal(id: string, calories: number) {
    const { error } = await supabase.from("eating_logs").delete().eq("id", id);
    if (error) return toast.error("Erro ao remover refeição");
    setMeals((prev) => prev.filter((m) => m.id !== id));
    toast.success(`-${calories} kcal removidas`);
  }

  const totals = meals.reduce(
    (a, m: any) => ({
      cal: a.cal + (m.calories || 0),
      p: a.p + Number(m.protein_g || 0),
      c: a.c + Number(m.carbs_g || 0),
      f: a.f + Number(m.fat_g || 0),
    }),
    { cal: 0, p: 0, c: 0, f: 0 }
  );

  const calGoal = profile?.daily_calorie_goal ?? 2000;
  const pGoal = profile?.daily_protein_goal ?? 163;
  const cGoal = profile?.daily_carbs_goal ?? 442;
  const fGoal = profile?.daily_fat_goal ?? 102;
  const calRemaining = Math.max(0, calGoal - totals.cal);
  const streak = profile?.streak ?? 0;
  const firstName = profile?.name?.split(" ")?.[0] ?? "você";
  const weekDays = getWeekDays(selectedDate);

  function shiftWeek(dir: number) {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + dir * 7);
    setSelectedDate(d);
  }

  return (
    <div className="px-4 pt-5 pb-32">

      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Olá,</p>
          <h1 className="text-lg font-semibold capitalize">{firstName} 👋</h1>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 shadow-soft">
          <Flame className="size-4 text-primary" />
          <span className="text-sm font-semibold">{streak}</span>
          <span className="text-xs text-muted-foreground">dias</span>
        </div>
      </div>

      {/* Coach bar */}
      <div className="mb-4">
        <CoachPromptBar />
      </div>

      {/* Seletor de data */}
      <div className="mb-4 flex items-center gap-1">
        <button onClick={() => shiftWeek(-1)}
          className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground">
          <ChevronLeft className="size-4" />
        </button>
        <div className="flex flex-1 justify-around">
          {weekDays.map((d) => {
            const str = d.toISOString().slice(0, 10);
            const isSelected = str === selectedDateStr;
            const isTodayDay = str === todayStr;
            return (
              <button key={str} onClick={() => setSelectedDate(new Date(d))}
                className={`flex flex-col items-center gap-0.5 rounded-2xl px-1.5 py-1.5 transition ${isSelected ? "bg-foreground text-background" : ""}`}>
                <span className={`text-[10px] ${isSelected ? "text-background/70" : "text-muted-foreground"}`}>
                  {DAY_LABELS[d.getDay()]}
                </span>
                <span className={`text-xs font-semibold ${isTodayDay && !isSelected ? "text-primary" : isSelected ? "text-background" : ""}`}>
                  {d.getDate()}
                </span>
              </button>
            );
          })}
        </div>
        <button onClick={() => shiftWeek(1)}
          className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground">
          <ChevronRight className="size-4" />
        </button>
      </div>

      {/* Card calorias */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
        className="mb-4 flex items-center justify-between rounded-3xl border border-border bg-card p-5 shadow-soft">
        <div>
          <p className="text-3xl font-bold tabular-nums">{calRemaining}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">Calorias restantes</p>
          <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
            <span>🎯 {calGoal} meta</span>
            <span>🔥 {totals.cal} consumido</span>
          </div>
        </div>
        <div className="relative">
          <CircleProgress value={totals.cal} max={calGoal} color="#F97316" size={80} strokeWidth={7} />
          <div className="absolute inset-0 flex items-center justify-center">
            <Flame className="size-6 text-primary" />
          </div>
        </div>
      </motion.div>

      {/* Cards macros com gráfico circular */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }} className="mb-5 grid grid-cols-3 gap-3">
        {[
          { label: "Proteínas", val: totals.p, goal: pGoal, color: "#ef4444" },
          { label: "Carboidratos", val: totals.c, goal: cGoal, color: "#F97316" },
          { label: "Gorduras", val: totals.f, goal: fGoal, color: "#3b82f6" },
        ].map((m) => (
          <div key={m.label}
            className="flex flex-col items-center rounded-2xl border border-border bg-card p-3 shadow-soft">
            <p className="mb-1 text-[10px] font-medium text-muted-foreground text-center">{m.label}</p>
            <div className="relative my-1">
              <CircleProgress value={m.val} max={m.goal} color={m.color} size={52} strokeWidth={4} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[9px] font-bold" style={{ color: m.color }}>
                  {Math.round(m.val)}g
                </span>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">
              {Math.max(0, Math.round(m.goal - m.val))}g rest.
            </p>
          </div>
        ))}
      </motion.div>

      {/* Lista refeições */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            {isToday ? "Hoje" : selectedDate.toLocaleDateString("pt-BR", {
              weekday: "long", day: "numeric", month: "short"
            })}
          </h2>
          <span className="text-xs text-muted-foreground">
            {meals.length} refeição{meals.length !== 1 ? "ões" : ""}
          </span>
        </div>
        <div className="space-y-2">
          {meals.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border p-6 text-center">
              <p className="text-sm text-muted-foreground">
                {isToday ? "Nenhuma refeição registrada hoje." : "Nenhuma refeição neste dia."}
              </p>
              {isToday && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Use o botão 📷 abaixo para registrar
                </p>
              )}
            </div>
          )}
          {meals.map((m: any) => (
            <MealRow key={m.id} meal={m} onDelete={deleteMeal} />
          ))}
        </div>
      </div>
    </div>
  );
}

function MealRow({ meal, onDelete }: {
  meal: any; onDelete: (id: string, cal: number) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const time = new Date(meal.datetime).toLocaleTimeString("pt-BR", {
    hour: "2-digit", minute: "2-digit",
  });
  const isTemp = meal.id?.toString().startsWith("temp_");

  return (
    <div className={`flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-soft transition-opacity ${isTemp ? "opacity-60" : ""}`}>
      <div className="size-14 shrink-0 overflow-hidden rounded-xl bg-muted">
        {meal.image_url
          ? <img src={meal.image_url} alt={meal.description} className="size-full object-cover" />
          : <div className="grid size-full place-items-center text-xl">🍽️</div>
        }
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{meal.description ?? "Refeição"}</div>
        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Flame className="size-3 text-primary" />
          <span className="font-medium text-foreground">{meal.calories ?? 0} cal</span>
          <span>· {time}</span>
        </div>
        <div className="mt-1 flex gap-2 text-[10px]">
          <span className="font-semibold text-red-500">{Math.round(Number(meal.protein_g || 0))}g P</span>
          <span className="font-semibold text-primary">{Math.round(Number(meal.carbs_g || 0))}g C</span>
          <span className="font-semibold text-blue-500">{Math.round(Number(meal.fat_g || 0))}g G</span>
        </div>
      </div>
      {!isTemp && (
        confirming ? (
          <div className="flex gap-1">
            <button onClick={() => onDelete(meal.id, meal.calories)}
              className="rounded-lg bg-destructive px-2 py-1 text-[10px] font-medium text-white">Sim</button>
            <button onClick={() => setConfirming(false)}
              className="rounded-lg bg-muted px-2 py-1 text-[10px] text-muted-foreground">Não</button>
          </div>
        ) : (
          <button onClick={() => setConfirming(true)}
            className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground">
            <Trash2 className="size-4" />
          </button>
        )
      )}
    </div>
  );
}
