import { Link, useRouterState } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";

export function CoachFab() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  if (path.startsWith("/coach")) return null;
  return (
    <Link to="/coach" className="fixed bottom-24 right-5 z-40 grid size-14 place-items-center rounded-full bg-gradient-ember text-primary-foreground shadow-warm active:scale-95 transition">
      <MessageCircle className="size-6" />
    </Link>
  );
}
