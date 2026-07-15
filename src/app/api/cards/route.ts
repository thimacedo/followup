// /api/cards
// GET - lista cards de acordo com o papel do usuário
// POST - cria card manualmente
import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import { CardService } from "@/services/CardService"

export async function GET(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const filters = {
    status: searchParams.get("status") || undefined,
    department: searchParams.get("department") || undefined,
    search: searchParams.get("search") || undefined,
    onlyMine: searchParams.get("mine") === "1"
  }

  try {
    const cards = await CardService.listCards(user, filters)
    return NextResponse.json({ cards })
  } catch (e: any) {
    return NextResponse.json({ error: "Erro interno ao buscar cards" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const body = await req.json()

  try {
    const card = await CardService.createCard(body, user)
    return NextResponse.json({ card })
  } catch (e: any) {
    console.error(e)
    const status = e.message === "Sem permissão" ? 403 
                 : e.message.includes("obrigatórios") ? 400 
                 : 500
    return NextResponse.json({ error: e.message || "Erro interno" }, { status })
  }
}
