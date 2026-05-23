import { useRef, useState } from "react";
import { Plus, Loader2, Check, X, Camera, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface Item {
  name: string;
  portion: string;
  calories: number;
  weight_g: number;
  // qual campo está sendo editado manualmente
  editMode: "weight" | "calories" | null;
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
  const result = data as Result;
  result.items = (result.items ?? []).map((it: any) => ({
    ...it,
    weight_g: it.weight_g ?? extractGrams(it.portion) ?? 100,
    editMode: null,
  }));
  return result;
}

function extractGrams(portion: string): number | null {
  const match = portion?.match(/(\d+)\s*g/i);
  return match ? parseInt(match[1]) : null;
}

function recalcCaloriesByWeight(original: Item, newWeight: number): number {
  const origWeight = extractGrams(original.portion) ?? 100;
  if (origWeight === 0) return original.calories;
  return Math.round((original.calories / origWeight) * newWeight);
}

export function MealScannerFab({ onSaved, forceOpen, onClose }: { 
  onSaved?: () => void; 
  forceOpen?: boolean;
  onClose?: () => void;
}) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [editedItems, setEditedItems] = useState<Item[]>([]);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<"weight" | "calories" | null>(null);
  const [open, setOpen] = useState(forceOpen ?? false);
const [showOptions, setShowOptions] = useState(forceOpen ?? false);
  
  // Novo item manual
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemWeight, setNewItemWeight] = useState("");
  const [newItemCal, setNewItemCal] = useState("");

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
      setEditedItems(analyzed.items.map((it) => ({ ...it, editMode: null })));
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao analisar foto. Tente novamente.");
      close();
    } finally {
      setLoading(false);
    }
  }

  // Atualiza gramagem → recalcula calorias automaticamente
  function updateItemWeight(idx: number, newWeight: number) {
    setEditedItems((prev) => {
      const updated = [...prev];
      const original = result!.items[idx] ?? updated[idx];
      updated[idx] = {
        ...updated[idx],
        weight_g: newWeight,
        calories: recalcCaloriesByWeight(original, newWeight),
      };
      return updated;
    });
  }

  // Atualiza calorias diretamente sem alterar gramagem
  function updateItemCalories(idx: number, newCal: number) {
    setEditedItems((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], calories: newCal };
      return updated;
    });
  }

  function removeItem(idx: number) {
    setEditedItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function addManualItem() {
    if (!newItemName) return toast.error("Digite o nome do item");
    const cal = parseInt(newItemCal) || 0;
    const weight = parseInt(newItemWeight) || 0;
    const newItem: Item = {
      name: newItemName,
      portion: weight ? `${weight}g` : "porção",
      calories: cal,
      weight_g: weight,
      editMode: null,
    };
    setEditedItems((prev) => [...prev, newItem]);
    setNewItemName("");
    setNewItemWeight("");
    setNewItemCal("");
    setShowAddItem(false);
    toast.success(`"${newItem.name}" adicionado`);
  }

  function getAdjustedTotals() {
    if (!result && editedItems.length === 0) return { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
    const totalOrigCal = result ? (result.items.reduce((a, it) => a + it.calories, 0) || 1) : 1;
    const totalNewCal = editedItems.reduce((a, it) => a + it.calories, 0);
    const ratio = result ? totalNewCal / totalOrigCal : 1;
    return {
      calories: totalNewCal,
      protein_g: result ? Math.round(result.protein_g * ratio) : 0,
      carbs_g: result ? Math.round(result.carbs_g * ratio) : 0,
      fat_g: result ? Math.round(result.fat_g * ratio) : 0,
    };
  }

  function close() {
    setOpen(false);
    setShowOptions(false);
    setPreview(null);
    setResult(null);
    setEditedItems([]);
    setEditingIdx(null);
    setEditingField(null);
    setShowAddItem(false);
    setNewItemName(""); setNewItemWeight(""); setNewItemCal("");
    onClose?.(); // ← adiciona essa linha
  }

  async function save() {
    if (!user) return;
    if (saving) return;
    if (editedItems.length === 0 && !result) return toast.error("Adicione pelo menos um item");
    setSaving(true);
    const totals = getAdjustedTotals();
    const description = result?.description ?? editedItems.map((i) => i.name).join(", ");
    try {
      const { error } = await supabase.from("eating_logs").insert({
        user_id: user.id,
        description,
        calories: totals.calories,
        protein_g: totals.protein_g,
        carbs_g: totals.carbs_g,
        fat_g: totals.fat_g,
        meal_type: "refeição",
        evaluation: result?.evaluation ?? "neutra",
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
              className="w-full max-w-md rounded-t-3xl bg-card p-5 shadow-elev max-h-[92vh] overflow-y-auto">
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted" />

              {preview && (
                <img src={preview} alt="Refeição" className="mx-auto aspect-square w-28 rounded-2xl object-cover" />
              )}

              {loading && (
                <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Analisando refeição…
                </div>
              )}

              {(result || editedItems.length > 0) && !loading && (
                <div className="mt-4">
                  {/* Totais */}
                  <div className="text-center">
                    <div className="text-3xl font-semibold">
                      {totals.calories} <span className="text-base font-normal text-muted-foreground">kcal</span>
                    </div>
                    {result && <div className="mt-1 text-sm text-muted-foreground">{result.description}</div>}
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

                  {/* Itens editáveis */}
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-medium text-muted-foreground">
                      Toque no peso <b>ou</b> nas calorias para editar
                    </p>
                    <div className="space-y-2">
                      {editedItems.map((it, i) => (
                        <div key={i} className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2">
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-xs font-medium">{it.name}</div>
                          </div>
                          {/* Editar gramagem */}
                          {editingIdx === i && editingField === "weight" ? (
                            <input autoFocus type="number" value={it.weight_g}
                              onChange={(e) => updateItemWeight(i, parseInt(e.target.value) || 0)}
                              onBlur={() => { setEditingIdx(null); setEditingField(null); }}
                              onKeyDown={(e) => e.key === "Enter" && (setEditingIdx(null), setEditingField(null))}
                              className="w-16 rounded-lg border border-input bg-background px-2 py-1 text-center text-xs outline-none focus:ring-2 focus:ring-ring" />
                          ) : (
                            <button onClick={() => { setEditingIdx(i); setEditingField("weight"); }}
                              className="flex items-center gap-0.5 rounded-lg border border-border bg-card px-2 py-1 text-xs">
                              {it.weight_g}g <Pencil className="ml-0.5 size-2.5 text-muted-foreground" />
                            </button>
                          )}
                          {/* Editar calorias diretamente */}
                          {editingIdx === i && editingField === "calories" ? (
                            <input autoFocus type="number" value={it.calories}
                              onChange={(e) => updateItemCalories(i, parseInt(e.target.value) || 0)}
                              onBlur={() => { setEditingIdx(null); setEditingField(null); }}
                              onKeyDown={(e) => e.key === "Enter" && (setEditingIdx(null), setEditingField(null))}
                              className="w-16 rounded-lg border border-input bg-background px-2 py-1 text-center text-xs outline-none focus:ring-2 focus:ring-ring" />
                          ) : (
                            <button onClick={() => { setEditingIdx(i); setEditingField("calories"); }}
                              className="flex items-center gap-0.5 rounded-lg border border-primary/30 bg-primary/5 px-2 py-1 text-xs text-primary">
                              {it.calories}kcal <Pencil className="ml-0.5 size-2.5" />
                            </button>
                          )}
                          {/* Remover item */}
                          <button onClick={() => removeItem(i)}
                            className="grid size-6 place-items-center rounded-full text-muted-foreground">
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Adicionar item manual */}
                    {showAddItem ? (
                      <div className="mt-3 rounded-xl border border-border bg-card p-3 space-y-2">
                        <p className="text-xs font-medium">Adicionar item manualmente</p>
                        <input value={newItemName} onChange={(e) => setNewItemName(e.target.value)}
                          placeholder="Nome do item (ex: arroz)"
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-ring" />
                        <div className="grid grid-cols-2 gap-2">
                          <input value={newItemWeight} onChange={(e) => setNewItemWeight(e.target.value)}
                            inputMode="numeric" placeholder="Peso (g)"
                            className="rounded-lg border border-input bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-ring" />
                          <input value={newItemCal} onChange={(e) => setNewItemCal(e.target.value)}
                            inputMode="numeric" placeholder="Calorias (kcal)"
                            className="rounded-lg border border-input bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-ring" />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setShowAddItem(false)}
                            className="flex flex-1 items-center justify-center rounded-lg border border-border py-2 text-xs">
                            Cancelar
                          </button>
                          <button onClick={addManualItem}
                            className="flex flex-[2] items-center justify-center rounded-lg bg-gradient-sunrise py-2 text-xs font-medium text-primary-foreground">
                            <Plus className="mr-1 size-3" /> Adicionar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setShowAddItem(true)}
                        className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-border py-2.5 text-xs text-muted-foreground">
                        <Plus className="size-3.5" /> Adicionar item que a foto não captou
                      </button>
                    )}
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

             {!loading && !result && editedItems.length === 0 && (
  <div className="mt-4 space-y-2">
    <button onClick={cameraClick}
      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-sunrise py-3 text-sm font-medium text-primary-foreground">
      <Camera className="size-4" /> Tirar foto
    </button>
    <button onClick={() => galleryRef.current?.click()}
      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card py-3 text-sm font-medium">
      <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeWidth="2"/>
        <circle cx="8.5" cy="8.5" r="1.5" strokeWidth="2"/>
        <polyline points="21 15 16 10 5 21" strokeWidth="2"/>
      </svg>
      Galeria
    </button>
    <button onClick={close}
      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border py-3 text-sm text-muted-foreground">
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
