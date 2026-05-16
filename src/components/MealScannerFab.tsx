import { useRef, useState } from "react";
import { Plus, Loader2, Check, X, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface Result {
  description: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  items: { name: string; portion: string; calories: number }[];
  evaluation: "boa" | "neutra" | "ruim";
}

async function analyzeWithClaude(imageBase64: string): Promise<Result> {
  const { data, error } = await supabase.functions.invoke("analyze-meal-photo", {
    body: { imageBase64 },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as Result;
}


export function MealScannerFab({ onSaved }: { onSaved?: () => void }) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [open, setOpen] = useState(false);

  async function handleFile(file: File) {
    setResult(null);
    setOpen(true);
    setLoading(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      setPreview(dataUrl);
      const analyzed = await analyzeWithClaude(dataUrl);
      setResult(analyzed);
    } catch (e: any) {
      toast.error("Erro ao analisar foto. Tente novamente.");
      close();
    } finally {
      setLoading(false);
    }
  }

  function close() {
    setOpen(false);
    setPreview(null);
    setResult(null);
  }

  async function save() {
    if (!result || !user) return;
    const { error } = await supabase.from("eating_logs").insert({
      user_id: user.id,
      description: result.description,
      calories: result.calories,
      protein_g: result.protein_g,
      carbs_g: result.carbs_g,
      fat_g: result.fat_g,
      image_url: preview,
      meal_type: "refeição",
      evaluation: result.evaluation,
    } as any);
    if (error) return toast.error(error.message);
    toast.success(`+${result.calories} kcal registradas`);
    close();
    onSaved?.();
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />

      <button
        onClick={() => inputRef.current?.click()}
        className="fixed bottom-24 right-5 z-30 flex items-center gap-2 rounded-full bg-gradient-sunrise px-5 py-3.5 text-sm font-medium text-primary-foreground shadow-warm active:scale-95 transition"
      >
        <Plus className="size-5" /> Adicionar
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 backdrop-blur-sm"
            onClick={close}
          >
            <motion.div
              initial={{ y: 80 }}
              animate={{ y: 0 }}
              exit={{ y: 80 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-t-3xl bg-card p-5 shadow-elev"
            >
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted" />
              {preview && (
                <img src={preview} alt="Refeição" className="mx-auto aspect-square w-40 rounded-2xl object-cover" />
              )}
              {loading && (
                <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Analisando refeição…
                </div>
              )}
              {result && (
                <div className="mt-4">
                  <div className="text-center">
                    <div className="text-3xl font-semibold">{result.calories} <span className="text-base font-normal text-muted-foreground">kcal</span></div>
                    <div className="mt-1 text-sm">{result.description}</div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-xl bg-muted py-2"><div className="font-semibold text-destructive">{Math.round(result.protein_g)}g</div><div className="text-muted-foreground">Prot.</div></div>
                    <div className="rounded-xl bg-muted py-2"><div className="font-semibold text-primary">{Math.round(result.carbs_g)}g</div><div className="text-muted-foreground">Carb.</div></div>
                    <div className="rounded-xl bg-muted py-2"><div className="font-semibold text-[oklch(0.6_0.15_230)]">{Math.round(result.fat_g)}g</div><div className="text-muted-foreground">Gord.</div></div>
                  </div>
                  <ul className="mt-3 max-h-32 space-y-1 overflow-y-auto text-xs text-muted-foreground">
                    {result.items.map((it, i) => (
                      <li key={i} className="flex justify-between">
                        <span>{it.name} · {it.portion}</span>
                        <span>{it.calories} kcal</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 flex gap-2">
                    <button onClick={close} className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-border py-3 text-sm">
                      <X className="size-4" /> Descartar
                    </button>
                    <button onClick={save} className="flex flex-[2] items-center justify-center gap-1 rounded-xl bg-gradient-sunrise py-3 text-sm font-medium text-primary-foreground shadow-warm">
                      <Check className="size-4" /> Registrar
                    </button>
                  </div>
                </div>
              )}
              {!loading && !result && (
                <button
                  onClick={() => inputRef.current?.click()}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-sunrise py-3 text-sm font-medium text-primary-foreground"
                >
                  <Camera className="size-4" /> Tirar outra foto
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
