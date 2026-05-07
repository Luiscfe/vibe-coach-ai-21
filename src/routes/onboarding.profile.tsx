import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const goals = [
  { v: "emagrecer", label: "Emagrecer", emoji: "🔥" },
  { v: "ganhar_massa", label: "Ganhar massa", emoji: "💪" },
  { v: "definir", label: "Definir", emoji: "✨" },
  { v: "saude_geral", label: "Saúde geral", emoji: "🌱" },
];

const genders = [
  { v: "feminino", label: "Feminino" },
  { v: "masculino", label: "Masculino" },
  { v: "outro", label: "Outro" },
];

export const Route = createFileRoute("/onboarding/profile")({
  component: ProfileStep,
});

function ProfileStep() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [gender, setGender] = useState<string>("");
  const [goal, setGoal] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!loading && !user) nav({ to: "/" }); }, [loading, user, nav]);

  async function next() {
    if (!gender || !goal) return toast.error("Selecione todas as opções");
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ gender: gender as any, goal: goal as any }).eq("id", user!.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    nav({ to: "/onboarding/physical" });
  }

  return (
    <div>
      <Step n={1} total={5} />
      <h1 className="mt-6 text-3xl">Vamos começar.</h1>
      <p className="mt-2 text-muted-foreground">Conta um pouco sobre você.</p>

      <div className="mt-8">
        <Label>Gênero</Label>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {genders.map((g) => (
            <Pill key={g.v} active={gender === g.v} onClick={() => setGender(g.v)}>{g.label}</Pill>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <Label>Seu objetivo principal</Label>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {goals.map((g) => (
            <button key={g.v} onClick={() => setGoal(g.v)} className={`rounded-2xl border p-4 text-left transition ${goal === g.v ? "border-primary bg-accent" : "border-border bg-card"}`}>
              <div className="text-2xl">{g.emoji}</div>
              <div className="mt-1 font-medium">{g.label}</div>
            </button>
          ))}
        </div>
      </div>

      <button disabled={busy} onClick={next} className="mt-10 w-full rounded-2xl bg-gradient-sunrise px-4 py-3.5 font-medium text-primary-foreground shadow-warm disabled:opacity-60">
        Continuar
      </button>
    </div>
  );
}

export function Step({ n, total }: { n: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`h-1 flex-1 rounded-full ${i < n ? "bg-primary" : "bg-muted"}`} />
      ))}
    </div>
  );
}
export function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-xs uppercase tracking-wider text-muted-foreground">{children}</div>;
}
export function Pill({ active, children, ...rest }: any) {
  return (
    <button {...rest} className={`rounded-full border px-3 py-2 text-sm transition ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>{children}</button>
  );
}
