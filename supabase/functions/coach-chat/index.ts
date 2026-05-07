// Coach IA — streaming via Lovable AI Gateway with long-term memory
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

function calcCyclePhase(startDate: string | null, duration: number | null): string | null {
  if (!startDate) return null;
  const d = duration || 28;
  const days = Math.floor((Date.now() - new Date(startDate).getTime()) / 86400000) % d;
  if (days < 5) return "menstrual";
  if (days < 14) return "folicular";
  if (days < 17) return "ovulatoria";
  return "lutea";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { messages, userMessage } = await req.json();
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "no auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Identify user
    const userClient = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: authHeader, apikey: SUPABASE_ANON_KEY },
    }).then((r) => r.json());
    const userId = userClient?.id;
    if (!userId) return new Response(JSON.stringify({ error: "invalid auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Fetch profile + memories using service role (server-side trusted)
    const headers = { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` };
    const [profileRes, memRes, recentLogsRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=*`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/user_memory?user_id=eq.${userId}&select=memory_type,content&order=updated_at.desc&limit=40`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/workout_logs?user_id=eq.${userId}&select=date,muscle_group,status&order=date.desc&limit=10`, { headers }),
    ]);
    const [profile] = await profileRes.json();
    const memories = await memRes.json();
    const recentLogs = await recentLogsRes.json();

    const phase = profile?.tracks_cycle ? calcCyclePhase(profile.cycle_start_date, profile.cycle_duration) : null;
    const dislikes = memories.filter((m: any) => m.memory_type === "food_dislike").map((m: any) => m.content).join(", ");
    const likes = memories.filter((m: any) => m.memory_type === "food_preference").map((m: any) => m.content).join(", ");
    const skipped = recentLogs.filter((l: any) => l.status === "pulado");
    const recentMemoryNotes = memories.slice(0, 8).map((m: any) => `- [${m.memory_type}] ${m.content}`).join("\n");

    const systemPrompt = `Você é a coach pessoal da ${profile?.name ?? "usuária"} no app Nutri AI.
Perfil: objetivo=${profile?.goal ?? "—"}, nível=${profile?.experience_level ?? "—"}, peso=${profile?.weight ?? "—"}kg, altura=${profile?.height ?? "—"}cm.
Treina melhor: ${profile?.preferred_workout_time ?? "—"}.
Restrições: ${(profile?.dietary_restrictions ?? []).join(", ") || "nenhuma"}.
Adora: ${likes || profile?.food_preferences || "—"}. Não gosta: ${dislikes || profile?.food_dislikes || "—"}.
${phase ? `Fase atual do ciclo: ${phase}. Adapte o tom e as recomendações conforme a fase.` : ""}
${skipped.length ? `Pulou recentemente: ${skipped.map((s: any) => s.muscle_group).join(", ")}.` : ""}

Memórias relevantes:
${recentMemoryNotes || "(ainda sem memórias)"}

Regras: seja direta, empática, sem enrolação. Use português brasileiro. Responda em no máximo 4 parágrafos curtos. Nunca sugira algo da lista de "não gosta" ou que viole as restrições.`;

    // Save the user message
    if (userMessage) {
      await fetch(`${SUPABASE_URL}/rest/v1/chat_messages`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ user_id: userId, role: "user", content: userMessage }),
      });
    }

    // Call Lovable AI Gateway with streaming
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: systemPrompt }, ...(messages ?? [])],
        stream: true,
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Limite atingido. Tente em alguns segundos." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResp.status === 402) return new Response(JSON.stringify({ error: "Sem créditos de IA. Adicione créditos nas configurações." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await aiResp.text();
      console.error("AI gateway", aiResp.status, t);
      return new Response(JSON.stringify({ error: "Erro na IA" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Stream-through and capture full content to save assistant message
    let assembled = "";
    const reader = aiResp.body!.getReader();
    const decoder = new TextDecoder();
    const stream = new ReadableStream({
      async start(controller) {
        let buf = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            controller.enqueue(value);
            // also parse to capture content
            let i;
            while ((i = buf.indexOf("\n")) !== -1) {
              const line = buf.slice(0, i).trim();
              buf = buf.slice(i + 1);
              if (!line.startsWith("data: ")) continue;
              const j = line.slice(6).trim();
              if (j === "[DONE]") continue;
              try { const p = JSON.parse(j); const c = p.choices?.[0]?.delta?.content; if (c) assembled += c; } catch { /* ignore */ }
            }
          }
        } finally {
          controller.close();
          // persist assistant message + extract simple memories
          if (assembled) {
            await fetch(`${SUPABASE_URL}/rest/v1/chat_messages`, {
              method: "POST",
              headers: { ...headers, "Content-Type": "application/json", Prefer: "return=minimal" },
              body: JSON.stringify({ user_id: userId, role: "assistant", content: assembled }),
            });
          }
          // naive memory extraction from user message
          if (userMessage) {
            const lower = userMessage.toLowerCase();
            const mems: { memory_type: string; content: string }[] = [];
            const dislikeMatch = lower.match(/n[ãa]o (gosto|aguento|suporto|quero) (mais )?(de )?([\w áéíóúçãõâêô-]{3,40})/);
            if (dislikeMatch) mems.push({ memory_type: "food_dislike", content: dislikeMatch[4].trim() });
            const likeMatch = lower.match(/(amo|adoro) ([\w áéíóúçãõâêô-]{3,40})/);
            if (likeMatch) mems.push({ memory_type: "food_preference", content: likeMatch[2].trim() });
            for (const m of mems) {
              await fetch(`${SUPABASE_URL}/rest/v1/user_memory`, {
                method: "POST",
                headers: { ...headers, "Content-Type": "application/json", Prefer: "return=minimal" },
                body: JSON.stringify({ user_id: userId, ...m }),
              });
            }
          }
        }
      },
    });

    return new Response(stream, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
