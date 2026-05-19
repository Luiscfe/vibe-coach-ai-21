import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Step, Label, Pill } from "./onboarding.profile";
import { Sparkles } from "lucide-react";

const restrictions = [
  "sem glúten", "vegetariano", "vegano", "sem lactose", "alergia a frutos do mar", "low carb",
];

export const Route = createFileRoute("/onboarding/physical")({
  component: PhysicalStep,
});
function calcCalories(
  weight: number,
  height: number,
  age: number,
  goal: string,
  targetWeight: number | null,
  gender: string
): { calories: number; weeklyChange: number; weeksToGoal: number | null } {
  const bmr = gender === "feminino"
    ? 10 * weight + 6.25 * height - 5 * age - 161
    : 10 * weight + 6.25 * height - 5 * age + 5;

  const tdee = Math.round(bmr * 1.4);

  let calories = tdee;
  let deficit = 500;
  let weeksToGoal: number | null = null;

  if (goal === "emagrecer") {
    if (targetWeight && targetWeight < weight) {
      const diff = weight - targetWeight;
      // Déficit proporcional à meta
      if (diff <= 5) deficit = 300;
      else if (diff <= 15) deficit = 500;
      else if (diff <= 30) deficit = 700;
      else deficit = 1000;
    }
    calories = Math.max(1200, tdee - deficit);
    const weeklyKg = (tdee - calories) / 7700 * 7;
    const weeklyChange = -Math.round(weeklyKg * 10) / 10;
    if (targetWeight && targetWeight < weight) {
      weeksToGoal = Math.round((weight - targetWeight) / Math.abs(weeklyChange));
    }
    return { calories, weeklyChange, weeksToGoal };
  }

  if (goal === "ganhar_massa") {
    let surplus = 300;
    if (targetWeight && targetWeight > weight) {
      const diff = targetWeight - weight;
      if (diff <= 5) surplus = 200;
      else if (diff <= 15) surplus = 300;
      else surplus = 400;
    }
    calories = tdee + surplus;
    const weeklyChange = Math.round((surplus / 7700 * 7) * 10) / 10;
    if (targetWeight && targetWeight > weight) {
      weeksToGoal = Math.round((targetWeight - weight) / weeklyChange);
    }
    return { calories, weeklyChange, weeksToGoal };
  }

  return { calories: tdee, weeklyChange: 0, weeksToGoal: null };
}


function PhysicalStep() {
  const { user, loading } = useAuth();
  const nav = useNavigate();

  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [age, setAge] = useState("");
  const [targetWeight, setTargetWeight] = useState("");
  const [level, setLevel] = useState("iniciante");
  const [time, setTime] = useState("noite");
  const [diet, setDiet] = useState<string[]>([]);
  const [dislikes, setDislikes] = useState("");
  const [likes, setLikes] = useState("");
  const [customCal, setCustomCal] = useState("");
  const [suggestion, setSuggestion] = useState<{ calories: number; weeklyChange: number; weeksToGoal: number | null } | null>(null);
  const [goal, setGoal] = useState<string | null>(null);
  const [gender, setGender] = useState<string>("masculino");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!loading && !user) nav({ to: "/" }); }, [loading, user, nav]);

  // Busca objetivo e gênero do perfil
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("goal, gender").eq("id", user.id).single().then(({ data }) => {
      if (data?.goal) setGoal(data.goal);
      if (data?.gender) setGender(data.gender);
    });
  }, [user]);

  // Recalcula sugestão sempre que peso, altura, idade ou meta de peso mudam
  useEffect(() => {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    const a = parseInt(age);
    if (!w || !h || !a || !goal) return;

    const tw = targetWeight ? parseFloat(targetWeight) : null;
    const result = calcCalories(w, h, a, goal, tw, gender);
    setSuggestion(result);
    setCustomCal(String(result.calories));
  }, [weight, height, age, targetWeight, goal, gender]);

  function toggle(r: string) {
    setDiet((p) => p.includes(r) ? p.filter((x) => x !== r) : [...p, r]);
  }

  async function next() {
    if (!weight || !height || !age) return toast.error("Preencha peso, altura e idade");

    const w = parseFloat(weight);
    const h = parseFloat(height);
    const a = parseInt(age);
    const tw = targetWeight ? parseFloat(targetWeight) : null;

    // Validações de meta de peso
    if (tw && goal === "emagrecer" && tw >= w) {
      return toast.error("Seu peso alvo precisa ser menor que o peso atual para emagrecer");
    }
    if (tw && goal === "ganhar_massa" && tw <= w) {
      return toast.error("Seu peso alvo precisa ser maior que o peso atual para ganhar massa");
    }

    setBusy(true);

    const finalGoal = goal ?? "saude_geral";
    const result = calcCalories(w, h, a, finalGoal, tw, gender);
    const finalCal = parseInt(customCal) || result.calories;
    const protein = Math.round((finalCal * 0.30) / 4);
    const carbs = Math.round((finalCal * 0.45) / 4);
    const fat = Math.round((finalCal * 0.25) / 9);

    const birth = new Date();
    birth.setFullYear(birth.getFullYear() - a);

    const { error } = await supabase.from("profiles").update({
      weight: w,
      height: h,
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

  const showTargetWeight = goal === "emagrecer" || goal === "ganhar_massa";
  const allFilled = weight && height && age;

  return (
    <div>
      <Step n={2} total={5} />
      <h1 className="mt-6 text-3xl">Seu corpo.</h1>
      <p className="mt-2 text-muted-foreground">Para ajustar treino e calorias.</p>

      {/* Peso, altura, idade */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        <NumInput label="Peso (kg)" v={weight} on={setWeight} />
        <NumInput label="Altura (cm)" v={height} on={setHeight} />
        <NumInput label="Idade" v={age} on={setAge} />
      </div>

      {/* Meta de peso — aparece após preencher os dados básicos */}
      {showTargetWeight && allFilled && (
        <div className="mt-6">
          <Label>
            {goal === "emagrecer" ? "Quantos kg quer perder?" : "Qual o seu peso alvo?"}
          </Label>
          <p className="mt-1 text-xs text-muted-foreground">
            {goal === "emagrecer"
              ? "Vamos calcular um plano seguro e realista para você"
              : "Vamos calcular o superávit calórico ideal para ganho de massa"}
          </p>
          <div className="mt-2 flex items-center gap-3">
            <input
              inputMode="decimal"
              value={targetWeight}
              onChange={(e) => setTargetWeight(e.target.value)}
              placeholder={goal === "emagrecer" ? "Ex: 70" : "Ex: 85"}
              className="w-full rounded-2xl border border-input bg-card px-4 py-3 text-center text-lg outline-none focus:ring-2 focus:ring-ring"
            />
            <span className="shrink-0 text-sm text-muted-foreground">kg</span>
          </div>
        </div>
      )}

      {/* Card de sugestão calórica — aparece após ter dados suficientes */}
      {suggestion && allFilled && (
        <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <span className="text-sm font-semibold text-primary">Sugestão personalizada</span>
          </div>
          <div className="mt-3 text-center">
            <div className="text-4xl font-bold text-foreground">
              {suggestion.calories}
              <span className="ml-1 text-base font-normal text-muted-foreground">kcal/dia</span>
            </div>
            {suggestion.weeklyChange !== 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                {suggestion.weeklyChange > 0 ? "+" : ""}{suggestion.weeklyChange} kg por semana
              </p>
            )}
            {suggestion.weeksToGoal && (
              <p className="mt-1 text-xs font-medium text-primary">
                🎯 Meta em aprox. {suggestion.weeksToGoal} semanas
                {suggestion.weeksToGoal >= 52 && ` (${Math.round(suggestion.weeksToGoal / 4.3)} meses)`}
              </p>
            )}
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Você pode ajustar esse valor abaixo se preferir
          </p>
        </div>
      )}

      {/* Meta calórica editável */}
      {allFilled && (
        <div className="mt-4">
          <Label>Ajustar meta calórica (opcional)</Label>
          <input
            inputMode="numeric"
            value={customCal}
            onChange={(e) => setCustomCal(e.target.value)}
            placeholder="Ex: 1800"
            className="mt-2 w-full rounded-2xl border border-input bg-card px-4 py-3 text-center text-lg outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      )}

      {/* Experiência */}
      <div className="mt-6">
        <Label>Experiência</Label>
        <div className="mt-2 flex gap-2">
          {["iniciante", "intermediario", "avancado"].map((l) => (
            <Pill key={l} active={level === l} onClick={() => setLevel(l)}>{l}</Pill>
          ))}
        </div>
      </div>

      {/* Treino preferido */}
      <div className="mt-6">
        <Label>Treino preferido</Label>
        <div className="mt-2 flex gap-2">
          {["manha", "tarde", "noite"].map((t) => (
            <Pill key={t} active={time === t} onClick={() => setTime(t)}>{t}</Pill>
          ))}
        </div>
      </div>

      {/* Restrições */}
      <div className="mt-6">
        <Label>Restrições alimentares</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {restrictions.map((r) => (
            <Pill key={r} active={diet.includes(r)} onClick={() => toggle(r)}>{r}</Pill>
          ))}
        </div>
      </div>

      {/* O que não gosta */}
      <div className="mt-6">
        <Label>O que você NÃO gosta de comer?</Label>
        <textarea value={dislikes} onChange={(e) => setDislikes(e.target.value)} rows={2}
          className="mt-2 w-full rounded-2xl border border-input bg-card px-4 py-3 outline-none focus:ring-2 focus:ring-ring"
          placeholder="Ex: frango, brócolis…" />
      </div>

      {/* O que adora */}
      <div className="mt-6">
        <Label>O que você ADORA comer?</Label>
        <textarea value={likes} onChange={(e) => setLikes(e.target.value)} rows={2}
          className="mt-2 w-full rounded-2xl border border-input bg-card px-4 py-3 outline-none focus:ring-2 focus:ring-ring"
          placeholder="Ex: açaí, pasta de amendoim…" />
      </div>

      <button disabled={busy} onClick={next}
        className="my-10 w-full rounded-2xl bg-gradient-sunrise px-4 py-3.5 font-medium text-primary-foreground shadow-warm disabled:opacity-60">
        Continuar
      </button>
    </div>
  );
}

function NumInput({ label, v, on }: { label: string; v: string; on: (s: string) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <input inputMode="decimal" value={v} onChange={(e) => on(e.target.value)}
        className="mt-2 w-full rounded-2xl border border-input bg-card px-3 py-3 text-center text-lg outline-none focus:ring-2 focus:ring-ring" />
    </div>
  );
}
