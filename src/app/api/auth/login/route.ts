// POST /api/auth/login
// Body: { login, password, rememberMe }
// login = e-mail ou telefone
import { NextRequest, NextResponse } from "next/server"
import { AuthService } from "@/services/AuthService"
import { setSessionCookie } from "@/lib/session"
import { checkRateLimit, getClientIp } from "@/lib/rateLimit"

export async function POST(req: NextRequest) {
  try {
    const { login, password, rememberMe = false } = await req.json()
    // Rate limiting per IP + login identifier
    const ip = getClientIp(req)
    const limitKey = `login:${ip}:${login}`
    const limitResult = checkRateLimit(limitKey, 5, 15 * 60) // 5 attempts per 15 minutes
    if (!limitResult.allowed) {
      return NextResponse.json({ error: "Too many login attempts. Try again later." }, { status: 429 })
    }
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
