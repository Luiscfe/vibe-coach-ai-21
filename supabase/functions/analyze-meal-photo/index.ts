// Analisa foto de refeição via Lovable AI (Gemini) e retorna calorias estimadas
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "imageBase64 obrigatório" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "Você é uma nutricionista que estima calorias de fotos de refeições. Seja preciso e use porções típicas brasileiras.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Analise esta foto e estime as calorias totais. Identifique cada alimento com quantidade aproximada." },
              { type: "image_url", image_url: { url: imageBase64 } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "register_meal",
              description: "Registra a estimativa de calorias da refeição",
              parameters: {
                type: "object",
                properties: {
                  description: { type: "string", description: "Descrição curta da refeição (ex: 'Frango grelhado, arroz e salada')" },
                  calories: { type: "integer", description: "Calorias totais estimadas em kcal" },
                  protein_g: { type: "number", description: "Proteínas totais em gramas" },
                  carbs_g: { type: "number", description: "Carboidratos totais em gramas" },
                  fat_g: { type: "number", description: "Gorduras totais em gramas" },
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        portion: { type: "string" },
                        calories: { type: "integer" },
                      },
                      required: ["name", "portion", "calories"],
                    },
                  },
                  evaluation: { type: "string", enum: ["boa", "neutra", "ruim"], description: "boa = saudável e alinhada com objetivo, neutra = ok, ruim = ultraprocessada/excesso de açúcar/fritura" },
                },
                required: ["description", "calories", "protein_g", "carbs_g", "fat_g", "items", "evaluation"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "register_meal" } },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Muitas requisições. Aguarde alguns segundos." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResp.status === 402) return new Response(JSON.stringify({ error: "Sem créditos de IA." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await aiResp.text();
      console.error("AI error", aiResp.status, t);
      return new Response(JSON.stringify({ error: "Erro ao analisar imagem" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await aiResp.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "Não foi possível interpretar a imagem" }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const args = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(args), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
