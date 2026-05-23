import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Apple, Dumbbell, Users, User, Heart, Camera } from "lucide-react";
import { useState } from "react";
import { MealScannerFab } from "@/components/MealScannerFab";

const leftTabs = [
  { to: "/home", label: "Início", icon: Home },
  { to: "/diet", label: "Dieta", icon: Apple },
  { to: "/workout", label: "Treino", icon: Dumbbell },
];

const rightTabs = [
  { to: "/anchor", label: "Âncora", icon: Heart, highlight: true },
  { to: "/group", label: "Grupo", icon: Users },
  { to: "/profile", label: "Perfil", icon: User },
];

export function BottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [scanOpen, setScanOpen] = useState(false);

  function TabItem({ tab }: { tab: typeof leftTabs[0] & { highlight?: boolean } }) {
    const active = path.startsWith(tab.to);
    const Icon = tab.icon;
    const isHighlight = tab.highlight;
    return (
      <Link
        to={tab.to}
        className="relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px]"
      >
        <Icon
          className={`size-5 transition ${
            isHighlight || active ? "text-primary" : "text-muted-foreground"
          }`}
        />
        <span className={`${isHighlight || active ? "text-primary font-medium" : "text-muted-foreground"}`}>
          {tab.label}
        </span>
        {isHighlight && (
          <span className="absolute -bottom-0.5 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-primary" />
        )}
      </Link>
    );
  }

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-lg safe-bottom">
        <div className="mx-auto flex max-w-md items-center justify-around px-1 pt-1 pb-2">

          {/* 3 abas da esquerda */}
          {leftTabs.map((t) => <TabItem key={t.to} tab={t} />)}

          {/* Botão câmera centralizado e destacado */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => setScanOpen(true)}
              className="mb-0.5 flex size-12 items-center justify-center rounded-full bg-foreground text-background shadow-lg active:scale-95 transition -translate-y-2"
            >
              <Camera className="size-5" />
            </button>
            <span className="text-[10px] text-muted-foreground -mt-0.5">Foto</span>
          </div>

          {/* 3 abas da direita */}
          {rightTabs.map((t) => <TabItem key={t.to} tab={t} />)}

        </div>
      </nav>

      {/* Scanner acionado pelo botão câmera */}
      {scanOpen && (
        <MealScannerFab
          forceOpen
          onSaved={() => setScanOpen(false)}
          onClose={() => setScanOpen(false)}
        />
      )}
    </>
  );
}
