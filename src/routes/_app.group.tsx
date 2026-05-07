import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Send } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/group")({ component: GroupPage });

function GroupPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [text, setText] = useState("");

  async function load() {
    if (!user) return;
    const { data: gm } = await supabase.from("group_members").select("group_id").eq("user_id", user.id).maybeSingle();
    if (!gm) return;
    setGroupId(gm.group_id);
    const { data: ms } = await supabase.from("group_members").select("user_id, last_active_at, joined_at").eq("group_id", gm.group_id);
    if (ms) {
      const ids = ms.map((m: any) => m.user_id);
      const { data: profs } = await supabase.from("profiles").select("id, name, current_streak").in("id", ids);
      setMembers(ms.map((m: any) => ({ ...m, profile: profs?.find((p: any) => p.id === m.user_id) })));
    }
    const { data: msgs } = await supabase.from("group_messages").select("*").eq("group_id", gm.group_id).order("created_at", { ascending: false }).limit(20);
    setMessages(msgs ?? []);
  }

  useEffect(() => { load(); }, [user]);

  useEffect(() => {
    if (!groupId) return;
    const ch = supabase.channel(`group-${groupId}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "group_messages", filter: `group_id=eq.${groupId}` }, (p) => {
      setMessages((m) => [p.new, ...m]);
    }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [groupId]);

  async function send() {
    if (!text.trim() || !groupId) return;
    const { error } = await supabase.from("group_messages").insert({ group_id: groupId, user_id: user!.id, content: text.slice(0, 100) });
    if (error) return toast.error(error.message);
    setText("");
  }

  function status(lastActive: string) {
    const d = (Date.now() - new Date(lastActive).getTime()) / 86400000;
    if (d < 1) return "bg-success";
    if (d < 2) return "bg-ember";
    return "bg-destructive";
  }

  if (!groupId) return <div className="px-5 pt-10"><h1 className="text-3xl">Grupo</h1><p className="mt-2 text-muted-foreground">Você ainda não entrou em um grupo.</p></div>;

  return (
    <div className="px-5 pt-10">
      <h1 className="text-3xl">Seu grupo</h1>
      <p className="mt-1 text-sm text-muted-foreground">{members.length}/5 pessoas</p>

      <div className="mt-6 grid grid-cols-5 gap-2">
        {members.map((m) => (
          <div key={m.user_id} className="text-center">
            <div className="relative mx-auto grid size-12 place-items-center rounded-full bg-gradient-sunrise text-primary-foreground font-medium">
              {m.profile?.name?.[0] ?? "?"}
              <span className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full ring-2 ring-card ${status(m.last_active_at)}`} />
            </div>
            <div className="mt-1 truncate text-[10px]">{m.profile?.name?.split(" ")[0] ?? "—"}</div>
            <div className="text-[10px] text-muted-foreground">🔥{m.profile?.current_streak ?? 0}</div>
          </div>
        ))}
      </div>

      <h2 className="mt-8 text-lg">Mural</h2>
      <div className="mt-3 flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={100} placeholder="Diz algo (até 100 chars)…" className="flex-1 rounded-full border border-input bg-card px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
        <button onClick={send} className="grid size-10 place-items-center rounded-full bg-gradient-sunrise text-primary-foreground"><Send className="size-4" /></button>
      </div>

      <div className="mt-4 space-y-2">
        {messages.map((m) => {
          const author = members.find((x) => x.user_id === m.user_id)?.profile?.name?.split(" ")[0] ?? "Alguém";
          return (
            <div key={m.id} className="rounded-2xl border border-border bg-card p-3 shadow-soft">
              <div className="text-xs text-muted-foreground">{author}</div>
              <div className="text-sm">{m.content}</div>
            </div>
          );
        })}
        {messages.length === 0 && <p className="text-center text-sm text-muted-foreground">Sem mensagens ainda.</p>}
      </div>
    </div>
  );
}
