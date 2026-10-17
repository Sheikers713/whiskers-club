-- The TNR status is dropped for now; such cats move to Archive (also hidden).
UPDATE "Cat" SET "statusId" = (SELECT "id" FROM "CatStatus" WHERE "key" = 'archive')
WHERE "statusId" IN (SELECT "id" FROM "CatStatus" WHERE "key" = 'tnr')
  AND EXISTS (SELECT 1 FROM "CatStatus" WHERE "key" = 'archive');

DELETE FROM "CatStatus"
WHERE "key" = 'tnr'
  AND NOT EXISTS (SELECT 1 FROM "Cat" WHERE "Cat"."statusId" = "CatStatus"."id");
