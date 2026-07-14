import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { generateAccessCode, normalizePhone } from "@/lib/helpers"
import { CODE_DURATION_MIN } from "@/lib/constants"
import nodemailer from "nodemailer"

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json()
    if (!phone || typeof phone !== "string") {
      return NextResponse.json({ error: "Telefone é obrigatório" }, { status: 400 })
    }
    const normalized = normalizePhone(phone)
    const user = await db.user.findUnique({ where: { phone: normalized } })
    if (!user) {
      return NextResponse.json(
        { error: "Telefone não cadastrado. Solicite seu cadastro ao supervisor ou admin." },
        { status: 404 }
      )
    }
    if (!user.active) {
      return NextResponse.json({ error: "Usuário inativo. Procure a liderança." }, { status: 403 })
    }
    if (!user.email) {
      return NextResponse.json({ error: "Usuário não possui e-mail cadastrado." }, { status: 400 })
    }

    const code = generateAccessCode()
    const expiresAt = new Date(Date.now() + CODE_DURATION_MIN * 60 * 1000)
    await db.accessCode.create({
      data: { userId: user.id, code, expiresAt },
    })

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_SERVER_HOST,
      port: Number(process.env.EMAIL_SERVER_PORT),
      auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD,
      },
    })

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: user.email,
      subject: "Código de acesso",
      text: `Seu código de acesso é: ${code}`,
    })

    return NextResponse.json({
      ok: true,
      message: `Código gerado. Verifique seu e-mail para receber o código.`,
      userName: user.name,
      userId: user.id,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}