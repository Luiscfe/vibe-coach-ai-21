import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
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
  // Controla se o redirect deve acontecer
  // Só redireciona se o usuário JÁ estava logado ao abrir a página
  // ou se acabou de fazer login/cadastro manualmente
  const shouldRedirect = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    if (!shouldRedirect.current) {
      // Usuário tem sessão em cache — verifica se onboarding está completo
      // mas só redireciona se a sessão for antiga (não acabou de criar)
      supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (!shouldRedirect.current) return; // Abortado por logout/troca
          if (data?.onboarding_completed) {
            window.location.href = "/home";
          } else {
            window.location.href = "/onboarding/profile";
          }
        });
    }
  }, [user, loading]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error, data } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;

        // Verifica se precisa confirmar email
        if (data.user && !data.session) {
          toast.success("Verifique seu email para confirmar o cadastro!");
          setBusy(false);
          return;
        }

        // Sessão criada — redireciona manualmente
        shouldRedirect.current = true;
        window.location.href = "/onboarding/profile";
        return;
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        // Login bem-sucedido — verifica onboarding e redireciona
        shouldRedirect.current = true;
        const { data: prof } = await supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("id", (await supabase.auth.getUser()).data.user!.id)
          .single();

        if (prof?.onboarding_completed) {
          window.location.href = "/home";
        } else {
          window.location.href = "/onboarding/profile";
        }
        return;
      }
    } catch (e: any) {
      toast.error(e.message ?? "Erro");
      setBusy(false);
    }
  }

  // Mostra tela de loading enquanto verifica sessão
  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center" style={{ background: "#fff7ed" }}>
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </main>
    );
  }

  // Se já tem usuário logado com sessão válida, mostra loading enquanto redireciona
  if (user && !shouldRedirect.current) {
    shouldRedirect.current = true;
    supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.onboarding_completed) {
          window.location.href = "/home";
        } else {
          window.location.href = "/onboarding/profile";
        }
      });
    return (
      <main className="flex min-h-screen items-center justify-center" style={{ background: "#fff7ed" }}>
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </main>
    );
  }

  return (
    <main className="min-h-screen" style={{ background: "#fff7ed" }}>
      <div className="mx-auto max-w-md px-6 pt-20 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="mb-12 text-center">
            <span style={{
              fontFamily: "'Nunito', sans-serif",
              fontWeight: 700,
              fontSize: "2.8rem",
              letterSpacing: "-1px",
              color: "#1a1a1a",
              display: "block",
              textAlign: "center",
              fontStyle: "normal",
              lineHeight: 1,
            }}>
              FITT AI
            </span>
          </h1>
          <link
            href="https://fonts.googleapis.com/css2?family=Nunito:wght@700&display=swap"
            rel="stylesheet"
          />

          <form onSubmit={submit} className="space-y-3 rounded-3xl border border-border/60 bg-card p-6 shadow-soft">
            {/* Toggle login/cadastro */}
            <div className="mb-2 flex gap-2 rounded-full bg-muted p-1 text-sm">
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={`flex-1 rounded-full py-2 transition ${mode === "signup" ? "bg-card shadow-soft" : "text-muted-foreground"}`}
              >
                Criar conta
              </button>
              <button
                type="button"
                onClick={() => setMode("signin")}
                className={`flex-1 rounded-full py-2 transition ${mode === "signin" ? "bg-card shadow-soft" : "text-muted-foreground"}`}
              >
                Entrar
              </button>
            </div>

            {mode === "signup" && (
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                className="w-full rounded-2xl border border-input bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring"
              />
            )}

            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
              className="w-full rounded-2xl border border-input bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring"
            />

            <input
              required
              type="password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="senha (mín. 6 caracteres)"
              className="w-full rounded-2xl border border-input bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring"
            />

            <button
              disabled={busy}
              className="mt-2 w-full rounded-2xl bg-gradient-sunrise px-4 py-3.5 font-medium text-primary-foreground shadow-warm transition hover:opacity-95 disabled:opacity-60"
            >
              {busy ? "Aguarde…" : mode === "signup" ? "Começar" : "Entrar"}
            </button>
          </form>
        </motion.div>
      </div>
    </main>
  );
}
