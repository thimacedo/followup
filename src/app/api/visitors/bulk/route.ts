import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import { ROLES } from "@/lib/constants"
import { VisitorService } from "@/services/VisitorService"

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user || user.role !== ROLES.ADMIN) {
    return NextResponse.json({ error: "Acesso negado. Apenas administradores podem fazer upload massivo." }, { status: 403 })
  }

  try {
    const { visitors } = await req.json()
    if (!visitors || !Array.isArray(visitors)) {
      return NextResponse.json({ error: "Lista de visitantes inválida" }, { status: 400 })
    }

    let successCount = 0
    let errors: any[] = []

    for (const [index, row] of visitors.entries()) {
      try {
        const { name, phone } = row
        if (!name || !phone) {
          throw new Error("Nome e Telefone são obrigatórios")
        }

        // Utiliza o serviço já criado para manter as regras de negócio de matching e cards
        await VisitorService.createVisitor(row, user.name)
        successCount++
      } catch (err: any) {
        errors.push({ linha: index + 1, nome: row.name, erro: err.message })
      }
    }

    return NextResponse.json({
      ok: true,
      successCount,
      errorCount: errors.length,
      errors
    })
  } catch (e: any) {
    console.error("Erro no bulk upload de visitantes:", e)
    return NextResponse.json({ error: "Erro interno no processamento" }, { status: 500 })
  }
}
