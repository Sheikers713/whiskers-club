-- Нами и Жук: новая точка отсчёта 10 918 RSD, расходы Нами убраны, Жук = таблица «жук перерасчет.xlsx» + половина общего панакура.
-- Запуск: docker compose exec -T db psql -U whiskers -d whiskers -v ON_ERROR_STOP=1 < apply.sql
-- Всё в одной транзакции: если хоть одна проверка не сойдётся, ничего не изменится.
BEGIN;
CREATE TEMP TABLE cats AS SELECT slug, id FROM "Cat" WHERE slug IN ('nami','mr-beetle');
DO $$ BEGIN IF (SELECT count(*) FROM cats) <> 2 THEN RAISE EXCEPTION 'нет кота nami или mr-beetle'; END IF; END $$;

-- 1. Точка отсчёта: 10 918 RSD на 01.09.2026 (в коде тоже зафиксировано, админка её больше не меняет).
INSERT INTO "SiteSetting" (key, value, "updatedAt") VALUES ('openingBalance', '{"amountRsd":10918,"date":"2026-09-01"}', now())
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, "updatedAt" = now();

-- 2. Нами: все её расходы убираем. Расход только на Нами удаляется, общий расход теряет только Нами.
DO $$
DECLARE r record; nami uuid := (SELECT id FROM cats WHERE slug='nami');
BEGIN
  FOR r IN SELECT e.id, e.date, e."amountRsd", e.description, (SELECT count(*) FROM "ExpenseCat" x WHERE x."expenseId"=e.id) AS n
           FROM "Expense" e JOIN "ExpenseCat" ec ON ec."expenseId"=e.id AND ec."catId"=nami LOOP
    IF r.n = 1 THEN
      DELETE FROM "Expense" WHERE id = r.id;
      RAISE NOTICE 'Нами: удалён расход % % RSD «%»', r.date, r."amountRsd", r.description;
    ELSE
      DELETE FROM "ExpenseCat" WHERE "expenseId"=r.id AND "catId"=nami;
      RAISE NOTICE 'Нами: снята с общего расхода % % RSD «%»', r.date, r."amountRsd", r.description;
    END IF;
  END LOOP;
END $$;

-- 3. Жук: ровно эти расходы, каждый только на Жука.
CREATE TEMP TABLE zhuk_exp (key text, d date, amt int);
INSERT INTO zhuk_exp VALUES
 ('xlsx1:0:E5','2026-09-24',700),('xlsx1:0:E7','2026-09-24',7000),('xlsx1:0:E8','2026-09-25',3000),
 ('xlsx1:0:E9','2026-09-26',5000),('xlsx1:0:E10','2026-09-29',2877),('xlsx1:0:E11','2026-10-02',4499),
 ('xlsx1:0:E12','2026-10-02',1650),('xlsx1:0:E13','2026-10-02',1087),('xlsx1:0:E14','2026-10-02',985),
 ('xlsx1:0:E15','2026-10-02',500),('xlsx1:0:E16','2026-10-03',333),('xlsx1:0:E17','2026-10-09',2020),
 ('xlsx1:0:E18','2026-10-18',786),('xlsx1:0:E19','2026-10-20',755),('xlsx1:0:E20','2026-10-22',7600),
 ('xlsx1:0:E21','2026-10-22',480),('xlsx1:0:E22','2026-10-26',1560),('xlsx1:0:E23','2026-10-31',3000),
 ('xlsx1:0:E24','2026-11-05',5908),('xlsx1:0:E25','2026-11-11',3000);
DO $$ BEGIN
  IF (SELECT count(*) FROM "Expense" e JOIN zhuk_exp z ON z.key=e."importKey") <> 20 THEN
    RAISE EXCEPTION 'в базе нет части расходов Жука: %', (SELECT string_agg(z.key, ', ') FROM zhuk_exp z WHERE NOT EXISTS (SELECT 1 FROM "Expense" e WHERE e."importKey"=z.key));
  END IF;
END $$;
UPDATE "Expense" e SET date=z.d, "amountRsd"=z.amt, state='PUBLISHED', "updatedAt"=now()
FROM zhuk_exp z WHERE e."importKey"=z.key AND (e.date<>z.d OR e."amountRsd"<>z.amt OR e.state<>'PUBLISHED');
DELETE FROM "ExpenseCat" ec USING "Expense" e, zhuk_exp z WHERE ec."expenseId"=e.id AND e."importKey"=z.key;
INSERT INTO "ExpenseCat" ("expenseId","catId") SELECT e.id, (SELECT id FROM cats WHERE slug='mr-beetle') FROM "Expense" e JOIN zhuk_exp z ON z.key=e."importKey";
-- Общий «панакур для Джани и Жука» (1 000) остаётся пополам на Жуке и Жанни.
DELETE FROM "ExpenseCat" ec USING "Expense" e WHERE ec."expenseId"=e.id AND e."importKey"='xlsx1:1:E28';
INSERT INTO "ExpenseCat" ("expenseId","catId") SELECT e.id, c.id FROM "Expense" e, "Cat" c WHERE e."importKey"='xlsx1:1:E28' AND c.slug IN ('mr-beetle','zhanni');
-- Всё остальное с Жука снимаем (записи не из таблицы, если есть).
DO $$
DECLARE r record; zhuk uuid := (SELECT id FROM cats WHERE slug='mr-beetle');
BEGIN
  FOR r IN SELECT e.id, e.date, e."amountRsd", e.description, (SELECT count(*) FROM "ExpenseCat" x WHERE x."expenseId"=e.id) AS n
           FROM "Expense" e JOIN "ExpenseCat" ec ON ec."expenseId"=e.id AND ec."catId"=zhuk
           WHERE e."importKey" IS NULL OR e."importKey" NOT IN (SELECT key FROM zhuk_exp UNION SELECT 'xlsx1:1:E28') LOOP
    DELETE FROM "ExpenseCat" WHERE "expenseId"=r.id AND "catId"=zhuk;
    RAISE NOTICE 'Жук: снят с расхода % % RSD «%» (котов на нём было: %)', r.date, r."amountRsd", r.description, r.n;
  END LOOP;
END $$;

-- 4. Жук: ровно эти донаты. 10 918 «Кристина после Малы» — это точка отсчёта, на Жука не идёт.
INSERT INTO "Donation" (id,date,"amountRsd","donorName","publicName","showName",comment,"internalComment",state,"importKey","createdAt","updatedAt")
VALUES (gen_random_uuid(),'2026-09-30',2500,'возврат глобфела','Возврат за глобфел',true,'Возврат денег за глобфел','Из таблицы «жук перерасчет».','PUBLISHED','zhuk2:D7',now(),now())
ON CONFLICT ("importKey") DO NOTHING;
CREATE TEMP TABLE zhuk_don (key text, d date, amt int);
INSERT INTO zhuk_don VALUES
 ('xlsx1:0:D4','2026-09-19',2000),('xlsx1:0:D5','2026-09-25',7000),('xlsx1:0:D6','2026-09-26',1000),
 ('zhuk2:D7','2026-09-30',2500),('xlsx1:0:D7','2026-09-30',2000),('xlsx1:0:D8','2026-10-02',4828),
 ('xlsx1:0:D9','2026-10-02',3000),('xlsx1:0:D10','2026-10-21',2000),('xlsx1:0:D11','2026-10-21',800),
 ('xlsx1:0:D12','2026-11-03',11902),('xlsx1:0:D13','2026-11-08',3600);
DO $$ BEGIN
  IF (SELECT count(*) FROM "Donation" d JOIN zhuk_don z ON z.key=d."importKey") <> 11 THEN
    RAISE EXCEPTION 'в базе нет части донатов Жука: %', (SELECT string_agg(z.key, ', ') FROM zhuk_don z WHERE NOT EXISTS (SELECT 1 FROM "Donation" d WHERE d."importKey"=z.key));
  END IF;
END $$;
DO $$
DECLARE r record; zhuk uuid := (SELECT id FROM cats WHERE slug='mr-beetle');
BEGIN
  FOR r IN SELECT d.date, d."amountRsd", d."donorName" FROM "Donation" d
           WHERE d."catId"=zhuk AND (d."importKey" IS NULL OR d."importKey" NOT IN (SELECT key FROM zhuk_don)) LOOP
    RAISE NOTICE 'Жук: снят донат % % RSD от «%» (остаётся без кота)', r.date, r."amountRsd", r."donorName";
  END LOOP;
  UPDATE "Donation" SET "catId"=NULL, "updatedAt"=now()
  WHERE "catId"=zhuk AND ("importKey" IS NULL OR "importKey" NOT IN (SELECT key FROM zhuk_don));
END $$;
UPDATE "Donation" d SET "catId"=(SELECT id FROM cats WHERE slug='mr-beetle'), "campaignId"=NULL, date=z.d, "amountRsd"=z.amt, state='PUBLISHED', "updatedAt"=now()
FROM zhuk_don z WHERE d."importKey"=z.key;

-- 5. Проверка: Жук 40 630 − (52 740 + 500 панакур) = −12 610, у Нами расходов нет.
DO $$
DECLARE zhuk uuid := (SELECT id FROM cats WHERE slug='mr-beetle'); nami uuid := (SELECT id FROM cats WHERE slug='nami');
  inc int; exp numeric; nexp int;
BEGIN
  SELECT coalesce(sum("amountRsd"),0) INTO inc FROM "Donation" WHERE "catId"=zhuk AND state='PUBLISHED';
  SELECT coalesce(sum(e."amountRsd"::numeric / (SELECT count(*) FROM "ExpenseCat" x WHERE x."expenseId"=e.id)),0) INTO exp
    FROM "Expense" e JOIN "ExpenseCat" ec ON ec."expenseId"=e.id AND ec."catId"=zhuk WHERE e.state='PUBLISHED';
  SELECT count(*) INTO nexp FROM "ExpenseCat" WHERE "catId"=nami;
  RAISE NOTICE 'Итог Жук: донаты %, расходы %, остаток %. Расходов у Нами: %', inc, exp, inc-exp, nexp;
  IF inc <> 40630 OR exp <> 53240 OR nexp <> 0 THEN RAISE EXCEPTION 'итог не сошёлся, ничего не записано'; END IF;
END $$;
COMMIT;
