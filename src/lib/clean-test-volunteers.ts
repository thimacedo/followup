/**
 * Script: clean-test-volunteers.ts
 * Remove usuários de teste (voluntários) criados para sandbox.
 * Critério: email contém '.test.' ou nome contém 'Test' (case‑insensitive).
 * Executa dentro da mesma base de dados de produção – **use com cautela**.
 */
import { db } from "./db"

async function main() {
  const testUsers = await db.user.findMany({
    where: {
      OR: [
        { email: { contains: ".test.", mode: "insensitive" } },
        { name: { contains: "Test", mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, email: true },
  })

  if (testUsers.length === 0) {
    console.log("✅ Nenhum usuário de teste encontrado.")
    return
  }

  console.log(`🗑️ Deletando ${testUsers.length} usuário(s) de teste:`)
  testUsers.forEach((u) => console.log(` - ${u.id} | ${u.name} | ${u.email}`))

  await db.$transaction(
    testUsers.map((u) =>
      db.user.delete({ where: { id: u.id } })
    )
  )

  console.log("✅ Remoção concluída.")
}

main()
  .catch((e) => {
    console.error("⚠️ Erro ao remover usuários de teste:", e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
