import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { motion } from "framer-motion";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      // Check onboarding
      supabase.from("profiles").select("onboarding_completed").eq("id", user.id).single().then(({ data }) => {
        if (data?.onboarding_completed) window.location.href = "/home";
        else window.location.href = "/onboarding/profile";
      });
    }
  }, [user, loading]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { name }, emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e: any) {
      toast.error(e.message ?? "Erro");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-soft relative overflow-hidden">
      <div className="glow-warm absolute inset-0" />
      <div className="relative mx-auto max-w-md px-6 pt-16 pb-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="mb-12 text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/80 px-4 py-1.5 text-xs backdrop-blur">
              <span className="size-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-muted-foreground">Coach pessoal com IA</span>
            </div>
            <h1 className="text-5xl leading-[1.05]">
              Sua versão <span className="text-gradient-sunrise italic">mais forte</span><br />começa agora.
            </h1>
            <p className="mt-4 text-muted-foreground">
              Treino, dieta e ciclo adaptados ao seu corpo. Sem genérico, sem julgamento.
            </p>
          </div>

          <form onSubmit={submit} className="space-y-3 rounded-3xl border border-border/60 bg-card p-6 shadow-soft">
            <div className="mb-2 flex gap-2 rounded-full bg-muted p-1 text-sm">
              <button type="button" onClick={() => setMode("signup")} className={`flex-1 rounded-full py-2 transition ${mode === "signup" ? "bg-card shadow-soft" : "text-muted-foreground"}`}>Criar conta</button>
              <button type="button" onClick={() => setMode("signin")} className={`flex-1 rounded-full py-2 transition ${mode === "signin" ? "bg-card shadow-soft" : "text-muted-foreground"}`}>Entrar</button>
            </div>
            {mode === "signup" && (
              <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" className="w-full rounded-2xl border border-input bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring" />
            )}
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" className="w-full rounded-2xl border border-input bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring" />
            <input required type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="senha (mín. 6)" className="w-full rounded-2xl border border-input bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring" />
            <button disabled={busy} className="mt-2 w-full rounded-2xl bg-gradient-sunrise px-4 py-3.5 font-medium text-primary-foreground shadow-warm transition hover:opacity-95 disabled:opacity-60">
              {busy ? "Aguarde…" : mode === "signup" ? "Começar" : "Entrar"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Ao criar uma conta você aceita os termos do Nutri AI.
          </p>
        </motion.div>
      </div>
    </main>
  );
}
