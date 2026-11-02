-- Feminine status names for female cats ("Готова к пристройству", "Нашла дом").
ALTER TABLE "CatStatus" ADD COLUMN "labelFemale" JSONB NOT NULL DEFAULT '{}';

-- Fill the two seeded statuses that change with gender, only while their
-- Russian name is still the seeded one (an admin rename keeps the plain label).
UPDATE "CatStatus" SET "labelFemale" = '{"ru": "Готова к пристройству", "sr": "Spremna za udomljavanje"}'
WHERE "key" = 'ready' AND "label"->>'ru' = 'Готов к пристройству';

UPDATE "CatStatus" SET "labelFemale" = '{"ru": "Нашла дом", "sr": "Udomljena"}'
WHERE "key" = 'adopted' AND "label"->>'ru' = 'Нашёл дом';
