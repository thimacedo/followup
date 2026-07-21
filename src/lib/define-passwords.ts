/**
 * Script: define-passwords.ts
 * Define senhas padrão para todos os usuários sem passwordHash.
 * Senha padrão: primeiros 6 dígitos do telefone + "@" + primeiro nome em minúsculas.
 * Exemplo: telefone 5584999887766, nome "José Silva" → "558499@jose"
 *
 * Uso: npx tsx src/lib/define-passwords.ts
 */
import { db } from "./db"
import { AuthService } from "@/services/AuthService"

async function main() {
  const users = await db.user.findMany({
    where: { passwordHash: null },
    orderBy: { name: "asc" },
  })

  if (users.length === 0) {
    console.log("✅ Todos os usuários já possuem senha definida.")
    return
  }

  console.log(`\n🔑 Definindo senhas para ${users.length} usuário(s)...\n`)
  console.log(
    "┌─────────────────────────────────────┬─────────────────────┬──────────────────┐"
  )
  console.log(
    "│ Nome                                │ E-mail / Telefone   │ Senha gerada     │"
  )
  console.log(
    "├─────────────────────────────────────┼─────────────────────┼──────────────────┤"
  )

  for (const user of users) {
    const firstName = user.name.split(" ")[0].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    const phonePrefix = user.phone.slice(0, 6)
    const password = `${phonePrefix}@${firstName}`

    await db.user.update({
      where: { id: user.id },
      data: { passwordHash: await AuthService.hashPassword(password) },
    })

    const login = user.email || user.phone
    const namePad = user.name.slice(0, 35).padEnd(35)
    const loginPad = login.slice(0, 19).padEnd(19)
    const passPad = password.padEnd(16)

    console.log(`│ ${namePad} │ ${loginPad} │ ${passPad} │`)
  }

  console.log(
    "└─────────────────────────────────────┴─────────────────────┴──────────────────┘"
  )
  console.log(
    "\n⚠️  Guarde essas senhas com segurança. Elas devem ser trocadas pelos usuários na próxima oportunidade.\n"
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
