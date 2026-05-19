import { useRef, useState } from "react";
import { Plus, Loader2, Check, X, Camera, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface Item {
  name: string;
  portion: string;
  calories: number;
  weight_g: number; // gramagem editável
}

interface Result {
  description: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  items: Item[];
  evaluation: "boa" | "neutra" | "ruim";
}

async function analyzeWithClaude(imageBase64: string): Promise<Result> {
  const { data, error } = await supabase.functions.invoke("analyze-meal-photo", {
    body: { imageBase64 },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  // Garante que cada item tem weight_g
  const result = data as Result;
  result.items = (result.items ?? []).map((it: any) => ({
    ...it,
    weight_g: it.weight_g ?? extractGrams(it.portion) ?? 100,
  }));
  return result;
}

// Extrai gramas de strings como "150g", "1 filé médio (150g)"
function extractGrams(portion: string): number | null {
  const match = portion?.match(/(\d+)\s*g/i);
  return match ? parseInt(match[1]) : null;
}

// Recalcula calorias de um item com base no novo peso
function recalcCalories(original: Item, newWeight: number): number {
  const origWeight = extractGrams(original.portion) ?? 100;
  return Math.round((original.calories / origWeight) * newWeight);
}

export function MealScannerFab({ onSaved }: { onSaved?: () => void }) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [editedItems, setEditedItems] = useState<Item[]>([]);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  async function handleFile(file: File) {
    setResult(null);
    setEditedItems([]);
    setShowOptions(false);
    setOpen(true);
    setLoading(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      setPreview(dataUrl);
      const analyzed = await analyzeWithClaude(dataUrl);
      setResult(analyzed);
      setEditedItems(analyzed.items.map((it) => ({ ...it })));
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao analisar foto. Tente novamente.");
      close();
    } finally {
      setLoading(false);
    }
  }

  function updateItemWeight(idx: number, newWeight: number) {
    setEditedItems((prev) => {
      const updated = [...prev];
      const original = result!.items[idx];
      updated[idx] = {
        ...updated[idx],
        weight_g: newWeight,
        calories: recalcCalories(original, newWeight),
      };
      return updated;
    });
  }

  // Totais recalculados com base nos itens editados
  function getAdjustedTotals() {
    if (!result) return { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
    const totalOrigCal = result.items.reduce((a, it) => a + it.calories, 0) || 1;
    const totalNewCal = editedItems.reduce((a, it) => a + it.calories, 0);
    const ratio = totalNewCal / totalOrigCal;
    return {
      calories: totalNewCal,
      protein_g: Math.round(result.protein_g * ratio),
      carbs_g: Math.round(result.carbs_g * ratio),
      fat_g: Math.round(result.fat_g * ratio),
    };
  }

  function close() {
    setOpen(false);
    setShowOptions(false);
    setPreview(null);
    setResult(null);
    setEditedItems([]);
    setEditingIdx(null);
  }

  async function save() {
    if (!result || !user) return;
    if (saving) return;
    setSaving(true);
    const totals = getAdjustedTotals();
    try {
      const { error } = await supabase.from("eating_logs").insert({
        user_id: user.id,
        description: result.description,
        calories: totals.calories,
        protein_g: totals.protein_g,
        carbs_g: totals.carbs_g,
        fat_g: totals.fat_g,
        meal_type: "refeição",
        evaluation: result.evaluation,
      } as any);
      if (error) { toast.error("Erro ao salvar: " + error.message); return; }
      toast.success(`+${totals.calories} kcal registradas!`);
      close();
      onSaved?.();
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao registrar refeição");
    } finally {
      setSaving(false);
    }
  }

  const totals = getAdjustedTotals();

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
      <input ref={galleryRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />

      <button onClick={() => setShowOptions(true)}
        className="fixed bottom-24 right-5 z-30 flex items-center gap-2 rounded-full bg-gradient-sunrise px-5 py-3.5 text-sm font-medium text-primary-foreground shadow-warm active:scale-95 transition">
        <Plus className="size-5" /> Adicionar
      </button>

      {/* Modal opções */}
      <AnimatePresence>
        {showOptions && !open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 backdrop-blur-sm"
            onClick={() => setShowOptions(false)}>
            <motion.div initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-t-3xl bg-card p-5 shadow-elev">
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted" />
              <p className="mb-4 text-center text-sm font-medium text-muted-foreground">Como quer adicionar a refeição?</p>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={cameraClick}
                  className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-gradient-sunrise py-5 text-primary-foreground shadow-warm">
                  <Camera className="size-6" />
                  <span className="text-sm font-medium">Tirar foto</span>
                </button>
                <button onClick={() => galleryRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card py-5 text-foreground shadow-soft">
                  <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeWidth="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5" strokeWidth="2"/>
                    <polyline points="21 15 16 10 5 21" strokeWidth="2"/>
                  </svg>
                  <span className="text-sm font-medium">Galeria</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal resultado */}
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 backdrop-blur-sm">
            <motion.div initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }}
              className="w-full max-w-md rounded-t-3xl bg-card p-5 shadow-elev max-h-[90vh] overflow-y-auto">
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted" />

              {preview && (
                <img src={preview} alt="Refeição" className="mx-auto aspect-square w-32 rounded-2xl object-cover" />
              )}

              {loading && (
                <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Analisando refeição…
                </div>
              )}

              {result && (
                <div className="mt-4">
                  {/* Totais ajustados */}
                  <div className="text-center">
                    <div className="text-3xl font-semibold">
                      {totals.calories} <span className="text-base font-normal text-muted-foreground">kcal</span>
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">{result.description}</div>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-xl bg-muted py-2">
                      <div className="font-semibold text-destructive">{totals.protein_g}g</div>
                      <div className="text-muted-foreground">Prot.</div>
                    </div>
                    <div className="rounded-xl bg-muted py-2">
                      <div className="font-semibold text-primary">{totals.carbs_g}g</div>
                      <div className="text-muted-foreground">Carb.</div>
                    </div>
                    <div className="rounded-xl bg-muted py-2">
                      <div className="font-semibold text-[oklch(0.6_0.15_230)]">{totals.fat_g}g</div>
                      <div className="text-muted-foreground">Gord.</div>
                    </div>
                  </div>

                  {/* Itens com gramagem editável */}
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-medium text-muted-foreground">
                      Toque no peso para ajustar
                    </p>
                    <div className="space-y-2">
                      {editedItems.map((it, i) => (
                        <div key={i} className="flex items-center justify-between rounded-xl bg-muted px-3 py-2">
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-xs font-medium">{it.name}</div>
                            <div className="text-[10px] text-muted-foreground">{it.calories} kcal</div>
                          </div>
                          <div className="flex items-center gap-1">
                            {editingIdx === i ? (
                              <input
                                autoFocus
                                type="number"
                                value={it.weight_g}
                                onChange={(e) => updateItemWeight(i, parseInt(e.target.value) || 0)}
                                onBlur={() => setEditingIdx(null)}
                                onKeyDown={(e) => e.key === "Enter" && setEditingIdx(null)}
                                className="w-16 rounded-lg border border-input bg-background px-2 py-1 text-center text-xs outline-none focus:ring-2 focus:ring-ring"
                              />
                            ) : (
                              <button
                                onClick={() => setEditingIdx(i)}
                                className="flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1 text-xs"
                              >
                                {it.weight_g}g <Pencil className="size-3 text-muted-foreground" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button onClick={close} disabled={saving}
                      className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-border py-3 text-sm disabled:opacity-50">
                      <X className="size-4" /> Descartar
                    </button>
                    <button onClick={save} disabled={saving}
                      className="flex flex-[2] items-center justify-center gap-1 rounded-xl bg-gradient-sunrise py-3 text-sm font-medium text-primary-foreground shadow-warm disabled:opacity-60">
                      {saving ? <><Loader2 className="size-4 animate-spin" /> Salvando…</> : <><Check className="size-4" /> Registrar</>}
                    </button>
                  </div>
                </div>
              )}

              {!loading && !result && (
                <div className="mt-4 space-y-2">
                  <button onClick={cameraClick}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-sunrise py-3 text-sm font-medium text-primary-foreground">
                    <Camera className="size-4" /> Tirar outra foto
                  </button>
                  <button onClick={close}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border py-3 text-sm">
                    Cancelar
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );

  function cameraClick() {
    setShowOptions(false);
    setTimeout(() => inputRef.current?.click(), 100);
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
