-- AlterTable
ALTER TABLE "activity_logs" ADD COLUMN     "taskNumber" INTEGER;

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "number" SERIAL NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "tasks_number_key" ON "tasks"("number");

