import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Plus, ThumbsUp, ThumbsDown, Minus, Pencil, Check, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { SabotageModal } from "@/components/SabotageModal";

export const Route = createFileRoute("/_app/diet")({ component: DietPage });

type Eval = "boa" | "neutra" | "ruim";

interface Meal {
  id: string;
  description: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  evaluation: Eval;
  datetime: string;
}

function DietPage() {
  const { user } = useAuth();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [desc, setDesc] = useState("");
  const [cal, setCal] = useState("");
  const [evalSel, setEvalSel] = useState<Eval>("neutra");
  const [sabotage, setSabotage] = useState(false);
  const [calGoal, setCalGoal] = useState(2000);
  const [editingGoal, setEditingGoal] = useState(false);
  const [newGoal, setNewGoal] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const channelRef = useRef<any>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const today = new Date().toISOString().slice(0, 10);
    const [{ data: mealsData }, { data: prof }] = await Promise.all([
      supabase.from("eating_logs").select("*").eq("user_id", user.id).gte("datetime", today).order("datetime", { ascending: false }),
      supabase.from("profiles").select("daily_calorie_goal").eq("id", user.id).single(),
    ]);
    setMeals((mealsData ?? []) as Meal[]);
    if (prof?.daily_calorie_goal) setCalGoal(prof.daily_calorie_goal);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const today = new Date().toISOString().slice(0, 10);
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    channelRef.current = supabase
      .channel(`diet_logs_${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "eating_logs", filter: `user_id=eq.${user.id}` }, (payload) => {
        const m = payload.new as Meal;
        if (m.datetime?.slice(0, 10) === today)
          setMeals((prev) => prev.find((x) => x.id === m.id) ? prev : [m, ...prev]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "eating_logs", filter: `user_id=eq.${user.id}` }, (payload) => {
        setMeals((prev) => prev.map((x) => x.id === payload.new.id ? payload.new as Meal : x));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "eating_logs", filter: `user_id=eq.${user.id}` }, (payload) => {
        setMeals((prev) => prev.filter((x) => x.id !== payload.old.id));
      })
      .subscribe();
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, [user]);

  async function add() {
    if (!desc || adding) return;
    setAdding(true);
    const kcal = parseInt(cal) || 0;
    const tempId = `temp_${Date.now()}`;
    const tempMeal: Meal = { id: tempId, description: desc, calories: kcal, evaluation: evalSel, datetime: new Date().toISOString(), protein_g: 0, carbs_g: 0, fat_g: 0 };
    setMeals((prev) => [tempMeal, ...prev]);
    setDesc(""); setCal(""); setEvalSel("neutra");
    const { data, error } = await supabase.from("eating_logs").insert({
      user_id: user!.id, description: tempMeal.description, calories: kcal,
      meal_type: "refeição", evaluation: evalSel,
    } as any).select().single();
    if (error) {
      toast.error(error.message);
      setMeals((prev) => prev.filter((m) => m.id !== tempId));
    } else {
      setMeals((prev) => prev.map((m) => m.id === tempId ? data as Meal : m));
      if (evalSel === "ruim") setSabotage(true);
    }
    setAdding(false);
  }

  async function deleteMeal(id: string, calories: number) {
    setMeals((prev) => prev.filter((m) => m.id !== id));
    const { error } = await supabase.from("eating_logs").delete().eq("id", id);
    if (error) { toast.error("Erro ao remover"); load(); return; }
    toast.success(`-${calories} kcal removidas`);
  }

  async function saveMealEdit(meal: Meal) {
    const { error } = await supabase.from("eating_logs").update({
      description: meal.description,
      calories: meal.calories,
      protein_g: meal.protein_g,
      carbs_g: meal.carbs_g,
      fat_g: meal.fat_g,
      evaluation: meal.evaluation,
    }).eq("id", meal.id);
    if (error) { toast.error("Erro ao salvar"); return; }
    setMeals((prev) => prev.map((m) => m.id === meal.id ? meal : m));
    setEditingMeal(null);
    toast.success("Refeição atualizada!");
  }

  async function saveGoal() {
    const val = parseInt(newGoal);
    if (!val || val < 500 || val > 10000) return toast.error("Meta inválida (500–10000 kcal)");
    const { error } = await supabase.from("profiles").update({
      daily_calorie_goal: val,
      daily_protein_goal: Math.round((val * 0.30) / 4),
      daily_carbs_goal: Math.round((val * 0.45) / 4),
      daily_fat_goal: Math.round((val * 0.25) / 9),
    }).eq("id", user!.id);
    if (error) return toast.error(error.message);
    setCalGoal(val);
    setEditingGoal(false);
    toast.success("Meta atualizada!");
  }

  const consumed = meals.reduce((a, m) => a + (m.calories || 0), 0);

  return (
    <div className="px-5 pt-10 pb-32">
      <h1 className="text-3xl">Dieta</h1>
      <p className="mt-1 text-sm text-muted-foreground">Registre suas refeições do dia.</p>

      {/* Meta calórica */}
      <div className="mt-4 flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 shadow-soft">
        <div>
          <p className="text-xs text-muted-foreground">Meta diária</p>
          {editingGoal ? (
            <input autoFocus inputMode="numeric" value={newGoal} onChange={(e) => setNewGoal(e.target.value)}
              placeholder={String(calGoal)} className="mt-0.5 w-28 rounded-lg border border-input bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-ring" />
          ) : (
            <p className="text-lg font-semibold">{calGoal} <span className="text-xs font-normal text-muted-foreground">kcal</span></p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground">{consumed} consumidas</p>
          {editingGoal ? (
            <button onClick={saveGoal} className="grid size-8 place-items-center rounded-full bg-gradient-sunrise text-primary-foreground"><Check className="size-4" /></button>
          ) : (
            <button onClick={() => { setEditingGoal(true); setNewGoal(String(calGoal)); }} className="grid size-8 place-items-center rounded-full bg-muted text-muted-foreground"><Pencil className="size-4" /></button>
          )}
        </div>
      </div>

      {/* Formulário */}
      <div className="mt-4 rounded-3xl border border-border bg-card p-4 shadow-soft">
        <input value={desc} onChange={(e) => setDesc(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="O que você comeu?"
          className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
        <div className="mt-2 flex gap-2">
          <input value={cal} onChange={(e) => setCal(e.target.value)} placeholder="kcal" inputMode="numeric"
            className="w-24 rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none" />
          <div className="flex flex-1 gap-1 rounded-xl bg-muted p-1 text-xs">
            <EvalBtn active={evalSel === "boa"} onClick={() => setEvalSel("boa")} icon={<ThumbsUp className="size-3.5" />} label="Boa" />
            <EvalBtn active={evalSel === "neutra"} onClick={() => setEvalSel("neutra")} icon={<Minus className="size-3.5" />} label="Ok" />
            <EvalBtn active={evalSel === "ruim"} onClick={() => setEvalSel("ruim")} icon={<ThumbsDown className="size-3.5" />} label="Ruim" />
          </div>
        </div>
        <button onClick={add} disabled={adding || !desc}
          className="mt-2 w-full rounded-xl bg-gradient-sunrise px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-warm disabled:opacity-60">
          <Plus className="mr-1 inline size-4" />{adding ? "Adicionando…" : "Adicionar"}
        </button>
      </div>

      {/* Lista */}
      <div className="mt-6 space-y-2">
        {meals.length === 0 && <p className="text-center text-sm text-muted-foreground">Sem refeições hoje.</p>}
        {meals.map((m) => (
          <MealItem key={m.id} meal={m} onDelete={deleteMeal} onEdit={() => setEditingMeal({ ...m })} />
        ))}
      </div>

      {/* Modal edição de refeição */}
      {editingMeal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-t-3xl bg-card p-5 shadow-elev">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">Editar refeição</h3>
              <button onClick={() => setEditingMeal(null)}><X className="size-5 text-muted-foreground" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Descrição</label>
                <input value={editingMeal.description}
                  onChange={(e) => setEditingMeal({ ...editingMeal, description: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Calorias (kcal)</label>
                  <input type="number" value={editingMeal.calories}
                    onChange={(e) => setEditingMeal({ ...editingMeal, calories: parseInt(e.target.value) || 0 })}
                    className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Proteínas (g)</label>
                  <input type="number" value={editingMeal.protein_g}
                    onChange={(e) => setEditingMeal({ ...editingMeal, protein_g: parseFloat(e.target.value) || 0 })}
                    className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Carboidratos (g)</label>
                  <input type="number" value={editingMeal.carbs_g}
                    onChange={(e) => setEditingMeal({ ...editingMeal, carbs_g: parseFloat(e.target.value) || 0 })}
                    className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Gorduras (g)</label>
                  <input type="number" value={editingMeal.fat_g}
                    onChange={(e) => setEditingMeal({ ...editingMeal, fat_g: parseFloat(e.target.value) || 0 })}
                    className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>
              <div className="flex gap-1 rounded-xl bg-muted p-1 text-xs">
                <EvalBtn active={editingMeal.evaluation === "boa"} onClick={() => setEditingMeal({ ...editingMeal, evaluation: "boa" })} icon={<ThumbsUp className="size-3.5" />} label="Boa" />
                <EvalBtn active={editingMeal.evaluation === "neutra"} onClick={() => setEditingMeal({ ...editingMeal, evaluation: "neutra" })} icon={<Minus className="size-3.5" />} label="Ok" />
                <EvalBtn active={editingMeal.evaluation === "ruim"} onClick={() => setEditingMeal({ ...editingMeal, evaluation: "ruim" })} icon={<ThumbsDown className="size-3.5" />} label="Ruim" />
              </div>
            </div>
            <button onClick={() => saveMealEdit(editingMeal)}
              className="mt-4 w-full rounded-xl bg-gradient-sunrise py-3 text-sm font-medium text-primary-foreground shadow-warm">
              <Check className="mr-1 inline size-4" /> Salvar alterações
            </button>
          </div>
        </div>
      )}

      <SabotageModal open={sabotage} trigger="bad_meal" onClose={() => setSabotage(false)} />
    </div>
  );
}

function MealItem({ meal, onDelete, onEdit }: { meal: Meal; onDelete: (id: string, cal: number) => void; onEdit: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const time = new Date(meal.datetime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const isTemp = meal.id?.toString().startsWith("temp_");

  return (
    <div className={`flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-soft transition-opacity ${isTemp ? "opacity-60" : "opacity-100"}`}>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{meal.description}</div>
        <div className="text-xs text-muted-foreground">{time} · {meal.evaluation}</div>
        {(meal.protein_g > 0 || meal.carbs_g > 0 || meal.fat_g > 0) && (
          <div className="mt-1 flex gap-2 text-[10px] text-muted-foreground">
            <span><b className="text-destructive">{Math.round(Number(meal.protein_g || 0))}g</b> P</span>
            <span><b className="text-primary">{Math.round(Number(meal.carbs_g || 0))}g</b> C</span>
            <span><b className="text-[oklch(0.6_0.15_230)]">{Math.round(Number(meal.fat_g || 0))}g</b> G</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-1 pl-2">
        <div className="text-sm font-semibold">{meal.calories} <span className="text-xs text-muted-foreground">kcal</span></div>
        {!isTemp && (
          <>
            <button onClick={onEdit} className="grid size-7 place-items-center rounded-full text-muted-foreground">
              <Pencil className="size-3.5" />
            </button>
            {confirming ? (
              <div className="flex gap-1">
                <button onClick={() => onDelete(meal.id, meal.calories)} className="rounded-lg bg-destructive px-2 py-1 text-[10px] font-medium text-white">Sim</button>
                <button onClick={() => setConfirming(false)} className="rounded-lg bg-muted px-2 py-1 text-[10px] text-muted-foreground">Não</button>
              </div>
            ) : (
              <button onClick={() => setConfirming(true)} className="grid size-7 place-items-center rounded-full text-muted-foreground">
                <Trash2 className="size-3.5" />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function EvalBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} className={`flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 transition ${active ? "bg-card shadow-soft text-foreground" : "text-muted-foreground"}`}>
      {icon} {label}
    </button>
  );
}
