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
            content: `Você é uma nutricionista especialista em culinária brasileira com 20 anos de experiência.
Sua tarefa é analisar fotos de refeições e estimar com máxima precisão os macronutrientes.

REGRAS OBRIGATÓRIAS:
1. Identifique o tipo EXATO de proteína na foto:
   - Carne bovina: cor marrom/avermelhada, textura fibrosa → bife, contrafilé, patinho, alcatra, etc.
   - Frango: cor clara/bege, textura lisa → peito, coxa, sobrecoxa, etc.
   - Peixe: textura em lascas, cor clara ou rosada
   - Porco: cor rosada, textura firme
   - NUNCA confunda carne bovina com frango

2. Use tabelas nutricionais brasileiras (TACO) para os valores
3. Considere os métodos de preparo visíveis: grelhado, frito, cozido, assado (frituras adicionam 20-30% de calorias)
4. Para empanados/à milanesa: adicione a caloria da farinha/ovo no cálculo
5. Estime porções realistas para um adulto brasileiro (não exagere nem subestime)
6. Para pratos mistos, some cada componente separadamente

REFERÊNCIAS DE PORÇÕES TÍPICAS BRASILEIRAS:
- Arroz cozido: 4 colheres de sopa = 120g = 160 kcal
- Feijão: 1 concha = 90g = 80 kcal  
- Bife bovino grelhado 150g = 250 kcal
- Frango grelhado 150g = 165 kcal
- Batata frita 120g = 300 kcal
- Salada folhas = praticamente zero caloria`,
          },
          {
            role: "user",
            content: [
              { 
                type: "text", 
                text: `Analise esta foto com atenção máxima. 
Observe a COR e TEXTURA da proteína para identificar corretamente se é carne bovina, frango, peixe ou outra.
Identifique todos os alimentos visíveis, estime as porções e calcule as calorias totais.
Use porções típicas de uma refeição brasileira adulta.` 
              },
              { type: "image_url", image_url: { url: imageBase64 } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "register_meal",
              description: "Registra a estimativa nutricional da refeição",
              parameters: {
                type: "object",
                properties: {
                  description: { 
                    type: "string", 
                    description: "Descrição precisa da refeição com o tipo correto de proteína (ex: 'Bife bovino à milanesa, batata frita e salada')" 
                  },
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
                  evaluation: { 
                    type: "string", 
                    enum: ["boa", "neutra", "ruim"], 
                    description: "boa = saudável e equilibrada, neutra = aceitável, ruim = ultraprocessada/excesso de gordura ou açúcar" 
                  },
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
    console.error("analyze-meal-photo error", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
