import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { X, Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Trigger = "skip_workout" | "bad_meal" | "manual";

export function SabotageModal({ open, onClose, trigger }: { open: boolean; onClose: () => void; trigger: Trigger }) {
  const { user } = useAuth();
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      const { data: p } = await supabase.from("profiles").select("anchor_video_url, anchor_text, sabotage_mode_enabled").eq("id", user.id).maybeSingle();
      if (!p?.sabotage_mode_enabled) { onClose(); return; }
      setText(p.anchor_text);
      if (p.anchor_video_url) {
        const { data: signed } = await supabase.storage.from("anchor-videos").createSignedUrl(p.anchor_video_url, 600);
        setVideoUrl(signed?.signedUrl ?? null);
      }
    })();
  }, [open, user, onClose]);

  const headline = trigger === "skip_workout"
    ? "Antes de pular, lembra disso."
    : trigger === "bad_meal"
    ? "Sem julgamento. Só lembra disso."
    : "Sua razão está aqui.";

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] grid place-items-center bg-foreground/60 backdrop-blur-sm p-4">
          <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}
            className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-card shadow-elev">
            <button onClick={onClose} className="absolute right-3 top-3 z-10 grid size-8 place-items-center rounded-full bg-card/80 backdrop-blur"><X className="size-4" /></button>
            <div className="bg-gradient-sunrise px-6 pb-4 pt-8 text-primary-foreground">
              <Heart className="size-6" />
              <h2 className="mt-2 text-2xl">{headline}</h2>
            </div>
            <div className="p-5">
              {videoUrl ? (
                <video src={videoUrl} controls autoPlay playsInline className="w-full rounded-2xl bg-foreground/5" />
              ) : text ? (
                <div className="rounded-2xl bg-accent p-4 text-sm leading-relaxed text-accent-foreground">{text}</div>
              ) : (
                <p className="text-sm text-muted-foreground">Você ainda não gravou sua âncora. Que tal fazer agora?</p>
              )}
              <div className="mt-4 flex gap-2">
                <button onClick={onClose} className="flex-1 rounded-full bg-gradient-sunrise py-2.5 text-sm font-medium text-primary-foreground shadow-warm">Ok, vou continuar</button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
