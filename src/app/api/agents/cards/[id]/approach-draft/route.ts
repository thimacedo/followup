import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { CardService } from "@/services/CardService";
import { callLLM } from "@/lib/agents/llmClient";
import { anonymizeVisitorContext } from "@/lib/agents/anonymize";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const card = await db.followUpCard.findUnique({
    where: { id },
    include: { visitor: true, department: true }
  });

  if (!card) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!CardService.canAccessCard(user, card)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existingDraft = await db.cardApproachDraft.findUnique({
    where: { cardId: id }
  });

  if (existingDraft) {
    return NextResponse.json(existingDraft);
  }

  return await handleGenerate(id, card);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const card = await db.followUpCard.findUnique({
    where: { id },
    include: { visitor: true, department: true }
  });

  if (!card || !CardService.canAccessCard(user, card)) {
    return NextResponse.json({ error: "Not found or Forbidden" }, { status: 404 });
  }

  return await handleGenerate(id, card);
}

export async function handleGenerate(cardId: string, card: any) {
  try {
    const draft = await generateApproachDraftLogic(cardId, card);
    return NextResponse.json(draft);
  } catch (error) {
    console.error("Erro ao gerar rascunho:", error);
    return NextResponse.json({ error: "Falha ao gerar rascunho" }, { status: 500 });
  }
}

export async function generateApproachDraftLogic(cardId: string, card: any) {
  const notesAndPrayer = [card.visitor.prayerRequest, card.visitor.notes]
    .filter(Boolean)
    .join(" | ");

  const anonymizedText = anonymizeVisitorContext(notesAndPrayer, card.visitor.name);
  const ageContext = card.visitor.age ? `idade aproximada: ${card.visitor.age} anos,` : "";
  const maritalContext = card.visitor.maritalStatus ? `estado civil: ${card.visitor.maritalStatus},` : "";

  const prompt = `Você ajuda um voluntário de acolhimento a preparar a primeira mensagem de WhatsApp para um visitante da igreja. 
Perfil: ${ageContext} ${maritalContext} departamento de interesse: ${card.department.name}. 
Pedidos de oração ou observações (anonimizados): "${anonymizedText || "Sem observações"}". 
Gere APENAS o texto de uma mensagem curta (3 a 5 frases), calorosa, sem soar genérica nem robótica, convidando para um próximo passo simples. Não inclua aspas ou comentários extras, apenas o texto da mensagem.`;

  const llmRes = await callLLM(prompt);

  const draft = await db.cardApproachDraft.upsert({
    where: { cardId },
    update: {
      draftText: llmRes.text,
      model: llmRes.provider,
      dismissed: false,
      generatedAt: new Date()
    },
    create: {
      cardId,
      draftText: llmRes.text,
      model: llmRes.provider
    }
  });

  return draft;
}
