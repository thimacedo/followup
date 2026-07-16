export async function sendNtfyAlert(title: string, message: string, tags: string[] = []) {
  const ntfyUrl = process.env.NTFY_URL || "https://ntfy.sh/";
  const topic = process.env.NTFY_TOPIC_AGENTS;

  if (!topic) {
    console.warn("NTFY_TOPIC_AGENTS não configurado. Alerta ignorado.");
    return;
  }

  const url = ntfyUrl.endsWith("/") ? `${ntfyUrl}${topic}` : `${ntfyUrl}/${topic}`;

  const headers: Record<string, string> = {
    Title: title,
  };
  
  if (tags.length > 0) {
    headers["Tags"] = tags.join(",");
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      body: message,
      headers,
    });
    if (!res.ok) {
      console.error(`Falha ao enviar alerta ntfy: ${res.statusText}`);
    }
  } catch (error) {
    console.error("Erro ao comunicar com ntfy:", error);
  }
}
