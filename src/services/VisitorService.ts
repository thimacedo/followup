import { db } from "@/lib/db"
import { findMatchingDepartments } from "@/lib/matching"
import { normalizePhone } from "@/lib/helpers"
import { ROLES } from "@/lib/constants"

export class VisitorService {
  /**
   * Lista visitantes filtrados
   */
  static async listVisitors(search: string = "") {
    const where = search
      ? {
          OR: [
            { name: { contains: search } },
            { phone: { contains: search } },
            { email: { contains: search } },
          ],
        }
      : {}

    return await db.visitor.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        cards: {
          select: {
            id: true,
            status: true,
            department: { select: { name: true, color: true } },
          },
        },
      },
    })
  }

  /**
   * Cria visitante e gera cards para os departamentos (matching)
   */
  static async createVisitor(data: any, creatorName: string = "Lounge") {
    const {
      name,
      phone,
      email,
      age,
      birthDate,
      gender,
      maritalStatus,
      address,
      hasChildren,
      invitedBy,
      prayerRequest,
      notes,
      visitDate,
      departmentId,
    } = data

    if (!name || !phone) {
      throw new Error("Nome e telefone são obrigatórios")
    }

    const normalizedPhone = normalizePhone(phone)

    let computedAge = age
    if (!computedAge && birthDate) {
      const bd = new Date(birthDate)
      const diff = Date.now() - bd.getTime()
      computedAge = Math.floor(diff / (365.25 * 24 * 3600 * 1000))
    }

    const visitor = await db.visitor.create({
      data: {
        name,
        phone: normalizedPhone,
        email: email || null,
        age: computedAge ?? null,
        birthDate: birthDate ? new Date(birthDate) : null,
        gender: gender || null,
        maritalStatus: maritalStatus || null,
        address: address || null,
        hasChildren: !!hasChildren,
        invitedBy: invitedBy || null,
        prayerRequest: prayerRequest || null,
        notes: notes || null,
        visitDate: visitDate ? new Date(visitDate) : new Date(),
      },
    })

    let deptsToUse: any[] = []
    if (departmentId) {
      const selectedDept = await db.department.findUnique({ where: { id: departmentId } })
      if (selectedDept) deptsToUse = [selectedDept]
    }

    if (deptsToUse.length === 0) {
      const matching = await findMatchingDepartments({
        age: computedAge,
        gender,
        maritalStatus,
      })
      deptsToUse = matching
      if (deptsToUse.length === 0) {
        const geral = await db.department.findFirst({
          where: { name: { contains: "Geral" } },
        })
        if (geral) deptsToUse = [geral]
      }
    }

    const cardsCreated: any[] = []
    for (const dept of deptsToUse) {
      const existing = await db.followUpCard.findFirst({
        where: { visitorId: visitor.id, departmentId: dept.id },
      })
      if (existing) continue

      const supervisor = await db.user.findFirst({
        where: {
          role: ROLES.SUPERVISOR,
          active: true,
          departments: {
            some: { id: dept.id },
          },
        },
      })

      const card = await db.followUpCard.create({
        data: {
          visitorId: visitor.id,
          departmentId: dept.id,
          supervisorId: supervisor?.id || null,
          status: "novo",
          history: {
            create: {
              userName: creatorName,
              action: "criado",
              message: `Visitante cadastrado pela ${creatorName.toLowerCase()}. Direcionado para ${dept.name}.`,
            },
          },
        },
      })
      cardsCreated.push(card)
    }

    return {
      visitor,
      cardsCreated: cardsCreated.length,
      departments: deptsToUse.map((d) => d.name),
    }
  }
}
