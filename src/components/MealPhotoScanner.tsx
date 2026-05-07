import { useRef, useState } from "react";
import { Camera, Loader2, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

interface Result {
  description: string;
  calories: number;
  items: { name: string; portion: string; calories: number }[];
  evaluation: "boa" | "neutra" | "ruim";
}

export function MealPhotoScanner({ onSaved }: { onSaved?: () => void }) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function handleFile(file: File) {
    setResult(null);
    setLoading(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      setPreview(dataUrl);
      const { data, error } = await supabase.functions.invoke("analyze-meal-photo", { body: { imageBase64: dataUrl } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data as Result);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao analisar foto");
      setPreview(null);
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!result || !user) return;
    const { error } = await supabase.from("eating_logs").insert({
      user_id: user.id,
      description: result.description,
      calories: result.calories,
      meal_type: "refeição",
      evaluation: result.evaluation,
    } as any);
    if (error) return toast.error(error.message);
    toast.success(`+${result.calories} kcal registradas`);
    setPreview(null);
    setResult(null);
    onSaved?.();
  }

  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-2xl bg-gradient-sunrise text-primary-foreground"><Camera className="size-5" /></div>
        <div className="flex-1">
          <div className="font-medium">Escanear refeição</div>
          <div className="text-xs text-muted-foreground">Tire uma foto e a IA conta as calorias</div>
        </div>
      </div>

      {!preview && (
        <button
          onClick={() => inputRef.current?.click()}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-sunrise px-4 py-3 text-sm font-medium text-primary-foreground shadow-warm"
        >
          <Camera className="size-4" /> Tirar foto / Galeria
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />

      {preview && (
        <div className="mt-4 space-y-3">
          <img src={preview} alt="Refeição" className="aspect-square w-full rounded-2xl object-cover" />
          {loading && (
            <div className="flex items-center justify-center gap-2 rounded-2xl bg-muted py-4 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Analisando refeição…
            </div>
          )}
          {result && (
            <div className="rounded-2xl border border-border bg-background p-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Estimativa</div>
              <div className="mt-1 text-3xl font-semibold">{result.calories} <span className="text-base font-normal text-muted-foreground">kcal</span></div>
              <div className="mt-1 text-sm">{result.description}</div>
              <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                {result.items.map((it, i) => (
                  <li key={i} className="flex justify-between">
                    <span>{it.name} · {it.portion}</span>
                    <span>{it.calories} kcal</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex gap-2">
                <button onClick={() => { setPreview(null); setResult(null); }} className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-border py-2.5 text-sm">
                  <X className="size-4" /> Descartar
                </button>
                <button onClick={save} className="flex flex-[2] items-center justify-center gap-1 rounded-xl bg-gradient-sunrise py-2.5 text-sm font-medium text-primary-foreground shadow-warm">
                  <Check className="size-4" /> Registrar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
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
