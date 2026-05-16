import { Link } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";

export function CoachPromptBar() {
  return (
    <Link
      to="/coach"
      className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-soft active:scale-[0.99] transition"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent">
        <MessageCircle className="size-5 text-primary" />
      </span>
      <span className="text-sm text-foreground/80">Pergunte o que quiser.</span>
    </Link>
  );
}
