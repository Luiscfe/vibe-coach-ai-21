import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Apple, Dumbbell, Users, User } from "lucide-react";

const tabs = [
  { to: "/home", label: "Início", icon: Home },
  { to: "/diet", label: "Dieta", icon: Apple },
  { to: "/workout", label: "Treino", icon: Dumbbell },
  { to: "/group", label: "Grupo", icon: Users },
  { to: "/profile", label: "Perfil", icon: User },
];

export function BottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/90 backdrop-blur-lg safe-bottom">
      <div className="mx-auto flex max-w-md items-center justify-around px-2 pt-2">
        {tabs.map((t) => {
          const active = path.startsWith(t.to);
          const Icon = t.icon;
          return (
            <Link key={t.to} to={t.to} className="flex flex-1 flex-col items-center gap-0.5 rounded-2xl px-2 py-2 text-[10px]">
              <Icon className={`size-5 transition ${active ? "text-primary" : "text-muted-foreground"}`} />
              <span className={active ? "text-primary font-medium" : "text-muted-foreground"}>{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
