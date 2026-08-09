-- Account suspension for users.
--
-- The admin suspend/unsuspend endpoints previously wrote an audit record
-- claiming success without changing any state, because these columns did not
-- exist. Both are nullable, so this is additive and safe on a populated table.

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "suspendedAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN     "suspendedBy" TEXT;
