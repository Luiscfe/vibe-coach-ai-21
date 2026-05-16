import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { CalorieArc } from "@/components/CalorieArc";
import { MacroCards } from "@/components/MacroCards";
import { MealScannerFab } from "@/components/MealScannerFab";
import { CoachPromptBar } from "@/components/CoachPromptBar";

export const Route = createFileRoute("/_app/home")({ component: HomePage });

function HomePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [meals, setMeals] = useState<any[]>([]);

  async function loadAll() {
    if (!user) return;
    const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    setProfile(p);
    const today = new Date().toISOString().slice(0, 10);
    const { data: m } = await supabase
      .from("eating_logs")
      .select("*")
      .eq("user_id", user.id)
      .gte("datetime", today)
      .order("datetime", { ascending: false });
    setMeals(m ?? []);
  }
  useEffect(() => { loadAll(); }, [user]);

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

  return (
    <div className="px-5 pt-6 pb-32">
      <div className="mb-5">
        <CoachPromptBar />
      </div>
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
        <CalorieArc consumed={totals.cal} goal={calGoal} />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-8">
        <MacroCards
          protein={{ current: totals.p, goal: pGoal }}
          carbs={{ current: totals.c, goal: cGoal }}
          fat={{ current: totals.f, goal: fGoal }}
        />
      </motion.div>

      <div className="mt-8">
        <h2 className="text-center text-base font-semibold">Hoje</h2>
        <div className="mt-4 space-y-3">
          {meals.length === 0 && (
            <p className="text-center text-sm text-muted-foreground">Nenhuma refeição registrada hoje.</p>
          )}
          {meals.map((m: any) => (
            <MealRow key={m.id} meal={m} />
          ))}
        </div>
      </div>

      <MealScannerFab onSaved={loadAll} />
    </div>
  );
}

function MealRow({ meal }: { meal: any }) {
  const time = new Date(meal.datetime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-soft">
      <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-muted">
        {meal.image_url ? (
          <img src={meal.image_url} alt={meal.description} className="size-full object-cover" />
        ) : (
          <div className="grid size-full place-items-center text-2xl">🍽️</div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{meal.description ?? "Refeição"}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          {time} · {meal.calories ?? 0} kcal
        </div>
        <div className="mt-1 flex gap-2 text-[10px] text-muted-foreground">
          <span><b className="text-destructive">{Math.round(Number(meal.protein_g || 0))}g</b> P</span>
          <span><b className="text-primary">{Math.round(Number(meal.carbs_g || 0))}g</b> C</span>
          <span><b className="text-[oklch(0.6_0.15_230)]">{Math.round(Number(meal.fat_g || 0))}g</b> G</span>
        </div>
      </div>
    </div>
  );
}
