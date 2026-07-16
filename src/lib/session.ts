// Sessão - cookie simples + token assinado
import { cookies } from "next/headers"
import { db } from "./db"
import { SESSION_DURATION, SESSION_DURATION_LONG } from "./constants"
import crypto from "crypto"

if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET é obrigatório em produção.")
}
const SESSION_SECRET = process.env.SESSION_SECRET || "ccvideira-followup-secret-dev-key-change"

export function signToken(payload: { userId: string; ts: number }): string {
  const data = `${payload.userId}.${payload.ts}`
  const hmac = crypto.createHmac("sha256", SESSION_SECRET).update(data).digest("hex")
  return `${data}.${hmac}`
}

export function verifyToken(token: string): { userId: string; ts: number } | null {
  try {
    const [userId, tsStr, hmac] = token.split(".")
    if (!userId || !tsStr || !hmac) return null
    const ts = parseInt(tsStr, 10)
    const data = `${userId}.${ts}`
    const expected = crypto.createHmac("sha256", SESSION_SECRET).update(data).digest("hex")
    if (expected !== hmac) return null
    // expiração - aceita ambas durações, a mais longa define o limite final de parse
    if (Date.now() / 1000 - ts > SESSION_DURATION_LONG) return null
    return { userId, ts }
  } catch {
    return null
  }
}

export async function getSessionUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get("ccv_session")?.value
  if (!token) return null
  const payload = verifyToken(token)
  if (!payload) return null
  const user = await db.user.findUnique({
    where: { id: payload.userId },
    include: { departments: true },
  })
  if (!user || !user.active) return null
  return user
}

export async function setSessionCookie(userId: string, rememberMe: boolean = false) {
  const token = signToken({ userId, ts: Math.floor(Date.now() / 1000) })
  const cookieStore = await cookies()
  const maxAge = rememberMe ? SESSION_DURATION_LONG : SESSION_DURATION
  cookieStore.set("ccv_session", token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: maxAge,
    path: "/",
  })
}

export async function clearSessionCookie() {
  const cookieStore = await cookies()
  cookieStore.delete("ccv_session")
}
