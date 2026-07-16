import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { CardService } from "@/services/CardService";
import { callLLM } from "@/lib/agents/llmClient";
import { anonymizeText } from "@/lib/agents/anonymize";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const card = await db.followUpCard.findUnique({
    where: { id },
    include: { history: { orderBy: { createdAt: 'asc' } } }
  });

  if (!card) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!CardService.canAccessCard(user, card)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existingSummary = await db.cardHistorySummary.findUnique({
    where: { cardId: id }
  });

  const throughCount = card.history.length;

  if (existingSummary && existingSummary.throughCount >= throughCount) {
    // Cache é válido
    return NextResponse.json(existingSummary);
  }

  // Gera novo resumo
  if (throughCount === 0) {
    return NextResponse.json({ summaryText: "Não há histórico para resumir.", throughCount: 0 });
  }

  // Pegamos no máximo as últimas 15 interações
  const recentHistory = card.history.slice(-15);
  const formattedHistory = recentHistory.map(h => {
    let msg = `[${h.createdAt.toISOString()}] Ação: ${h.action} | Por: ${h.userName}`;
    if (h.message) {
      msg += ` | Nota: ${anonymizeText(h.message)}`;
    }
    return msg;
  }).join("\n");

  const prompt = `Analise o seguinte histórico operacional de interações com um visitante. 
Gere um resumo direto e executivo (2 a 3 frases no máximo) focando em: 
1. O que já foi tentado
2. O status atual
3. O próximo passo lógico (baseado apenas no que está escrito, sem inventar novos fluxos).
Não inclua saudações, apenas o resumo.

Histórico:
${formattedHistory}`;

  try {
    const llmRes = await callLLM(prompt);

    const summary = await db.cardHistorySummary.upsert({
      where: { cardId: id },
      update: {
        summaryText: llmRes.text,
        throughCount: throughCount,
        generatedAt: new Date()
      },
      create: {
        cardId: id,
        summaryText: llmRes.text,
        throughCount: throughCount
      }
    });

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Erro ao gerar resumo de histórico:", error);
    return NextResponse.json({ error: "Falha ao gerar resumo de histórico" }, { status: 500 });
  }
}
