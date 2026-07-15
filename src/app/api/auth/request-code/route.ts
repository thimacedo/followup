import { NextRequest, NextResponse } from "next/server"
import { AuthService } from "@/services/AuthService"

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    const result = await AuthService.requestAccessCode(email)
    return NextResponse.json(result)
  } catch (e: any) {
    console.error(e)
    const status = e.message.includes("obrigatório") ? 400 
                 : e.message.includes("não cadastrado") ? 404 
                 : e.message.includes("inativo") ? 403 
                 : 500
    return NextResponse.json({ error: e.message || "Erro interno" }, { status })
  }
}