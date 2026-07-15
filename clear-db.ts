import { db } from "./src/lib/db"

async function main() {
  console.log("Limpando banco de dados...")
  await db.accessCode.deleteMany()
  await db.cardHistory.deleteMany()
  await db.followUpCard.deleteMany()
  await db.visitor.deleteMany()
  await db.user.deleteMany()
  console.log("Banco limpo. Rodando seed...")
}

main()
  .then(() => import('./src/lib/seed'))
  .catch(console.error)
  .finally(() => db.$disconnect())
