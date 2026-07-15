import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSessionUser } from "@/lib/session"
import { ROLES } from "@/lib/constants"

export async function GET(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  
  // Apenas supervisor ou admin podem acessar relatórios avançados
  if (user.role !== ROLES.SUPERVISOR && user.role !== ROLES.ADMIN) {
    return NextResponse.json({ error: "Sem permissão para gerar relatórios" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const startDate = searchParams.get("startDate")
  const endDate = searchParams.get("endDate")
  const departmentId = searchParams.get("departmentId")
  const status = searchParams.get("status")
  const volunteerId = searchParams.get("volunteerId")

  let where: any = {}

  // Filtro de data de criação do card
  if (startDate || endDate) {
    where.createdAt = {}
    if (startDate) where.createdAt.gte = new Date(startDate)
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      where.createdAt.lte = end
    }
  }

  // Filtro de departamento
  if (departmentId) {
    where.departmentId = departmentId
  } else if (user.role === ROLES.SUPERVISOR) {
    // Se for supervisor e não filtrar departamento específico, restringe aos departamentos dele
    const userDeptIds = (user as any).departments?.map((d: any) => d.id) || []
    if (userDeptIds.length > 0) {
      where.departmentId = { in: userDeptIds }
    }
  }

  // Filtro de status
  if (status) {
    where.status = status
  }

  // Filtro de voluntário
  if (volunteerId) {
    where.volunteerId = volunteerId
  }

  try {
    const cards = await db.followUpCard.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        visitor: {
          select: { name: true, phone: true, visitDate: true, age: true, gender: true }
        },
        department: { select: { name: true } },
        volunteer: { select: { name: true } },
        supervisor: { select: { name: true } },
      },
    })

    return NextResponse.json({ 
      cards,
      generatedAt: new Date(),
      generatedBy: user.name,
    })
  } catch (e: any) {
    console.error(e)
    return NextResponse.json({ error: "Erro interno ao gerar relatório" }, { status: 500 })
  }
}
