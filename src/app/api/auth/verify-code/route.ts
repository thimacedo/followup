// POST /api/auth/verify-code
// Body: { userId, code, rememberMe }
// Valida o código e cria a sessão (cookie)
import { NextRequest, NextResponse } from "next/server"
import { setSessionCookie } from "@/lib/session"
import { AuthService } from "@/services/AuthService"

export async function POST(req: NextRequest) {
  try {
    const { userId, code, rememberMe = false } = await req.json()
    
    const result = await AuthService.verifyAccessCode(userId, code)

    await setSessionCookie(result.user.id, rememberMe)

    return NextResponse.json({
      ok: true,
      user: result.user,
    })
  } catch (e: any) {
    console.error(e)
    const status = e.message.includes("incompletos") ? 400
                 : e.message.includes("inválido") || e.message.includes("expirado") ? 401
                 : 500
    return NextResponse.json({ error: e.message || "Erro interno" }, { status })
  }
}
