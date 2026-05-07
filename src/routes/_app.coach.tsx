import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import { Send, ArrowLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/coach")({
  component: CoachPage,
});

const quick = [
  "Como está meu progresso?",
  "Preciso de motivação",
  "Sugere um lanche agora",
  "Adapta meu treino de hoje",
];

function CoachPage() {
  const { user, session } = useAuth();
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("chat_messages").select("role,content").eq("user_id", user.id).order("created_at", { ascending: true }).limit(50).then(({ data }) => {
      setMessages((data ?? []) as any);
    });
  }, [user]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [messages]);

  async function send(text?: string) {
    const t = (text ?? input).trim();
    if (!t || busy) return;
    setInput("");
    setBusy(true);
    const newMsgs = [...messages, { role: "user" as const, content: t }];
    setMessages([...newMsgs, { role: "assistant", content: "" }]);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/coach-chat`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        body: JSON.stringify({ messages: newMsgs, userMessage: t }),
      });
      if (!resp.ok || !resp.body) {
        const e = await resp.json().catch(() => ({}));
        throw new Error(e.error || "Erro");
      }
      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      let buf = ""; let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf("\n")) !== -1) {
          const line = buf.slice(0, i); buf = buf.slice(i + 1);
          if (!line.startsWith("data: ")) continue;
          const j = line.slice(6).trim();
          if (j === "[DONE]") continue;
          try { const p = JSON.parse(j); const c = p.choices?.[0]?.delta?.content; if (c) { acc += c; setMessages((prev) => { const cp = [...prev]; cp[cp.length - 1] = { role: "assistant", content: acc }; return cp; }); } } catch {}
        }
      }
    } catch (e: any) { toast.error(e.message); setMessages((p) => p.slice(0, -1)); } finally { setBusy(false); }
  }

  return (
    <div className="flex h-[100dvh] flex-col">
      <header className="flex items-center gap-3 border-b border-border bg-card/80 px-4 py-3 backdrop-blur">
        <Link to="/home"><ArrowLeft className="size-5" /></Link>
        <div>
          <div className="font-medium">Sua coach</div>
          <div className="text-xs text-muted-foreground">Online • lembra de tudo</div>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="rounded-2xl bg-card p-4 text-sm text-muted-foreground shadow-soft">Oi! Me conta como você tá. Pode falar de treino, comida, ciclo, cansaço — qualquer coisa.</div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${m.role === "user" ? "bg-gradient-sunrise text-primary-foreground" : "bg-card shadow-soft"}`}>
              <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-border bg-card/80 px-4 py-3 backdrop-blur safe-bottom">
        <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
          {quick.map((q) => <button key={q} onClick={() => send(q)} className="shrink-0 rounded-full border border-border bg-background px-3 py-1.5 text-xs">{q}</button>)}
        </div>
        <div className="flex items-center gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Mensagem…" className="flex-1 rounded-full border border-input bg-background px-4 py-2.5 outline-none focus:ring-2 focus:ring-ring" />
          <button onClick={() => send()} disabled={busy} className="grid size-11 place-items-center rounded-full bg-gradient-sunrise text-primary-foreground shadow-warm disabled:opacity-60"><Send className="size-4" /></button>
        </div>
      </div>
    </div>
  );
}
