-- Onboarding grants the role and nothing else, so a request no longer names a
-- reviewing manager. The project it mentions is a preference, renamed to say so.
DROP INDEX "access_requests_managerId_status_idx";
DROP INDEX "access_requests_projectId_status_idx";

ALTER TABLE "access_requests" DROP CONSTRAINT "access_requests_managerId_fkey";
ALTER TABLE "access_requests" DROP COLUMN "managerId";

ALTER TABLE "access_requests" RENAME CONSTRAINT "access_requests_projectId_fkey" TO "access_requests_preferredProjectId_fkey";
ALTER TABLE "access_requests" RENAME COLUMN "projectId" TO "preferredProjectId";

CREATE INDEX "access_requests_preferredProjectId_status_idx" ON "access_requests"("preferredProjectId", "status");
