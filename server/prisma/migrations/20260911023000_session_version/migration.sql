-- Revoke already-issued sessions after sensitive credential changes.
ALTER TABLE "User" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;
