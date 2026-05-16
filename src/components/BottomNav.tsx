import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Apple, Dumbbell, Users, User, Heart } from "lucide-react";

const tabs = [
  { to: "/home", label: "Início", icon: Home },
  { to: "/diet", label: "Dieta", icon: Apple },
  { to: "/workout", label: "Treino", icon: Dumbbell },
  { to: "/anchor", label: "Âncora", icon: Heart, highlight: true },
  { to: "/group", label: "Grupo", icon: Users },
  { to: "/profile", label: "Perfil", icon: User },
];

export function BottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/90 backdrop-blur-lg safe-bottom">
      <div className="mx-auto flex max-w-md items-center justify-around px-1 pt-2">
        {tabs.map((t) => {
          const active = path.startsWith(t.to);
          const Icon = t.icon;
          const highlight = t.highlight;
          const iconColor = highlight
            ? "text-primary"
            : active
              ? "text-primary"
              : "text-muted-foreground";
          const labelColor = highlight
            ? "text-primary font-medium"
            : active
              ? "text-primary font-medium"
              : "text-muted-foreground";
          return (
            <Link key={t.to} to={t.to} className="relative flex flex-1 flex-col items-center gap-0.5 rounded-2xl px-1 py-2 text-[10px]">
              <Icon className={`${highlight ? "size-6" : "size-5"} transition ${iconColor}`} />
              <span className={labelColor}>{t.label}</span>
              {highlight && (
                <span className="absolute -bottom-0.5 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
