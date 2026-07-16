import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { ROLES } from "@/lib/constants";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  
  // Apenas Supervisor e Admin podem aprovar triagem
  if (!user || (user.role !== ROLES.ADMIN && user.role !== ROLES.SUPERVISOR)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const data = await req.json();

  if (typeof data.accepted !== "boolean") {
    return NextResponse.json({ error: "Campo 'accepted' é obrigatório (booleano)" }, { status: 400 });
  }

  const screening = await db.cardPriorityScreening.findUnique({
    where: { cardId: id }
  });

  if (!screening) {
    return NextResponse.json({ error: "Triagem não encontrada para este card" }, { status: 404 });
  }

  // Se aceitar, altera a prioridade real do card
  if (data.accepted) {
    await db.followUpCard.update({
      where: { id },
      data: {
        priority: screening.suggested,
        history: {
          create: {
            userId: user.id,
            userName: user.name,
            action: "triagem_aceita",
            message: `A IA sugeriu prioridade ${screening.suggested.toUpperCase()} porque: "${screening.reasoning}". O supervisor acatou a sugestão.`
          }
        }
      }
    });
  } else {
    // Se rejeitar, apenas gera o registro histórico
    await db.followUpCard.update({
      where: { id },
      data: {
        history: {
          create: {
            userId: user.id,
            userName: user.name,
            action: "triagem_rejeitada",
            message: `A IA sugeriu prioridade ${screening.suggested.toUpperCase()} porque: "${screening.reasoning}". O supervisor descartou a sugestão.`
          }
        }
      }
    });
  }

  // Sela a tabela de triagem indicando que foi revisada
  const updated = await db.cardPriorityScreening.update({
    where: { cardId: id },
    data: {
      reviewed: true,
      accepted: data.accepted
    }
  });

  return NextResponse.json(updated);
}
