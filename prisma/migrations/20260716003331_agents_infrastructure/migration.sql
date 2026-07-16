-- CreateTable
CREATE TABLE "agent_runs" (
    "id" TEXT NOT NULL,
    "agent" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'success',
    "detail" TEXT,
    "itemsCount" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),

    CONSTRAINT "agent_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "card_alerts" (
    "id" TEXT NOT NULL,
    "card_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "card_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "card_approach_drafts" (
    "id" TEXT NOT NULL,
    "card_id" TEXT NOT NULL,
    "draftText" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dismissed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "card_approach_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "card_priority_screenings" (
    "id" TEXT NOT NULL,
    "card_id" TEXT NOT NULL,
    "suggested" "Priority" NOT NULL,
    "reasoning" TEXT NOT NULL,
    "reviewed" BOOLEAN NOT NULL DEFAULT false,
    "accepted" BOOLEAN,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "card_priority_screenings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "card_history_summaries" (
    "id" TEXT NOT NULL,
    "card_id" TEXT NOT NULL,
    "summaryText" TEXT NOT NULL,
    "throughCount" INTEGER NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "card_history_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agent_runs_agent_started_at_idx" ON "agent_runs"("agent", "started_at");

-- CreateIndex
CREATE INDEX "card_alerts_card_id_type_idx" ON "card_alerts"("card_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "card_approach_drafts_card_id_key" ON "card_approach_drafts"("card_id");

-- CreateIndex
CREATE UNIQUE INDEX "card_priority_screenings_card_id_key" ON "card_priority_screenings"("card_id");

-- CreateIndex
CREATE UNIQUE INDEX "card_history_summaries_card_id_key" ON "card_history_summaries"("card_id");

-- AddForeignKey
ALTER TABLE "card_alerts" ADD CONSTRAINT "card_alerts_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "follow_up_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_approach_drafts" ADD CONSTRAINT "card_approach_drafts_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "follow_up_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_priority_screenings" ADD CONSTRAINT "card_priority_screenings_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "follow_up_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_history_summaries" ADD CONSTRAINT "card_history_summaries_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "follow_up_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
