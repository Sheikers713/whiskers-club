-- Receipts are open to every site visitor: all files already attached to
-- expenses become public, and new ones are public unless an admin hides one.
ALTER TABLE "ExpenseFile" ALTER COLUMN "isPublic" SET DEFAULT true;
UPDATE "ExpenseFile" SET "isPublic" = true WHERE "isPublic" = false;
