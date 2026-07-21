// POST /api/auth/change-password
// Body: { newPassword? }  — se vazio, apenas dispensa o aviso (keepDefault)
import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import { AuthService } from "@/services/AuthService"
import { db } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

    const { newPassword } = await req.json()

    const data: any = { mustChangePassword: false }

    if (newPassword) {
      if (newPassword.length < 6) {
        return NextResponse.json({ error: "A senha deve ter pelo menos 6 caracteres" }, { status: 400 })
      }
      data.passwordHash = await AuthService.hashPassword(newPassword)
    }

    await db.user.update({ where: { id: user.id }, data })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Erro interno" }, { status: 500 })
  }
}
