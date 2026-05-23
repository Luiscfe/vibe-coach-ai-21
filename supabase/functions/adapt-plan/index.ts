// Recalcula aderência da última semana e ajusta intensidade do plano
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response("no auth", { status: 401, headers: corsHeaders });
    const u = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { Authorization: auth, apikey: SUPABASE_ANON_KEY } }).then((r) => r.json());
    const userId = u?.id;
    if (!userId) return new Response("invalid", { status: 401, headers: corsHeaders });

    const headers = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` };
    const since = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

    const [wl, el, plan] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/workout_logs?user_id=eq.${userId}&date=gte.${since}&select=status`, { headers }).then((r) => r.json()),
      fetch(`${SUPABASE_URL}/rest/v1/eating_logs?user_id=eq.${userId}&datetime=gte.${since}&select=evaluation`, { headers }).then((r) => r.json()),
      fetch(`${SUPABASE_URL}/rest/v1/workout_plan?user_id=eq.${userId}&select=*`, { headers }).then((r) => r.json()),
    ]);

    const done = wl.filter((x: any) => x.status === "concluido").length;
    const skipped = wl.filter((x: any) => x.status === "pulado").length;
    const totalW = done + skipped || 1;
    const wRate = done / totalW;
    const goodMeals = el.filter((x: any) => x.evaluation === "boa").length;
    const badMeals = el.filter((x: any) => x.evaluation === "ruim").length;
    const totalM = goodMeals + badMeals || 1;
    const mRate = goodMeals / totalM;
    const score = Math.round((wRate * 0.6 + mRate * 0.4) * 100);

    // Decide intensity adjustment
    let mult = 1;
    let note = "Mantendo o ritmo.";
    if (score >= 80) { mult = 1.1; note = "Ótima semana — subindo a intensidade 10%."; }
    else if (score < 50) { mult = 0.85; note = "Semana difícil — reduzindo intensidade. Sem culpa."; }

    if (mult !== 1 && plan.length) {
      for (const p of plan) {
        const newIntensity = Math.min(2, Math.max(0.5, (p.intensity ?? 1) * mult));
        const newDur = Math.round((p.duration_minutes ?? 45) * mult);
        await fetch(`${SUPABASE_URL}/rest/v1/workout_plan?id=eq.${p.id}`, {
          method: "PATCH",
          headers: { ...headers, "Content-Type": "application/json", Prefer: "return=minimal" },
          body: JSON.stringify({ intensity: newIntensity, duration_minutes: newDur }),
        });
      }
    }

    // Persist score
    const today = new Date().toISOString().slice(0, 10);
    await fetch(`${SUPABASE_URL}/rest/v1/adherence_scores`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json", Prefer: "return=minimal,resolution=merge-duplicates" },
      body: JSON.stringify({ user_id: userId, date: today, score }),
    });

    return new Response(JSON.stringify({ score, mult, note, done, skipped, goodMeals, badMeals }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("adapt-plan error", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
