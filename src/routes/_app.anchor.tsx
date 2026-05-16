import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Heart, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_app/anchor")({ component: AnchorPage });

function AnchorPage() {
  const { user } = useAuth();
  const [text, setText] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: p } = await supabase
        .from("profiles")
        .select("anchor_text, anchor_video_url")
        .eq("id", user.id)
        .maybeSingle();
      setText(p?.anchor_text ?? null);
      if (p?.anchor_video_url) {
        const { data: signed } = await supabase.storage
          .from("anchor-videos")
          .createSignedUrl(p.anchor_video_url, 600);
        setVideoUrl(signed?.signedUrl ?? null);
      }
      setLoading(false);
    })();
  }, [user]);

  return (
    <div className="px-5 pt-10 pb-10">
      <div className="flex items-center gap-3">
        <Heart className="size-7 text-primary" />
        <h1 className="text-3xl">Minha Âncora</h1>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Sua razão para continuar. Lembre-se de quem você está se tornando.
      </p>

      <div className="mt-6 overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Carregando…</div>
        ) : videoUrl ? (
          <video src={videoUrl} controls playsInline className="w-full bg-foreground/5" />
        ) : text ? (
          <div className="p-6 text-base leading-relaxed">{text}</div>
        ) : (
          <div className="p-8 text-center">
            <p className="text-sm text-muted-foreground">Você ainda não gravou sua âncora.</p>
            <Link to="/onboarding/anchor" className="mt-4 inline-block rounded-2xl bg-gradient-sunrise px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-warm">
              Gravar agora
            </Link>
          </div>
        )}
      </div>

      <Link to="/home" className="mt-6 inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="size-4" /> Voltar
      </Link>
    </div>
  );
}
