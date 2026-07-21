/**
 * Script: define-passwords.ts
 * Define (ou redefine) senhas padrão para todos os usuários.
 * Senha padrão: 4 últimos dígitos do telefone + primeiro nome em minúsculas sem espaços e sem acentos.
 * Exemplo: telefone 5584999887766, nome "José Silva" → "7766jose"
 *
 * Uso: npx tsx src/lib/define-passwords.ts
 */
import { db } from "./db"
import { AuthService } from "@/services/AuthService"

async function main() {
  const users = await db.user.findMany({ orderBy: { name: "asc" } })

  if (users.length === 0) {
    console.log("Nenhum usuário encontrado.")
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
    const firstName = user.name
      .split(" ")[0]
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "")

    const phoneSuffix = user.phone.slice(-4)
    const password = `${phoneSuffix}${firstName}`

    await db.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await AuthService.hashPassword(password),
        mustChangePassword: true,
      },
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
    "\n⚠️  Guarde essas senhas com segurança. Devem ser trocadas pelos usuários na próxima oportunidade.\n"
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
