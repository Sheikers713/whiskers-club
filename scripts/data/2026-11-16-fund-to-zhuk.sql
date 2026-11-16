-- Свободный фонд (начальный остаток 10 918) целиком Жуку с 01.10.2026. Фонд становится 0.
-- Применять ПОСЛЕ выкладки кода, где OPENING_BALANCE = 0.
-- Запуск: docker compose ... exec -T db psql -U whiskers -d whiskers -v ON_ERROR_STOP=1 < этот файл
BEGIN;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM "Cat" WHERE slug='mr-beetle') THEN RAISE EXCEPTION 'нет кота mr-beetle'; END IF; END $$;
-- В фонде не должно быть ничего, кроме начального остатка.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "Donation" WHERE "catId" IS NULL AND state='PUBLISHED')
  OR EXISTS (SELECT 1 FROM "Expense" e WHERE e.state='PUBLISHED' AND NOT EXISTS (SELECT 1 FROM "ExpenseCat" ec WHERE ec."expenseId"=e.id))
  THEN RAISE EXCEPTION 'в фонде есть донаты или расходы без кота, сумма уже не 10 918'; END IF;
END $$;
INSERT INTO "SiteSetting" (key, value, "updatedAt") VALUES ('openingBalance', '{"amountRsd":0,"date":"2026-09-01"}', now())
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, "updatedAt" = now();
INSERT INTO "Donation" (id,date,"amountRsd","donorName","publicName","showName",comment,"internalComment",state,"catId","importKey","createdAt","updatedAt")
SELECT gen_random_uuid(),'2026-10-01',10918,'Кристина после Малы','Кристина (после Малы)',true,'Начальный остаток фонда Whiskers Club, переданный Жуку','Был начальным остатком фонда на 01.09.2026, 16.11.2026 перенесён на Жука.','PUBLISHED',c.id,'zhuk2:D3',now(),now()
FROM "Cat" c WHERE c.slug='mr-beetle'
ON CONFLICT ("importKey") DO NOTHING;
DO $$
DECLARE zhuk uuid := (SELECT id FROM "Cat" WHERE slug='mr-beetle'); inc int; exp numeric;
BEGIN
  SELECT coalesce(sum("amountRsd"),0) INTO inc FROM "Donation" WHERE "catId"=zhuk AND state='PUBLISHED';
  SELECT coalesce(sum(e."amountRsd"::numeric / (SELECT count(*) FROM "ExpenseCat" x WHERE x."expenseId"=e.id)),0) INTO exp
    FROM "Expense" e JOIN "ExpenseCat" ec ON ec."expenseId"=e.id AND ec."catId"=zhuk WHERE e.state='PUBLISHED';
  RAISE NOTICE 'Итог Жук: донаты %, расходы %, остаток %', inc, round(exp), round(inc-exp);
  IF inc <> 51548 OR exp <> 53240 THEN RAISE EXCEPTION 'итог не сошёлся, ничего не записано'; END IF;
END $$;
COMMIT;
