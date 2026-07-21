import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendNtfyAlert } from "@/lib/agents/ntfy";
import { withAgentRun } from "@/lib/agents/runLogger";
import { verifyCronSecret } from "@/lib/agents/verifyCronSecret";
import { subDays } from "date-fns";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const isDryRun = url.searchParams.get("dry_run") === "1";
  // Pode reaproveitar pro semanal usando searchParams `?period=weekly` ou rota separada.
  const isWeekly = req.url.includes("weekly-summary");
  const periodDays = isWeekly ? 7 : 1;
  const agentName = isWeekly ? "weekly_summary" : "daily_summary";
  
  try {
    await withAgentRun(agentName, async () => {
      const inicioPeriodo = subDays(new Date(), periodDays);

      const [novos, porStatus, paradosSemAcao] = await Promise.all([
        db.followUpCard.count({ where: { createdAt: { gte: inicioPeriodo } } }),
        db.followUpCard.groupBy({ by: ["status"], _count: true }),
        db.followUpCard.count({
          where: { nextActionAt: { lt: new Date() }, status: { notIn: ["concluido", "sem_interesse"] } },
        }),
      ]);

      const statusCount = porStatus.reduce((acc, curr) => {
        acc[curr.status] = curr._count;
        return acc;
      }, {} as Record<string, number>);

      const msg = `Resumo ${isWeekly ? "semanal" : "diário"} — Follow-up
Novos visitantes: ${novos}
Em contato: ${statusCount.em_contato || 0} | Aguardando: ${statusCount.aguardando || 0} | Agendada: ${statusCount.visita_agendada || 0}
Concluídos (Total Histórico): ${statusCount.concluido || 0}
Cards atrasados: ${paradosSemAcao}`;

      if (!isDryRun) {
        await sendNtfyAlert(`Resumo ${isWeekly ? "Semanal" : "Diário"}`, msg, ["bar_chart"]);
      } else {
        console.log(`[DRY_RUN] Enviaria resumo:\n${msg}`);
      }

      return { itemsCount: novos, detail: isDryRun ? "Execução em DRY_RUN." : undefined };
    });

    return NextResponse.json({ message: "Resumo processado" });
  } catch (error: any) {
    if (error.message === "LOCK_CONFLICT") {
      return NextResponse.json({ error: "Agente já está rodando" }, { status: 409 });
    }
    console.error(`Erro no agente ${agentName}:`, error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
