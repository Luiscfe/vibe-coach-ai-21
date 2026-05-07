import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Plus, ThumbsUp, ThumbsDown, Minus } from "lucide-react";
import { toast } from "sonner";
import { SabotageModal } from "@/components/SabotageModal";

export const Route = createFileRoute("/_app/diet")({ component: DietPage });

type Eval = "boa" | "neutra" | "ruim";

function DietPage() {
  const { user } = useAuth();
  const [meals, setMeals] = useState<any[]>([]);
  const [desc, setDesc] = useState("");
  const [cal, setCal] = useState("");
  const [evalSel, setEvalSel] = useState<Eval>("neutra");
  const [sabotage, setSabotage] = useState(false);

  async function load() {
    if (!user) return;
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase.from("eating_logs").select("*").eq("user_id", user.id).gte("datetime", today).order("datetime", { ascending: false });
    setMeals(data ?? []);
  }
  useEffect(() => { load(); }, [user]);

  async function add() {
    if (!desc) return;
    const { error } = await supabase.from("eating_logs").insert({
      user_id: user!.id, description: desc, calories: parseInt(cal) || 0, meal_type: "refeição", evaluation: evalSel,
    } as any);
    if (error) return toast.error(error.message);
    if (evalSel === "ruim") setSabotage(true);
    setDesc(""); setCal(""); setEvalSel("neutra"); load();
  }

  return (
    <div className="px-5 pt-10">
      <h1 className="text-3xl">Dieta</h1>
      <p className="mt-1 text-sm text-muted-foreground">Registre suas refeições do dia.</p>

      <div className="mt-6 rounded-3xl border border-border bg-card p-4 shadow-soft">
        <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="O que você comeu?" className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
        <div className="mt-2 flex gap-2">
          <input value={cal} onChange={(e) => setCal(e.target.value)} placeholder="kcal" inputMode="numeric" className="w-24 rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none" />
          <div className="flex flex-1 gap-1 rounded-xl bg-muted p-1 text-xs">
            <EvalBtn active={evalSel === "boa"} onClick={() => setEvalSel("boa")} icon={<ThumbsUp className="size-3.5" />} label="Boa" />
            <EvalBtn active={evalSel === "neutra"} onClick={() => setEvalSel("neutra")} icon={<Minus className="size-3.5" />} label="Ok" />
            <EvalBtn active={evalSel === "ruim"} onClick={() => setEvalSel("ruim")} icon={<ThumbsDown className="size-3.5" />} label="Ruim" />
          </div>
        </div>
        <button onClick={add} className="mt-2 w-full rounded-xl bg-gradient-sunrise px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-warm"><Plus className="mr-1 inline size-4" />Adicionar</button>
      </div>

      <div className="mt-6 space-y-2">
        {meals.length === 0 && <p className="text-center text-sm text-muted-foreground">Sem refeições hoje.</p>}
        {meals.map((m) => (
          <div key={m.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-soft">
            <div>
              <div className="font-medium">{m.description}</div>
              <div className="text-xs text-muted-foreground">{new Date(m.datetime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · {m.evaluation}</div>
            </div>
            <div className="text-sm font-semibold">{m.calories} <span className="text-xs text-muted-foreground">kcal</span></div>
          </div>
        ))}
      </div>

      <SabotageModal open={sabotage} trigger="bad_meal" onClose={() => setSabotage(false)} />
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
