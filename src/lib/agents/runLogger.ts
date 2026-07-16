import { db } from "@/lib/db";
import { subMinutes } from "date-fns";

export async function withAgentRun(
  agentName: string,
  fn: (runId: string) => Promise<{ itemsCount: number; detail?: string }>
) {
  const lockExpirationThreshold = subMinutes(new Date(), 15);
  
  // 1. Checar se já existe uma execução ativa não-expirada
  const existingRunning = await db.agentRun.findFirst({
    where: {
      agent: agentName,
      status: "running",
      startedAt: { gte: lockExpirationThreshold }
    }
  });

  if (existingRunning) {
    throw new Error("LOCK_CONFLICT");
  }

  // 1.1 Limpar locks antigos (stale locks) que ficaram presos por timeouts da plataforma
  await db.agentRun.updateMany({
    where: {
      agent: agentName,
      status: "running",
      startedAt: { lt: lockExpirationThreshold }
    },
    data: {
      status: "error",
      detail: "Execução anterior expirou por timeout (stale lock).",
      finishedAt: new Date(),
    }
  });

  // 2. Registrar início
  const run = await db.agentRun.create({
    data: {
      agent: agentName,
      status: "running",
    }
  });

  try {
    const result = await fn(run.id);
    await db.agentRun.update({
      where: { id: run.id },
      data: {
        status: "success",
        itemsCount: result.itemsCount,
        detail: result.detail,
        finishedAt: new Date()
      }
    });
  } catch (error: any) {
    await db.agentRun.update({
      where: { id: run.id },
      data: {
        status: "error",
        detail: error?.message || String(error),
        finishedAt: new Date()
      }
    });
    throw error;
  }
}
