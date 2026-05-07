import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Step } from "./onboarding.profile";
import { Video, Type } from "lucide-react";

export const Route = createFileRoute("/onboarding/anchor")({
  component: AnchorStep,
});

function AnchorStep() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<"video" | "text">("video");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [filename, setFilename] = useState<string>("");

  useEffect(() => { if (!loading && !user) nav({ to: "/" }); }, [loading, user, nav]);

  async function uploadAndContinue(file: File | null) {
    if (!user) return;
    setBusy(true);
    try {
      let url: string | null = null;
      if (file) {
        const path = `${user.id}/anchor-${Date.now()}.${file.name.split(".").pop()}`;
        const { error } = await supabase.storage.from("anchor-videos").upload(path, file, { upsert: true });
        if (error) throw error;
        url = path;
      }
      const { error } = await supabase.from("profiles").update({
        anchor_video_url: url, anchor_text: text || null, anchor_recorded_at: new Date().toISOString(),
      }).eq("id", user.id);
      if (error) throw error;
      // Decide next step
      const { data: prof } = await supabase.from("profiles").select("gender").eq("id", user.id).single();
      nav({ to: prof?.gender === "feminino" ? "/onboarding/cycle" : "/onboarding/group" });
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  }

  async function continueWithText() {
    if (!text.trim() && mode === "text") return toast.error("Escreva sua razão");
    await uploadAndContinue(null);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    setFilename(f.name);
    await uploadAndContinue(f);
  }

  return (
    <div>
      <Step n={3} total={5} />
      <h1 className="mt-6 text-3xl">Sua âncora.</h1>
      <p className="mt-2 text-muted-foreground">Grave um vídeo curto (30–60s) contando por que você quer mudar. Esse vídeo é só seu — vamos te mostrar quando você quiser desistir.</p>

      <div className="mt-8 flex gap-2 rounded-full bg-muted p-1 text-sm">
        <button onClick={() => setMode("video")} className={`flex-1 rounded-full py-2 ${mode === "video" ? "bg-card shadow-soft" : "text-muted-foreground"}`}><Video className="mr-2 inline size-4" />Vídeo</button>
        <button onClick={() => setMode("text")} className={`flex-1 rounded-full py-2 ${mode === "text" ? "bg-card shadow-soft" : "text-muted-foreground"}`}><Type className="mr-2 inline size-4" />Texto</button>
      </div>

      {mode === "video" ? (
        <div className="mt-6 rounded-3xl border border-dashed border-border bg-card p-8 text-center">
          <Video className="mx-auto size-10 text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">Toque para gravar ou enviar do seu celular</p>
          <input ref={fileRef} type="file" accept="video/*" capture="user" onChange={onFile} className="hidden" />
          <button onClick={() => fileRef.current?.click()} disabled={busy} className="mt-4 rounded-full bg-gradient-sunrise px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-warm disabled:opacity-60">
            {busy ? "Enviando…" : filename || "Gravar / escolher vídeo"}
          </button>
        </div>
      ) : (
        <div className="mt-6">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} placeholder="Escreva sua razão aqui…" className="w-full rounded-2xl border border-input bg-card px-4 py-3 outline-none focus:ring-2 focus:ring-ring" />
          <button onClick={continueWithText} disabled={busy} className="mt-4 w-full rounded-2xl bg-gradient-sunrise px-4 py-3.5 font-medium text-primary-foreground shadow-warm disabled:opacity-60">{busy ? "Salvando…" : "Continuar"}</button>
        </div>
      )}
    </div>
  );
}
