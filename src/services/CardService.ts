import { db } from "@/lib/db"
import { ROLES } from "@/lib/constants"

export class CardService {
  /**
   * Verifica se o usuário tem acesso ao card
   */
  static canAccessCard(user: any, card: any): boolean {
    if (user.role === ROLES.ADMIN || user.role === ROLES.SUPERVISOR || user.role === ROLES.RECEPCAO) {
      return true
    }
    if (user.role === ROLES.VOLUNTARIO) {
      const isMyCard = card.volunteerId === user.id
      const isFreeInMyDept = !card.volunteerId && user.departments?.some((d: any) => d.id === card.departmentId)
      return isMyCard || isFreeInMyDept
    }
    return false
  }

  /**
   * Lista cards baseados na permissão do usuário
   */
  static async listCards(user: any, filters: { status?: string; department?: string; search?: string; onlyMine?: boolean }) {
    const { status, department, search, onlyMine } = filters
    
    const userDeptIds = user.departments?.map((d: any) => d.id) || []
    let where: any = {}

    if (user.role === ROLES.VOLUNTARIO) {
      if (onlyMine) {
        where.volunteerId = user.id
      } else {
        where.OR = [
          { volunteerId: user.id },
          { volunteerId: null, departmentId: { in: userDeptIds.length > 0 ? userDeptIds : ["___none___"] } },
        ]
      }
    } else if (user.role === ROLES.SUPERVISOR) {
      if (userDeptIds.length > 0) {
        where.departmentId = { in: userDeptIds }
      }
    }

    if (status) where.status = status
    if (department) where.departmentId = department
    if (search) {
      where.visitor = {
        OR: [
          { name: { contains: search } },
          { phone: { contains: search } },
          { email: { contains: search } },
        ],
      }
    }

    return await db.followUpCard.findMany({
      where,
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      include: {
        visitor: true,
        department: true,
        volunteer: { select: { id: true, name: true, phone: true } },
        supervisor: { select: { id: true, name: true, phone: true } },
        history: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    })
  }

  /**
   * Cria um card manualmente (supervisor ou admin)
   */
  static async createCard(data: any, user: any) {
    if (user.role !== ROLES.SUPERVISOR && user.role !== ROLES.ADMIN && user.role !== ROLES.RECEPCAO) {
      throw new Error("Sem permissão")
    }

    const { visitorId, departmentId, volunteerId, priority, notes } = data

    if (!visitorId || !departmentId) {
      throw new Error("Visitante e departamento são obrigatórios")
    }

    let supervisorId = user.role === ROLES.SUPERVISOR ? user.id : null
    if (!supervisorId) {
      const supervisor = await db.user.findFirst({
        where: {
          role: ROLES.SUPERVISOR,
          active: true,
          departments: {
            some: { id: departmentId },
          },
        },
      })
      supervisorId = supervisor?.id || null
    }

    return await db.followUpCard.create({
      data: {
        visitorId,
        departmentId,
        volunteerId: volunteerId || null,
        supervisorId,
        priority: priority || "normal",
        notes: notes || null,
        status: "novo",
        history: {
          create: {
            userId: user.id,
            userName: user.name,
            action: "criado",
            message: `Card criado manualmente por ${user.name}.`,
          },
        },
      },
    })
  }
}
