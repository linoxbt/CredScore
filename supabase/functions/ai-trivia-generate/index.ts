import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { category, count } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are a trivia question generator. Generate unique, interesting trivia questions with verified correct answers.

IMPORTANT:
- Every answer MUST be factually correct and verifiable
- Include the authoritative source for each answer
- Make questions diverse and interesting
- Each question must have exactly 4 options with only ONE correct answer
- Vary difficulty levels

Return ONLY a JSON array:
[
  {
    "question": "<question text>",
    "options": ["<option A>", "<option B>", "<option C>", "<option D>"],
    "correctIndex": <0-based index of correct answer>,
    "source": "<authoritative source URL or name>",
    "category": "<category name>",
    "explanation": "<1-2 sentence explanation of why the answer is correct>"
  }
]`;

    const categoryFilter = category && category !== "all" 
      ? `Generate questions ONLY about the "${category}" category.` 
      : "Generate questions across diverse categories like Science, History, Geography, Technology, Blockchain, Crypto, GenLayer, Sports, Literature, Music, Movies.";

    const userPrompt = `Generate exactly ${count || 5} unique trivia questions. ${categoryFilter}

For GenLayer/Blockchain questions, use these verified facts:
- GenLayer uses "Optimistic Democracy" consensus mechanism
- Intelligent Contracts are written in Python
- The current testnet is called "Asimov"
- GenLayer is an AI-powered Layer 1 blockchain
- Intelligent Contracts can browse the web and use natural language processing

Make sure ALL answers are factually accurate.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    const jsonMatch = content.match(/\[[\s\S]*\]/);
    let questions = [];
    if (jsonMatch) {
      try { questions = JSON.parse(jsonMatch[0]); } catch {}
    }

    if (!questions.length) {
      throw new Error("Failed to generate questions");
    }

    return new Response(JSON.stringify({ questions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("trivia-generate error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
