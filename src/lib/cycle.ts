export type CyclePhase = "menstrual" | "folicular" | "ovulatoria" | "lutea";

export const PHASE_INFO: Record<CyclePhase, {
  label: string;
  emoji: string;
  tone: string;
  workout: string;
  diet: string;
  tip: string;
}> = {
  menstrual: {
    label: "Menstrual",
    emoji: "🌑",
    tone: "Acolhedor",
    workout: "Yoga, caminhada leve, mobilidade",
    diet: "Aumentar ferro, reduzir sódio, líquidos quentes",
    tip: "Hoje é dia de respeitar seu corpo. Movimento leve faz mais bem que treino pesado.",
  },
  folicular: {
    label: "Folicular",
    emoji: "🌒",
    tone: "Motivacional",
    workout: "Força, HIIT, alta intensidade",
    diet: "Proteína alta, carboidratos complexos",
    tip: "Energia em alta! Dia ideal para dar tudo no treino de força.",
  },
  ovulatoria: {
    label: "Ovulatória",
    emoji: "🌕",
    tone: "Empoderador",
    workout: "Pico de performance, treinos pesados",
    diet: "Manter proteína, leve déficit se objetivo é emagrecer",
    tip: "Você está no pico. Aproveite para bater seus PRs.",
  },
  lutea: {
    label: "Lútea",
    emoji: "🌘",
    tone: "Compreensivo",
    workout: "Intensidade moderada, pilates, funcional",
    diet: "Magnésio, complexo B, menos açúcar simples",
    tip: "TPM é real. Sem julgamento — escute seu corpo.",
  },
};

export function calcCyclePhase(startDate?: string | null, duration: number = 28): CyclePhase | null {
  if (!startDate) return null;
  const dayInCycle = Math.floor((Date.now() - new Date(startDate).getTime()) / 86400000) % duration;
  if (dayInCycle < 5) return "menstrual";
  if (dayInCycle < 14) return "folicular";
  if (dayInCycle < 17) return "ovulatoria";
  return "lutea";
}

export function dayInCycle(startDate?: string | null, duration: number = 28): number | null {
  if (!startDate) return null;
  return (Math.floor((Date.now() - new Date(startDate).getTime()) / 86400000) % duration) + 1;
}
