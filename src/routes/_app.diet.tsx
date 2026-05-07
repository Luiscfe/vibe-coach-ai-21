import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/diet")({ component: DietPage });

function DietPage() {
  const { user } = useAuth();
  const [meals, setMeals] = useState<any[]>([]);
  const [desc, setDesc] = useState("");
  const [cal, setCal] = useState("");

  async function load() {
    if (!user) return;
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase.from("eating_logs").select("*").eq("user_id", user.id).gte("datetime", today).order("datetime", { ascending: false });
    setMeals(data ?? []);
  }
  useEffect(() => { load(); }, [user]);

  async function add() {
    if (!desc) return;
    const { error } = await supabase.from("eating_logs").insert({ user_id: user!.id, description: desc, calories: parseInt(cal) || 0, meal_type: "refeição" });
    if (error) return toast.error(error.message);
    setDesc(""); setCal(""); load();
  }

  return (
    <div className="px-5 pt-10">
      <h1 className="text-3xl">Dieta</h1>
      <p className="mt-1 text-sm text-muted-foreground">Registre suas refeições do dia.</p>

      <div className="mt-6 rounded-3xl border border-border bg-card p-4 shadow-soft">
        <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="O que você comeu?" className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
        <div className="mt-2 flex gap-2">
          <input value={cal} onChange={(e) => setCal(e.target.value)} placeholder="kcal" inputMode="numeric" className="w-24 rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none" />
          <button onClick={add} className="flex-1 rounded-xl bg-gradient-sunrise px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-warm"><Plus className="mr-1 inline size-4" />Adicionar</button>
        </div>
      </div>

      <div className="mt-6 space-y-2">
        {meals.length === 0 && <p className="text-center text-sm text-muted-foreground">Sem refeições hoje.</p>}
        {meals.map((m) => (
          <div key={m.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-soft">
            <div>
              <div className="font-medium">{m.description}</div>
              <div className="text-xs text-muted-foreground">{new Date(m.datetime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>
            </div>
            <div className="text-sm font-semibold">{m.calories} <span className="text-xs text-muted-foreground">kcal</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}
