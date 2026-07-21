// POST /api/auth/login
// Body: { login, password, rememberMe }
// login = e-mail ou telefone
import { NextRequest, NextResponse } from "next/server"
import { AuthService } from "@/services/AuthService"
import { setSessionCookie } from "@/lib/session"

export async function POST(req: NextRequest) {
  try {
    const { login, password, rememberMe = false } = await req.json()
    const result = await AuthService.login(login, password)
    await setSessionCookie(result.user.id, rememberMe)
    return NextResponse.json({ ok: true, user: result.user })
  } catch (e: any) {
    const status = e.message?.includes("obrigatório") ? 400
      : e.message?.includes("inválid") || e.message?.includes("não encontrado") || e.message?.includes("inativo") ? 401
      : 500
    return NextResponse.json({ error: e.message || "Erro interno" }, { status })
  }
}
