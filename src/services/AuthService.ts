import { db } from "@/lib/db"
import { generateAccessCode } from "@/lib/helpers"
import { CODE_DURATION_MIN } from "@/lib/constants"
import nodemailer from "nodemailer"
import bcrypt from "bcryptjs"

// 15 minutes throttle for generating a new code
const THROTTLE_MINUTES = 15

export class AuthService {
  /**
   * Request a new access code for the given email.
   * Includes throttling to prevent spam.
   */
  static async requestAccessCode(email: string) {
    if (!email || typeof email !== "string") {
      throw new Error("E-mail é obrigatório")
    }
    const normalizedEmail = email.toLowerCase().trim()
    const user = await db.user.findFirst({ where: { email: normalizedEmail } })
    
    if (!user) {
      throw new Error("E-mail não cadastrado. Solicite seu cadastro ao supervisor ou admin.")
    }
    if (!user.active) {
      throw new Error("Usuário inativo. Procure a liderança.")
    }

    // Check throttling: was a code generated in the last THROTTLE_MINUTES?
    const throttleDate = new Date(Date.now() - THROTTLE_MINUTES * 60 * 1000)
    const recentCode = await db.accessCode.findFirst({
      where: {
        userId: user.id,
        createdAt: { gte: throttleDate },
        used: false,
      },
      orderBy: { createdAt: "desc" }
    })

    if (recentCode) {
      // If a code was recently generated, return success but DO NOT send a new email.
      // This prevents the user from spamming the email/WhatsApp API.
      return {
        ok: true,
        message: `Um código já foi enviado recentemente. Verifique seu e-mail/WhatsApp. Se não encontrar, aguarde alguns minutos para tentar novamente.`,
        userName: user.name,
        userId: user.id,
        throttled: true,
        devCode: process.env.NODE_ENV !== "production" ? recentCode.code : undefined,
      }
    }

    // Generate new code
    const code = generateAccessCode()
    const expiresAt = new Date(Date.now() + CODE_DURATION_MIN * 60 * 1000)
    
    await db.accessCode.create({
      data: { userId: user.id, code, expiresAt },
    })

    const messageTemplate = `Graça e paz, amado(a) ${user.name.split(' ')[0]}!\n\nQue alegria ter você servindo com a gente. Seu código de acesso ao Sistema de Follow-up é: ${code}\n\nJuntos no propósito de cuidar de vidas. Deus abençoe!`

    let devCode;
    if (process.env.NODE_ENV !== "production") {
      devCode = code;
    }

    if (!process.env.EMAIL_SERVER_HOST) {
      console.log(`\n========================================`)
      console.log(`[DEV MODE] Código de acesso gerado para ${user.email}`)
      console.log(`CÓDIGO: ${code}`)
      console.log(messageTemplate)
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

      try {
        await transporter.sendMail({
          from: process.env.EMAIL_FROM,
          to: user.email!,
          subject: "Seu Código de Acesso - CCVideira",
          text: messageTemplate,
        })
      } catch (err) {
        console.error("Erro ao enviar email:", err)
        if (process.env.NODE_ENV === "production") {
          throw new Error("Erro ao disparar o e-mail. Tente novamente.")
        }
      }
    }

    return {
      ok: true,
      message: `Código gerado. Verifique seu e-mail para receber o código.`,
      userName: user.name,
      userId: user.id,
      throttled: false,
      devCode,
    }
  }

  /**
   * Verify the provided access code.
   */
  static async verifyAccessCode(userId: string, code: string) {
    if (!userId || !code) {
      throw new Error("Dados incompletos")
    }

    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user || !user.active) {
      throw new Error("Usuário inválido")
    }

    // Get the most recent unused, unexpired code
    const accessCode = await db.accessCode.findFirst({
      where: {
        userId: user.id,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    })

    if (!accessCode) {
      throw new Error("Nenhum código ativo encontrado")
    }

    if (accessCode.code !== code.trim()) {
      const attempts = (accessCode.attempts || 0) + 1
      if (attempts >= 5) {
        await db.accessCode.update({
          where: { id: accessCode.id },
          data: { used: true, attempts },
        })
        throw new Error("Limite de tentativas excedido. Solicite um novo código.")
      } else {
        await db.accessCode.update({
          where: { id: accessCode.id },
          data: { attempts },
        })
        throw new Error("Código inválido")
      }
    }

    await db.accessCode.update({
      where: { id: accessCode.id },
      data: { used: true, consumedAt: new Date() },
    })

    return {
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        phone: user.phone,
        email: user.email,
      }
    }
  }
  /**
   * Simple login: accepts email or phone + password.
   */
  static async login(login: string, password: string) {
    if (!login || !password) {
      throw new Error("Login e senha são obrigatórios")
    }

    const normalized = login.toLowerCase().trim()
    // Tenta por e-mail, depois por telefone
    const user = await db.user.findFirst({
      where: {
        OR: [
          { email: normalized },
          { phone: normalized },
          { phone: login.trim() }, // aceita formato bruto
        ],
      },
    })

    if (!user || !user.active) {
      throw new Error("Usuário não encontrado ou inativo")
    }

    if (!user.passwordHash) {
      throw new Error("Senha não definida. Solicite ao administrador.")
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      throw new Error("Senha inválida")
    }

    return {
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        phone: user.phone,
        email: user.email,
        mustChangePassword: user.mustChangePassword,
      },
    }
  }

  /** Hash de senha para persistir no banco. */
  static async hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, 10)
  }
}
