type LLMResponse = {
  text: string;
  provider: string;
};

export async function callLLM(prompt: string): Promise<LLMResponse> {
  // 1. Tenta Mistral (Principal)
  if (process.env.MISTRAL_API_KEY) {
    try {
      const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.MISTRAL_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "mistral-large-latest",
          messages: [{ role: "user", content: prompt }]
        })
      });
      if (res.ok) {
        const data = await res.json();
        return { text: data.choices[0].message.content, provider: "mistral" };
      } else {
        console.warn(`Mistral falhou com status ${res.status}`);
      }
    } catch (e) {
      console.error("Erro na chamada à Mistral", e);
    }
  }

  // 2. Tenta Groq (Fallback 1)
  if (process.env.GROQ_API_KEY) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }]
        })
      });
      if (res.ok) {
        const data = await res.json();
        return { text: data.choices[0].message.content, provider: "groq" };
      } else {
        console.warn(`Groq falhou com status ${res.status}`);
      }
    } catch (e) {
      console.error("Erro na chamada ao Groq", e);
    }
  }

  // 3. Tenta Gemini (Fallback 2)
  if (process.env.GEMINI_API_KEY) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });
      if (res.ok) {
        const data = await res.json();
        return { text: data.candidates[0].content.parts[0].text, provider: "gemini" };
      } else {
        console.warn(`Gemini falhou com status ${res.status}`);
      }
    } catch (e) {
      console.error("Erro na chamada ao Gemini", e);
    }
  }

  // 4. Tenta DeepSeek (Último recurso)
  if (process.env.DEEPSEEK_API_KEY) {
    try {
      const res = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [{ role: "user", content: prompt }]
        })
      });
      if (res.ok) {
        const data = await res.json();
        return { text: data.choices[0].message.content, provider: "deepseek" };
      } else {
        console.warn(`DeepSeek falhou com status ${res.status}`);
      }
    } catch (e) {
      console.error("Erro na chamada ao DeepSeek", e);
    }
  }

  throw new Error("Nenhum provedor de LLM respondeu com sucesso.");
}
