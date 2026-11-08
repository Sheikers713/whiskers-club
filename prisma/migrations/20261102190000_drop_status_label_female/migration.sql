-- Feminine status names now live in code (src/lib/i18n/localized.ts), not in the
-- database, so the per-status column added just before is dropped again.
ALTER TABLE "CatStatus" DROP COLUMN "labelFemale";
