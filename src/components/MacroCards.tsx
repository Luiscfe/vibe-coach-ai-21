import { Fish, Sandwich, CircleDot } from "lucide-react";

interface Props {
  protein: { current: number; goal: number };
  carbs: { current: number; goal: number };
  fat: { current: number; goal: number };
}

export function MacroCards({ protein, carbs, fat }: Props) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <MacroCard
        label="Proteínas"
        current={protein.current}
        goal={protein.goal}
        color="text-destructive"
        icon={<Fish className="size-5 text-destructive" />}
      />
      <MacroCard
        label="Carboidratos"
        current={carbs.current}
        goal={carbs.goal}
        color="text-primary"
        icon={<Sandwich className="size-5 text-primary" />}
      />
      <MacroCard
        label="Gorduras"
        current={fat.current}
        goal={fat.goal}
        color="text-[oklch(0.6_0.15_230)]"
        icon={<CircleDot className="size-5 text-[oklch(0.6_0.15_230)]" />}
      />
    </div>
  );
}

function MacroCard({
  label,
  current,
  goal,
  color,
  icon,
}: {
  label: string;
  current: number;
  goal: number;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3 shadow-soft">
      <div className="mb-2">{icon}</div>
      <div className="text-xs font-medium text-foreground">{label}</div>
      <div className="mt-1 text-sm">
        <span className={`font-semibold ${color}`}>{Math.round(current)}g</span>
        <span className="text-muted-foreground"> /{goal}g</span>
      </div>
    </div>
  );
}
