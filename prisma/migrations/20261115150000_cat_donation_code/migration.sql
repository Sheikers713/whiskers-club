-- Per-cat number for the IPS QR reference ("poziv na broj"). Existing cats are
-- numbered in creation order, new ones get the next number.
ALTER TABLE "Cat" ADD COLUMN "donationCode" SERIAL NOT NULL;

WITH ordered AS (SELECT "id", ROW_NUMBER() OVER (ORDER BY "createdAt", "id") AS n FROM "Cat")
UPDATE "Cat" SET "donationCode" = ordered.n FROM ordered WHERE "Cat"."id" = ordered."id";

SELECT setval(pg_get_serial_sequence('"Cat"', 'donationCode'), GREATEST((SELECT MAX("donationCode") FROM "Cat"), 1), (SELECT COUNT(*) > 0 FROM "Cat"));

CREATE UNIQUE INDEX "Cat_donationCode_key" ON "Cat"("donationCode");
