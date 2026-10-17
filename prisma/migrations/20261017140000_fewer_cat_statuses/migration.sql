-- Fewer cat statuses: urgent, reserved, quarantine and foster are gone.
-- Their meaning is kept where a flag exists ("Срочно", "На передержке").
INSERT INTO "CatFlagOnCat" ("catId", "flagId")
SELECT c."id", f."id"
FROM "Cat" c
JOIN "CatStatus" s ON s."id" = c."statusId"
JOIN "CatFlag" f ON (s."key" = 'urgent' AND f."key" = 'urgent') OR (s."key" = 'foster' AND f."key" = 'foster')
ON CONFLICT DO NOTHING;

UPDATE "Cat" SET "statusId" = (SELECT "id" FROM "CatStatus" WHERE "key" = 'treatment')
WHERE "statusId" IN (SELECT "id" FROM "CatStatus" WHERE "key" IN ('urgent', 'quarantine'))
  AND EXISTS (SELECT 1 FROM "CatStatus" WHERE "key" = 'treatment');

UPDATE "Cat" SET "statusId" = (SELECT "id" FROM "CatStatus" WHERE "key" = 'ready')
WHERE "statusId" IN (SELECT "id" FROM "CatStatus" WHERE "key" IN ('reserved', 'foster'))
  AND EXISTS (SELECT 1 FROM "CatStatus" WHERE "key" = 'ready');

DELETE FROM "CatStatus"
WHERE "key" IN ('urgent', 'reserved', 'quarantine', 'foster')
  AND NOT EXISTS (SELECT 1 FROM "Cat" WHERE "Cat"."statusId" = "CatStatus"."id");

UPDATE "CatalogFilter" SET "statusKeys" = ARRAY['treatment'] WHERE "key" = 'treatment';
