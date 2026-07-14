import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { generateAccessCode, normalizePhone } from "@/lib/helpers"
import { CODE_DURATION_MIN } from "@/lib/constants"
import nodemailer from "nodemailer"

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "E-mail é obrigatório" }, { status: 400 })
    }
    const normalizedEmail = email.toLowerCase().trim()
    const user = await db.user.findFirst({ where: { email: normalizedEmail } })
    if (!user) {
      return NextResponse.json(
        { error: "E-mail não cadastrado. Solicite seu cadastro ao supervisor ou admin." },
        { status: 404 }
      )
    }
    if (!user.active) {
      return NextResponse.json({ error: "Usuário inativo. Procure a liderança." }, { status: 403 })
    }


    const code = generateAccessCode()
    const expiresAt = new Date(Date.now() + CODE_DURATION_MIN * 60 * 1000)
    await db.accessCode.create({
      data: { userId: user.id, code, expiresAt },
    })

    if (!process.env.EMAIL_SERVER_HOST) {
      console.log(`\n========================================`)
      console.log(`[DEV MODE] Código de acesso gerado para ${user.email}`)
      console.log(`CÓDIGO: ${code}`)
      console.log(`========================================\n`)
    } else {
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
        to: user.email!,
        subject: "Código de acesso",
        text: `Seu código de acesso é: ${code}`,
      })
    }

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