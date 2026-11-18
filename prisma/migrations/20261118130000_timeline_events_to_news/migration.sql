-- The public timeline used to show two entries computed from Cat fields
-- ("card published", "found a home"). They could not be edited or removed.
-- Turn the ones still visible into ordinary cat news, which the admin can edit
-- and delete; from now on the timeline shows only news and donations.

-- "Found a home": only for cats whose current status is in the ADOPTED group.
INSERT INTO "CatUpdate" ("id", "catId", "date", "text", "state", "createdAt")
SELECT gen_random_uuid(), c."id", c."adoptedAt"::timestamp,
       CASE WHEN c."sex" = 'FEMALE'
            THEN '{"ru":"Нашла дом","en":"Found a home","sr":"Našla dom"}'::jsonb
            ELSE '{"ru":"Нашёл дом","en":"Found a home","sr":"Našao dom"}'::jsonb END,
       'PUBLISHED', now()
FROM "Cat" c
JOIN "CatStatus" s ON s."id" = c."statusId"
WHERE c."adoptedAt" IS NOT NULL AND s."group" = 'ADOPTED';

-- A cat that is no longer adopted keeps no adoption date (it was set
-- automatically by a status change that has since been undone).
UPDATE "Cat" c SET "adoptedAt" = NULL
FROM "CatStatus" s
WHERE s."id" = c."statusId" AND s."group" <> 'ADOPTED' AND c."adoptedAt" IS NOT NULL;

-- "Card published": for cats currently on the site.
INSERT INTO "CatUpdate" ("id", "catId", "date", "text", "state", "createdAt")
SELECT gen_random_uuid(), c."id", c."publishedAt",
       '{"ru":"Карточка опубликована","en":"Card published","sr":"Kartica objavljena"}'::jsonb,
       'PUBLISHED', now()
FROM "Cat" c
WHERE c."publishedAt" IS NOT NULL AND c."state" = 'PUBLISHED';
