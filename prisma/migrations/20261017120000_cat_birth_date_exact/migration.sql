-- Existing birth dates were typed as exact dates.
ALTER TABLE "Cat" ADD COLUMN "birthDateExact" BOOLEAN NOT NULL DEFAULT false;
UPDATE "Cat" SET "birthDateExact" = true WHERE "birthDate" IS NOT NULL;
