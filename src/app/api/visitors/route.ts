// /api/visitors
// GET - lista visitantes (todos)
// POST - cria visitante + gera cards automaticamente para departamentos compatíveis
import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import { VisitorService } from "@/services/VisitorService"

export async function GET(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search") || ""

  try {
    const visitors = await VisitorService.listVisitors(search)
    return NextResponse.json({ visitors })
  } catch (e: any) {
    return NextResponse.json({ error: "Erro ao buscar visitantes" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser() // Opcional, pois o Lounge pode cadastrar sem login
  const body = await req.json()

  try {
    const result = await VisitorService.createVisitor(body, user?.name || "Lounge")
    return NextResponse.json(result)
  } catch (e: any) {
    console.error(e)
    const status = e.message.includes("obrigatórios") ? 400 : 500
    return NextResponse.json({ error: e.message || "Erro interno" }, { status })
  }
}
