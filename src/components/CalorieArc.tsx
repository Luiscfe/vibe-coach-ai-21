import { Flame } from "lucide-react";

interface Props {
  consumed: number;
  goal: number;
}

export function CalorieArc({ consumed, goal }: Props) {
  const remaining = Math.max(0, goal - consumed);
  const pct = Math.min(1, goal > 0 ? consumed / goal : 0);

  const TOTAL = 20;
  const filled = Math.round(pct * TOTAL);
  // Arc spans from -90° (left) to +90° (right), 180° total
  const ticks = Array.from({ length: TOTAL }, (_, i) => {
    const angle = -90 + (i * 180) / (TOTAL - 1);
    return { angle, on: i < filled };
  });

  return (
    <div className="mx-auto w-full max-w-[300px]">
      <div className="relative mx-auto aspect-[2/1] w-full">
        {ticks.map((t, i) => (
          <div
            key={i}
            className="absolute left-1/2 bottom-0 h-full w-[6px] -translate-x-1/2"
            style={{ transform: `translateX(-50%) rotate(${t.angle}deg)`, transformOrigin: "50% 100%" }}
          >
            <div
              className={`mx-auto h-[28%] w-full rounded-full transition-colors duration-500 ${
                t.on ? "bg-gradient-sunrise" : "bg-muted"
              }`}
            />
          </div>
        ))}
        <div className="absolute inset-x-0 bottom-2 flex justify-center">
          <Flame className="size-7 text-primary animate-flame" />
        </div>
      </div>
      <div className="-mt-2 text-center">
        <div className="text-5xl font-semibold tracking-tight tabular-nums">{remaining}</div>
        <div className="mt-1 text-sm text-muted-foreground">Calorias restantes</div>
      </div>
    </div>
  );
}
