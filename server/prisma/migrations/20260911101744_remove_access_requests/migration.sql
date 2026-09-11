-- Onboarding is handled by an admin creating the user directly, so the public
-- request flow and its table are gone. The notification enum is rebuilt rather
-- than left carrying values nothing can produce.
DROP TABLE "access_requests";
DROP TYPE "AccessRequestStatus";

DELETE FROM "notifications" WHERE "type" IN ('ACCESS_REQUESTED', 'ACCESS_APPROVED');

ALTER TYPE "NotificationType" RENAME TO "NotificationType_old";
CREATE TYPE "NotificationType" AS ENUM ('TASK_ASSIGNED', 'TASK_IN_REVIEW', 'TASK_OVERDUE');
ALTER TABLE "notifications"
  ALTER COLUMN "type" TYPE "NotificationType" USING "type"::text::"NotificationType";
DROP TYPE "NotificationType_old";
