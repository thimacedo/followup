-- CreateEnum
CREATE TYPE "Role" AS ENUM ('recepcao', 'supervisor', 'voluntario', 'admin');

-- CreateEnum
CREATE TYPE "CardStatus" AS ENUM ('novo', 'em_contato', 'aguardando', 'visita_agendada', 'discipulado', 'concluido', 'sem_interesse');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('baixa', 'normal', 'alta');

-- CreateEnum
CREATE TYPE "HistoryAction" AS ENUM ('criado', 'status_alterado', 'nota', 'redistribuido', 'prioridade', 'contato');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "role" "Role" NOT NULL DEFAULT 'voluntario',
    "gender" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_codes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "access_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "min_age" INTEGER,
    "max_age" INTEGER,
    "genders" TEXT,
    "marital_statuses" TEXT,
    "color" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visitors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "age" INTEGER,
    "birth_date" TIMESTAMP(3),
    "gender" TEXT,
    "marital_status" TEXT,
    "address" TEXT,
    "has_children" BOOLEAN NOT NULL DEFAULT false,
    "invited_by" TEXT,
    "prayer_request" TEXT,
    "notes" TEXT,
    "visit_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visitors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follow_up_cards" (
    "id" TEXT NOT NULL,
    "visitor_id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "volunteer_id" TEXT,
    "supervisor_id" TEXT,
    "status" "CardStatus" NOT NULL DEFAULT 'novo',
    "priority" "Priority" NOT NULL DEFAULT 'normal',
    "notes" TEXT,
    "last_contact_at" TIMESTAMP(3),
    "next_action_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "follow_up_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "card_histories" (
    "id" TEXT NOT NULL,
    "card_id" TEXT NOT NULL,
    "user_id" TEXT,
    "user_name" TEXT NOT NULL,
    "action" "HistoryAction" NOT NULL,
    "from_status" "CardStatus",
    "to_status" "CardStatus",
    "message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "card_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mensagens_whatsapp" (
    "id" SERIAL NOT NULL,
    "telefone" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mensagens_whatsapp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_DepartmentToUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DepartmentToUser_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_phone_idx" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "access_codes_code_idx" ON "access_codes"("code");

-- CreateIndex
CREATE INDEX "access_codes_used_idx" ON "access_codes"("used");

-- CreateIndex
CREATE INDEX "access_codes_user_id_idx" ON "access_codes"("user_id");

-- CreateIndex
CREATE INDEX "visitors_phone_idx" ON "visitors"("phone");

-- CreateIndex
CREATE INDEX "visitors_name_idx" ON "visitors"("name");

-- CreateIndex
CREATE INDEX "visitors_visit_date_idx" ON "visitors"("visit_date");

-- CreateIndex
CREATE INDEX "follow_up_cards_status_department_id_idx" ON "follow_up_cards"("status", "department_id");

-- CreateIndex
CREATE INDEX "follow_up_cards_visitor_id_idx" ON "follow_up_cards"("visitor_id");

-- CreateIndex
CREATE INDEX "follow_up_cards_volunteer_id_idx" ON "follow_up_cards"("volunteer_id");

-- CreateIndex
CREATE INDEX "card_histories_card_id_idx" ON "card_histories"("card_id");

-- CreateIndex
CREATE INDEX "_DepartmentToUser_B_index" ON "_DepartmentToUser"("B");

-- AddForeignKey
ALTER TABLE "access_codes" ADD CONSTRAINT "access_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_up_cards" ADD CONSTRAINT "follow_up_cards_visitor_id_fkey" FOREIGN KEY ("visitor_id") REFERENCES "visitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_up_cards" ADD CONSTRAINT "follow_up_cards_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_up_cards" ADD CONSTRAINT "follow_up_cards_volunteer_id_fkey" FOREIGN KEY ("volunteer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_up_cards" ADD CONSTRAINT "follow_up_cards_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_histories" ADD CONSTRAINT "card_histories_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "follow_up_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_histories" ADD CONSTRAINT "card_histories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DepartmentToUser" ADD CONSTRAINT "_DepartmentToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DepartmentToUser" ADD CONSTRAINT "_DepartmentToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
