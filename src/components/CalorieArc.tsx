import { Flame } from "lucide-react";

interface Props {
  consumed: number;
  goal: number;
}

// Semicircular gauge made of small "tick" capsules, similar to fitness apps.
export function CalorieArc({ consumed, goal }: Props) {
  const remaining = Math.max(0, goal - consumed);
  const pct = Math.min(1, goal > 0 ? consumed / goal : 0);

  const TOTAL = 22;
  const filled = Math.round(pct * TOTAL);

  // Distribute ticks across a 180° arc (from -180° to 0°)
  const ticks = Array.from({ length: TOTAL }, (_, i) => {
    const angle = -180 + (i * 180) / (TOTAL - 1);
    return { angle, on: i < filled };
  });

  return (
    <div className="relative mx-auto w-full max-w-[320px]">
      <div className="relative aspect-[2/1] w-full">
        {ticks.map((t, i) => (
          <div
            key={i}
            className="absolute left-1/2 top-full h-[42%] w-[8px] origin-bottom -translate-x-1/2"
            style={{ transform: `translateX(-50%) rotate(${t.angle + 90}deg)` }}
          >
            <div
              className={`h-[55%] w-full rounded-full transition-colors duration-500 ${
                t.on ? "bg-gradient-sunrise shadow-warm" : "bg-muted"
              }`}
            />
          </div>
        ))}
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
          <Flame className="size-8 text-primary animate-flame" />
        </div>
      </div>
      <div className="mt-4 text-center">
        <div className="text-5xl font-semibold tracking-tight tabular-nums">{remaining}</div>
        <div className="mt-1 text-sm text-muted-foreground">Calorias restantes</div>
      </div>
    </div>
  );
}
