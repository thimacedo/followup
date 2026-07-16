import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { callLLM } from "@/lib/agents/llmClient";
import { anonymizeVisitorContext } from "@/lib/agents/anonymize";
import { withAgentRun } from "@/lib/agents/runLogger";
import { Priority } from "@prisma/client";
import { subHours } from "date-fns";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Máximo pro serverless Vercel

export async function POST(req: Request) {
  const secret = req.headers.get("x-agent-secret");
  if (secret !== process.env.AGENT_CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const isDryRun = url.searchParams.get("dry_run") === "1";

  try {
    let processed = 0;

    await withAgentRun("priority_screening", async () => {
      // Limite (take: 15) para evitar estourar o timeout da Serverless Function
      const recentCards = await db.followUpCard.findMany({
        where: {
          priorityScreening: null,
          createdAt: { gte: subHours(new Date(), 24) } 
        },
        include: { visitor: true },
        take: 15,
        orderBy: { createdAt: 'asc' }
      });

      for (const card of recentCards) {
        const notesAndPrayer = [card.visitor.prayerRequest, card.visitor.notes]
          .filter(Boolean)
          .join(" | ");

        if (!notesAndPrayer || notesAndPrayer.length < 5) {
          // Ignora cards vazios sem gastar API
          if (!isDryRun) {
            await db.cardPriorityScreening.create({
              data: {
                cardId: card.id,
                suggested: "normal",
                reasoning: "Sem observações suficientes para análise detalhada.",
                reviewed: true,
                accepted: null
              }
            });
          }
          processed++;
          continue;
        }

        const anonymizedText = anonymizeVisitorContext(notesAndPrayer, card.visitor.name);
        const prompt = `Analise o seguinte relato de um visitante (anonimizado) e diga se ele indica uma situação que merece atenção prioritária (crise, luto, doença grave, pedido explícito de conversa urgente). Responda APENAS em JSON válido, com este formato exato: {"prioridade": "baixa"|"normal"|"alta", "motivo": "..."}.
Relato: "${anonymizedText}"`;

        try {
          const llmRes = await callLLM(prompt);
          let jsonString = llmRes.text.replace(/```json/gi, "").replace(/```/g, "").trim();
          
          let parsed;
          try {
             parsed = JSON.parse(jsonString);
          } catch(e) {
             console.error("LLM não retornou JSON válido:", llmRes.text);
             continue; // Pula este e tenta o próximo
          }
          
          const suggestedPriority: Priority = ["baixa", "normal", "alta"].includes(parsed.prioridade) 
            ? parsed.prioridade as Priority 
            : "normal";

          if (!isDryRun) {
            await db.cardPriorityScreening.create({
              data: {
                cardId: card.id,
                suggested: suggestedPriority,
                reasoning: String(parsed.motivo).substring(0, 500)
              }
            });
          } else {
            console.log(`[DRY_RUN] Card ${card.id} > Priority: ${suggestedPriority}, Motivo: ${parsed.motivo}`);
          }
          processed++;
        } catch (llmError) {
           console.error(`Erro ao invocar LLM no card ${card.id}:`, llmError);
           // Interrompe loop para não queimar todo o lote em caso de queda global de API
           break;
        }
      }

      return { itemsCount: processed, detail: isDryRun ? "Execução em DRY_RUN" : undefined };
    });

    return NextResponse.json({ message: "Processado", items: processed });
  } catch (error: any) {
    if (error.message === "LOCK_CONFLICT") {
      return NextResponse.json({ error: "Agente já está rodando" }, { status: 409 });
    }
    console.error("Erro no priority-screening:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
