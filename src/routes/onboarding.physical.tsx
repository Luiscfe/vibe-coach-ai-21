import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Step, Label, Pill } from "./onboarding.profile";

const restrictions = [
  "sem glúten", "vegetariano", "vegano", "sem lactose", "alergia a frutos do mar", "low carb",
];

export const Route = createFileRoute("/onboarding/physical")({
  component: PhysicalStep,
});

function calcCalories(weight: number, height: number, age: number, goal: string): number {
  // Fórmula de Mifflin-St Jeor (base)
  const bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  const tdee = bmr * 1.4; // fator de atividade moderada
  if (goal === "emagrecer") return Math.round(tdee - 500);
  if (goal === "ganhar_massa") return Math.round(tdee + 300);
  return Math.round(tdee);
}

function PhysicalStep() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [age, setAge] = useState("");
  const [level, setLevel] = useState("iniciante");
  const [time, setTime] = useState("noite");
  const [diet, setDiet] = useState<string[]>([]);
  const [dislikes, setDislikes] = useState("");
  const [likes, setLikes] = useState("");
  const [customCal, setCustomCal] = useState("");
  const [suggestedCal, setSuggestedCal] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!loading && !user) nav({ to: "/" }); }, [loading, user, nav]);

  // Busca o objetivo do perfil para calcular calorias sugeridas
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("goal").eq("id", user.id).single().then(({ data }) => {
      if (data?.goal && weight && height && age) {
        const cal = calcCalories(parseFloat(weight), parseFloat(height), parseInt(age), data.goal);
        setSuggestedCal(cal);
        if (!customCal) setCustomCal(String(cal));
      }
    });
  }, [weight, height, age]);

  function toggle(r: string) { setDiet((p) => p.includes(r) ? p.filter((x) => x !== r) : [...p, r]); }

  async function next() {
    if (!weight || !height || !age) return toast.error("Preencha peso, altura e idade");
    setBusy(true);

    const { data: prof } = await supabase.from("profiles").select("goal").eq("id", user!.id).single();
    const goal = prof?.goal ?? "saude_geral";
    const finalCal = parseInt(customCal) || calcCalories(parseFloat(weight), parseFloat(height), parseInt(age), goal);
    const protein = Math.round((finalCal * 0.30) / 4);
    const carbs = Math.round((finalCal * 0.45) / 4);
    const fat = Math.round((finalCal * 0.25) / 9);

    const birth = new Date(); birth.setFullYear(birth.getFullYear() - parseInt(age));
    const { error } = await supabase.from("profiles").update({
      weight: parseFloat(weight),
      height: parseFloat(height),
      birth_date: birth.toISOString().slice(0, 10),
      experience_level: level as any,
      preferred_workout_time: time as any,
      dietary_restrictions: diet,
      food_dislikes: dislikes,
      food_preferences: likes,
      daily_calorie_goal: finalCal,
      daily_protein_goal: protein,
      daily_carbs_goal: carbs,
      daily_fat_goal: fat,
    }).eq("id", user!.id);

    setBusy(false);
    if (error) return toast.error(error.message);
    nav({ to: "/onboarding/anchor" });
  }

  return (
    <div>
      <Step n={2} total={5} />
      <h1 className="mt-6 text-3xl">Seu corpo.</h1>
      <p className="mt-2 text-muted-foreground">Para ajustar treino e calorias.</p>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <NumInput label="Peso (kg)" v={weight} on={setWeight} />
        <NumInput label="Altura (cm)" v={height} on={setHeight} />
        <NumInput label="Idade" v={age} on={setAge} />
      </div>

      <div className="mt-6">
        <Label>Meta calórica diária (kcal)</Label>
        {suggestedCal && (
          <p className="mt-1 text-xs text-muted-foreground">
            Sugerido para seu objetivo: <span className="font-semibold text-primary">{suggestedCal} kcal</span>
          </p>
        )}
        <input
          inputMode="numeric"
          value={customCal}
          onChange={(e) => setCustomCal(e.target.value)}
          placeholder="Ex: 1800"
          className="mt-2 w-full rounded-2xl border border-input bg-card px-4 py-3 text-center text-lg outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="mt-6">
        <Label>Experiência</Label>
        <div className="mt-2 flex gap-2">
          {["iniciante", "intermediario", "avancado"].map((l) => (
            <Pill key={l} active={level === l} onClick={() => setLevel(l)}>{l}</Pill>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <Label>Treino preferido</Label>
        <div className="mt-2 flex gap-2">
          {["manha", "tarde", "noite"].map((t) => (
            <Pill key={t} active={time === t} onClick={() => setTime(t)}>{t}</Pill>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <Label>Restrições</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {restrictions.map((r) => <Pill key={r} active={diet.includes(r)} onClick={() => toggle(r)}>{r}</Pill>)}
        </div>
      </div>

      <div className="mt-6">
        <Label>O que você NÃO gosta de comer?</Label>
        <textarea value={dislikes} onChange={(e) => setDislikes(e.target.value)} rows={2} className="mt-2 w-full rounded-2xl border border-input bg-card px-4 py-3 outline-none focus:ring-2 focus:ring-ring" placeholder="Ex: frango, brócolis…" />
      </div>

      <div className="mt-6">
        <Label>O que você ADORA?</Label>
        <textarea value={likes} onChange={(e) => setLikes(e.target.value)} rows={2} className="mt-2 w-full rounded-2xl border border-input bg-card px-4 py-3 outline-none focus:ring-2 focus:ring-ring" placeholder="Ex: açaí, pasta de amendoim…" />
      </div>

      <button disabled={busy} onClick={next} className="my-10 w-full rounded-2xl bg-gradient-sunrise px-4 py-3.5 font-medium text-primary-foreground shadow-warm disabled:opacity-60">Continuar</button>
    </div>
  );
}

function NumInput({ label, v, on }: { label: string; v: string; on: (s: string) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <input inputMode="decimal" value={v} onChange={(e) => on(e.target.value)} className="mt-2 w-full rounded-2xl border border-input bg-card px-3 py-3 text-center text-lg outline-none focus:ring-2 focus:ring-ring" />
    </div>
  );
}
