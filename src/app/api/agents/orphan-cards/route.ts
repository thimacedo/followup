import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendNtfyAlert } from "@/lib/agents/ntfy";
import { withAgentRun } from "@/lib/agents/runLogger";
import { subHours } from "date-fns";
import { verifyCronSecret } from "@/lib/agents/verifyCronSecret";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // 60 segundos na Vercel (limite pro) ou 10s no Hobby

export async function POST(req: Request) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const isDryRun = url.searchParams.get("dry_run") === "1";

  try {
    let itemsProcessed = 0;
    
    await withAgentRun("orphan_card", async (runId) => {
      const orphans = await db.followUpCard.findMany({
        where: {
          volunteerId: null,
          status: { notIn: ["concluido", "sem_interesse"] },
          createdAt: { lte: subHours(new Date(), 24) },
        },
        include: { visitor: true, department: true },
      });

      for (const card of orphans) {
        const hoursPassed = (new Date().getTime() - card.createdAt.getTime()) / (1000 * 60 * 60);
        const type = hoursPassed >= 48 ? "orphan_48h" : "orphan_24h";

        const existingAlert = await db.cardAlert.findFirst({
          where: { cardId: card.id, type }
        });

        if (!existingAlert) {
          itemsProcessed++;
          
          const alertMsg = `O visitante ${card.visitor.name} (${card.department.name}) está aguardando um voluntário há mais de ${type === "orphan_48h" ? 48 : 24} horas!`;
          const tag = type === "orphan_48h" ? "rotating_light" : "warning";
          
          if (!isDryRun) {
            await db.cardAlert.create({
              data: { cardId: card.id, type }
            });
            await sendNtfyAlert("Alerta: Card Órfão", alertMsg, [tag, "agente"]);
          } else {
            console.log(`[DRY_RUN] Alertaria: ${alertMsg}`);
          }
        }
      }

      return { itemsCount: itemsProcessed, detail: isDryRun ? "Execução em DRY_RUN." : undefined };
    });

    return NextResponse.json({ message: "Processado", items: itemsProcessed });
  } catch (error: any) {
    if (error.message === "LOCK_CONFLICT") {
      return NextResponse.json({ error: "Agente já está rodando" }, { status: 409 });
    }
    console.error("Erro agente orphan-cards:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
