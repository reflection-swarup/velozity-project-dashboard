-- Removing somebody from a project is worth an audit trail too.
ALTER TYPE "ActivityType" ADD VALUE 'MEMBER_REMOVED';
