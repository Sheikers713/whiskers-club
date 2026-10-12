# Whiskers Club

Сайт волонтёрского проекта помощи кошкам в Белграде: каталог котов, сборы, формы заявок, финансовый отчёт и админка.

Стек: Next.js 16 (App Router), PostgreSQL 16, Prisma, Tailwind CSS 4. Всё запускается в Docker Compose: сейчас на Mac M1 в офисе, позже тот же набор переедет на облачный сервер без изменений в коде.

## Что внутри

| Сервис | Зачем |
| --- | --- |
| `db` | PostgreSQL, данные в томе `pgdata` |
| `migrate` | При каждом запуске применяет миграции и начальные справочники, потом завершается |
| `app` | Сайт и админка, загруженные файлы в томе `uploads` |
| `tunnel` | Cloudflare Tunnel: сайт доступен из интернета без открытых портов на роутере |
| `backup` | Каждую ночь шифрованный бэкап базы и файлов во внешнее хранилище |
| `restore` | Запускается только вручную, восстанавливает из бэкапа |

Публичная часть: `/ru`, `/en`, `/sr`. Админка: `/admin`. Проверка живости: `/api/health`.

## Первый запуск на Mac

1. Установите [Docker Desktop](https://www.docker.com/products/docker-desktop/) для Apple Silicon.
2. Склонируйте репозиторий и создайте файл настроек:
   ```bash
   git clone git@github.com:<владелец>/whiskers-club.git && cd whiskers-club
   cp .env.example .env.production
   ```
3. Заполните `.env.production` (что значит каждое поле, описано ниже и в самом файле).
4. В Cloudflare Zero Trust создайте туннель (Networks → Tunnels → Create, тип Cloudflared), скопируйте токен в `CLOUDFLARE_TUNNEL_TOKEN` и добавьте Public Hostname: `whiskers.guitarcustom.shop` → `HTTP` → `app:3000`. Для этого домен `guitarcustom.shop` должен обслуживаться DNS Cloudflare.
5. Запустите:
   ```bash
   docker compose --env-file .env.production -p whiskers up -d --build
   ```
6. Откройте `https://whiskers.guitarcustom.shop/admin` и войдите как `ADMIN_EMAIL` / `ADMIN_PASSWORD`. Остальных админов приглашайте из раздела «Пользователи».

### Staging

Тот же файл, другой проект и другие настройки. У staging своя база, свои файлы, свой туннель и свой каталог бэкапов.

```bash
cp .env.example .env.staging   # APP_URL=https://whiskers-staging.guitarcustom.shop, APP_PORT=3001,
                               # свой POSTGRES_PASSWORD, свой туннель, RESTIC_REPOSITORY=.../staging
docker compose --env-file .env.staging -p whiskers-staging up -d --build
```

### Чтобы Mac работал сам после перезагрузки

- Docker Desktop → Settings → General → включите «Start Docker Desktop when you sign in».
- Системные настройки → Пользователи и группы → автоматический вход для пользователя, под которым работает Docker.
- Не давать засыпать и включаться после отключения света:
  ```bash
  sudo pmset -a sleep 0 disksleep 0 autorestart 1
  ```
- У всех сервисов стоит `restart: unless-stopped`, поэтому после старта Docker они поднимутся сами.

## Переменные окружения

| Переменная | Обязательна | Что это |
| --- | --- | --- |
| `APP_URL` | да | Адрес сайта без `/` на конце, нужен для ссылок в письмах |
| `APP_PORT` | нет | Порт на самом Mac (по умолчанию 3000), снаружи не виден |
| `ALLOW_INDEXING` | нет | `true` только на постоянном домене. Пока `false`, сайт закрыт от поисковиков |
| `POSTGRES_PASSWORD` | да | Пароль базы, любая длинная случайная строка (`openssl rand -hex 24`) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` | при первом запуске | Первый суперадмин. Создаётся, только если такого email ещё нет |
| `RESEND_API_KEY`, `MAIL_FROM` | нет | Отправка писем с приглашениями и сбросом пароля через [Resend](https://resend.com). Без них ссылка пишется в лог `app`, а приглашение всё равно можно скопировать в админке |
| `TELEGRAM_BOT_TOKEN` | нет | Токен бота от @BotFather для уведомлений админам |
| `CLOUDFLARE_TUNNEL_TOKEN` | да | Токен туннеля Cloudflare |
| `RESTIC_REPOSITORY`, `RESTIC_PASSWORD` | да | Куда складывать бэкапы и пароль шифрования |
| `BACKUP_ACCESS_KEY_ID`, `BACKUP_SECRET_ACCESS_KEY` | для S3/B2 | Ключи доступа к хранилищу бэкапов |
| `BACKUP_HOUR` | нет | Час ночного бэкапа по Белграду (по умолчанию 3) |
| `DISK_WARN_PERCENT` | нет | При каком заполнении диска предупреждать (по умолчанию 85%) |
| `AI_ENABLED`, `OLLAMA_URL` | нет | Для второй волны (ИИ). Ollama ставится прямо на Mac, не в Docker |

## Уведомления в Telegram

1. Создайте бота у @BotFather и впишите токен в `TELEGRAM_BOT_TOKEN`.
2. Каждый админ пишет боту любое сообщение.
3. Узнать свой chat id: откройте `https://api.telegram.org/bot<ТОКЕН>/getUpdates` и найдите `"chat":{"id":...}`. Либо напишите @userinfobot.
4. Админ вписывает это число в админке: «Профиль» → «Telegram chat id для уведомлений».

Бот только присылает уведомления о новых заявках. Вход в админку всегда по email и паролю.

## Бэкапы

- Каждую ночь в `BACKUP_HOUR` сервис `backup` делает дамп базы и копию загруженных файлов через [restic](https://restic.net). Всё шифруется паролем `RESTIC_PASSWORD` ещё до отправки.
- Хранятся 14 ежедневных, 8 еженедельных и 12 ежемесячных копий.
- Результат каждого бэкапа и предупреждение о заполненном диске появляются в блоке «Системные события» на главной админки у суперадмина.
- Хранилище: подойдёт Backblaze B2 (первые 10 ГБ бесплатно). Создайте bucket и Application Key, затем:
  ```
  RESTIC_REPOSITORY=s3:https://s3.<регион>.backblazeb2.com/<bucket>/production
  BACKUP_ACCESS_KEY_ID=<keyID>
  BACKUP_SECRET_ACCESS_KEY=<applicationKey>
  ```
- **Сохраните `RESTIC_PASSWORD` в менеджере паролей.** Без него бэкапы не прочитать.

Сделать бэкап прямо сейчас и посмотреть список копий:

```bash
docker compose --env-file .env.production -p whiskers exec backup backup.sh
docker compose --env-file .env.production -p whiskers exec backup restic snapshots
```

### Восстановление из бэкапа

```bash
docker compose --env-file .env.production -p whiskers stop app tunnel
docker compose --env-file .env.production -p whiskers --profile restore run --rm restore           # последняя копия
docker compose --env-file .env.production -p whiskers --profile restore run --rm restore 0a453cda  # конкретная копия
docker compose --env-file .env.production -p whiskers up -d
```

Восстановление заменяет текущую базу и файлы содержимым копии.

## Обновление

```bash
git pull
docker compose --env-file .env.production -p whiskers up -d --build
```

Миграции базы применятся сами при старте. Обновлять лучше сначала staging, потом production.

## Переезд на облачный сервер

1. Сделайте свежий бэкап на Mac (`exec backup backup.sh`).
2. На сервере поставьте Docker, склонируйте репозиторий, перенесите `.env.production` с тем же `RESTIC_REPOSITORY` и `RESTIC_PASSWORD`.
3. Запустите `up -d --build`, остановите `app tunnel`, выполните восстановление, снова `up -d`.
4. Переключите Public Hostname туннеля или DNS на новый сервер и остановите проект на Mac.

## Разработка

Нужны Node.js 22 и локальный PostgreSQL 16.

```bash
npm install
cp .env.example .env    # DATABASE_URL=postgresql://whiskers:whiskers@localhost:5432/whiskers
                        # STORAGE_DIR=./data/uploads, APP_URL=http://localhost:3000
npx prisma migrate dev  # создаёт таблицы и запускает seed
npm run dev
```

Проверки: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.

Тексты интерфейса лежат в `src/lib/i18n/dictionaries/` (en, ru, sr). Тексты из базы хранятся как `{ "en": "...", "ru": "...", "sr": "..." }` и показываются по цепочке: выбранный язык → английский → язык оригинала.

Цвета и шрифты задаются токенами в `src/app/globals.css` (`@theme`). Когда будет брендбук, менять нужно в первую очередь там.
