import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSessionUser } from "@/lib/session"
import { ROLES } from "@/lib/constants"
import { normalizePhone } from "@/lib/helpers"

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user || user.role !== ROLES.ADMIN) {
    return NextResponse.json({ error: "Acesso negado. Apenas administradores podem fazer upload massivo." }, { status: 403 })
  }

  try {
    const { users } = await req.json()
    if (!users || !Array.isArray(users)) {
      return NextResponse.json({ error: "Lista de usuários inválida" }, { status: 400 })
    }

    let successCount = 0
    let errors: any[] = []

    for (const [index, row] of users.entries()) {
      try {
        const { name, phone, email, role, gender } = row
        if (!name || !phone) {
          throw new Error("Nome e Telefone são obrigatórios")
        }

        const normalizedPhone = normalizePhone(phone)
        const validRole = Object.values(ROLES).includes(role) ? role : ROLES.VOLUNTARIO

        await db.user.create({
          data: {
            name,
            phone: normalizedPhone,
            email: email || null,
            role: validRole,
            gender: gender || null,
            active: true
          }
        })
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
    console.error("Erro no bulk upload de usuarios:", e)
    return NextResponse.json({ error: "Erro interno no processamento" }, { status: 500 })
  }
}
