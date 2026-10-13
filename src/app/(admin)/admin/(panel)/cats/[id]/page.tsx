import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { t } from "@/lib/i18n/localized";
import { toDateInput } from "@/lib/admin/form";
import { photoUrl } from "@/lib/media-url";
import { aiEnabled } from "@/lib/ai/translate";
import { addInstagramLink, saveCat, saveCatUpdate, updatePhoto, uploadPhotos } from "@/lib/actions/cats";
import { ActionForm } from "@/components/admin/ActionForm";
import { BackLink, Card, Field, Flash, LocalizedField, PageTitle, StateBadge, StateSelect, btnCls, btnSecondaryCls, inputCls } from "@/components/admin/ui";

export const metadata = { title: "Кот" };

const triOptions = [
  ["UNKNOWN", "Неизвестно"],
  ["YES", "Да"],
  ["NO", "Нет"],
];
const testOptions = [
  ["NOT_TESTED", "Не проверяли"],
  ["PENDING", "Ждём результат"],
  ["NEGATIVE", "Отрицательно"],
  ["POSITIVE", "Положительно"],
];

function Select({ name, value, options }: { name: string; value: string; options: string[][] }) {
  return (
    <select name={name} defaultValue={value} className={inputCls}>
      {options.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  );
}

export default async function EditCat({ params, searchParams }: PageProps<"/admin/cats/[id]">) {
  await requireUser(["EDITOR"]);
  const { id } = await params;
  const sp = await searchParams;
  const isNew = id === "new";
  const cat = isNew
    ? null
    : await db.cat.findUnique({
        where: { id },
        include: {
          flags: true,
          curators: { orderBy: { sortOrder: "asc" } },
          bondedWith: { select: { id: true } },
          media: { orderBy: { sortOrder: "asc" } },
          updates: { orderBy: { date: "desc" } },
        },
      });
  if (!isNew && !cat) notFound();

  const [statuses, flags, users, otherCats] = await Promise.all([
    db.catStatus.findMany({ orderBy: { sortOrder: "asc" } }),
    db.catFlag.findMany({ orderBy: { sortOrder: "asc" } }),
    db.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.cat.findMany({ where: { id: { not: cat?.id } }, select: { id: true, name: true }, orderBy: { createdAt: "desc" } }),
  ]);
  const flagIds = new Set(cat?.flags.map((f) => f.flagId));
  const curatorIds = new Set(cat?.curators.map((c) => c.userId));
  const bondedIds = new Set(cat?.bondedWith.map((b) => b.id));
  // New cats are written in Russian only; English and Serbian are machine drafts.
  const textLocales = isNew ? (["ru"] as const) : undefined;
  const auto = cat?.autoTranslated;
  const ai = aiEnabled();

  return (
    <div className="max-w-4xl space-y-6">
      <BackLink href="/admin/cats">Все коты</BackLink>
      <PageTitle
        action={
          cat?.state === "PUBLISHED" ? (
            <a href={`/ru/cats/${cat.slug}`} target="_blank" className={btnSecondaryCls}>
              Открыть на сайте ↗
            </a>
          ) : undefined
        }
      >
        {cat ? t(cat.name, "ru") : "Новый кот"} {cat && <StateBadge state={cat.state} />}
      </PageTitle>
      <Flash searchParams={sp} />

      <ActionForm action={saveCat} className="space-y-6">
        {cat && <input type="hidden" name="id" value={cat.id} />}
        <Card title="Основное">
          <LocalizedField name="name" label="Имя" value={cat?.name} required locales={textLocales} auto={auto} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Статус">
              <select name="statusId" defaultValue={cat?.statusId ?? statuses.find((s) => s.key === "ready")?.id} className={inputCls} required>
                {statuses.map((s) => (
                  <option key={s.id} value={s.id}>
                    {t(s.label, "ru")}
                    {s.isPublic ? "" : " (не публичный)"}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Публикация">
              <StateSelect value={cat?.state} />
            </Field>
          </div>
          <fieldset>
            <legend className="text-sm font-medium">Признаки</legend>
            <div className="mt-2 flex flex-wrap gap-3">
              {flags.map((f) => (
                <label key={f.id} className="flex items-center gap-2 rounded-full bg-milk px-3 py-1.5">
                  <input type="checkbox" name="flags" value={f.id} defaultChecked={flagIds.has(f.id)} />
                  {t(f.label, "ru")}
                </label>
              ))}
            </div>
          </fieldset>
          <LocalizedField name="summary" label="Коротко (для карточки в каталоге)" value={cat?.summary} multiline rows={2} locales={textLocales} auto={auto} />
        </Card>

        <Card title="Данные">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Пол">
              <Select name="sex" value={cat?.sex ?? "UNKNOWN"} options={[["UNKNOWN", "Неизвестно"], ["FEMALE", "Девочка"], ["MALE", "Мальчик"]]} />
            </Field>
            <Field label="Примерная дата рождения" hint="Возраст на сайте считается сам">
              <input type="date" name="birthDate" defaultValue={toDateInput(cat?.birthDate)} className={inputCls} />
            </Field>
            <Field label="Окрас">
              <input name="color" defaultValue={cat?.color ?? ""} className={inputCls} />
            </Field>
            <Field label="Стерилизация">
              <Select name="sterilized" value={cat?.sterilized ?? "UNKNOWN"} options={triOptions} />
            </Field>
            <Field label="Вакцинация">
              <Select name="vaccinated" value={cat?.vaccinated ?? "UNKNOWN"} options={triOptions} />
            </Field>
            <Field label="Чип">
              <Select name="chipped" value={cat?.chipped ?? "UNKNOWN"} options={triOptions} />
            </Field>
            <Field label="FIV">
              <Select name="fiv" value={cat?.fiv ?? "NOT_TESTED"} options={testOptions} />
            </Field>
            <Field label="FeLV">
              <Select name="felv" value={cat?.felv ?? "NOT_TESTED"} options={testOptions} />
            </Field>
            <Field label="Дата, когда попал к нам">
              <input type="date" name="intakeDate" defaultValue={toDateInput(cat?.intakeDate ?? new Date())} className={inputCls} />
            </Field>
            <Field label="Ладит с кошками">
              <Select name="goodWithCats" value={cat?.goodWithCats ?? "UNKNOWN"} options={triOptions} />
            </Field>
            <Field label="Ладит с собаками">
              <Select name="goodWithDogs" value={cat?.goodWithDogs ?? "UNKNOWN"} options={triOptions} />
            </Field>
            <Field label="Ладит с детьми">
              <Select name="goodWithKids" value={cat?.goodWithKids ?? "UNKNOWN"} options={triOptions} />
            </Field>
            <Field label="Дата пристройства" hint="Ставится сама при статусе «Нашёл дом»">
              <input type="date" name="adoptedAt" defaultValue={toDateInput(cat?.adoptedAt)} className={inputCls} />
            </Field>
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="hasSpecialNeeds" defaultChecked={cat?.hasSpecialNeeds} /> Особые потребности
          </label>
        </Card>

        <Card title="Тексты">
          <p className="rounded-lg bg-milk px-3 py-2 text-sm text-ink-soft">
            {!ai
              ? "Пишите по-русски. Автоперевод выключен (AI_ENABLED), поэтому на английской и сербской версиях сайта пока будет русский текст."
              : isNew
                ? "Пишите только по-русски. Английский и сербский переводы появятся после сохранения, их можно будет поправить."
                : "Пустые EN и SR переводятся с русского при сохранении. Пометка «авто» значит машинный перевод: если поменять русский текст, он обновится сам, а исправленный вручную перевод останется как есть."}
          </p>
          <LocalizedField name="story" label="История" value={cat?.story} multiline rows={6} locales={textLocales} auto={auto} />
          <LocalizedField name="character" label="Характер и привычки" value={cat?.character} multiline locales={textLocales} auto={auto} />
          <LocalizedField name="health" label="Здоровье" value={cat?.health} multiline locales={textLocales} auto={auto} />
          <LocalizedField name="specialNeeds" label="Особые потребности (если отмечены)" value={cat?.specialNeeds} multiline rows={2} locales={textLocales} auto={auto} />
          <LocalizedField name="adoptionTerms" label="Условия пристройства" value={cat?.adoptionTerms} multiline rows={3} locales={textLocales} auto={auto} />
          {!isNew && ai && (
            <label className="flex items-center gap-2">
              <input type="checkbox" name="retranslate" /> Перевести EN и SR заново с русского (заменит и ручные правки)
            </label>
          )}
        </Card>

        <Card title="Кураторы и связи">
          <fieldset>
            <legend className="text-sm font-medium">Кураторы (их контакты видны на странице кота)</legend>
            <div className="mt-2 flex flex-wrap gap-3">
              {users.map((u) => (
                <label key={u.id} className="flex items-center gap-2 rounded-full bg-milk px-3 py-1.5">
                  <input type="checkbox" name="curators" value={u.id} defaultChecked={curatorIds.has(u.id)} />
                  {u.name}
                </label>
              ))}
            </div>
          </fieldset>
          {otherCats.length > 0 && (
            <fieldset>
              <legend className="text-sm font-medium">Пристраивается вместе с</legend>
              <div className="mt-2 flex max-h-48 flex-wrap gap-3 overflow-y-auto">
                {otherCats.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 rounded-full bg-milk px-3 py-1.5">
                    <input type="checkbox" name="bonded" value={c.id} defaultChecked={bondedIds.has(c.id)} />
                    {t(c.name, "ru")}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
        </Card>

        <Card title="Порядок и учёт">
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="flex items-center gap-2">
              <input type="checkbox" name="isPinned" defaultChecked={cat?.isPinned} /> Закрепить в начале каталога
            </label>
            <Field label="Ручной приоритет" hint="Больше = выше в каталоге">
              <input type="number" name="manualPriority" defaultValue={cat?.manualPriority ?? 0} className={inputCls} />
            </Field>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="countInStats" defaultChecked={cat?.countInStats ?? true} /> Учитывать в счётчиках
            </label>
          </div>
          <Field label="Адрес страницы" hint="Латиницей; пусто = из имени">
            <input name="slug" defaultValue={cat?.slug ?? ""} className={inputCls} pattern="[a-z0-9-]*" />
          </Field>
        </Card>

        <div className="sticky bottom-0 -mx-4 border-t border-line bg-milk/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:p-0">
          <button className={btnCls}>{isNew ? "Создать" : "Сохранить"}</button>
          {ai && <span className="ml-3 text-sm text-ink-soft">С переводом сохранение занимает до минуты.</span>}
        </div>
      </ActionForm>

      {cat && (
        <section id="photos" className="scroll-mt-20">
          <Card title="Фото и видео">
            <form action={uploadPhotos} className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="catId" value={cat.id} />
              <Field label="Добавить фото (JPEG, PNG, WebP, HEIC до 25 МБ)">
                <input type="file" name="photos" accept="image/*" multiple required className="mt-1 block" />
              </Field>
              <button className={btnCls}>Загрузить</button>
            </form>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {cat.media
                .filter((m) => m.kind === "PHOTO" && m.storageKey)
                .map((m) => (
                  <li key={m.id} className={`rounded-xl bg-milk p-2 ${m.isHidden ? "opacity-50" : ""}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photoUrl(m.storageKey!, 480)} alt="" className="aspect-[4/3] w-full rounded-lg object-cover" />
                    <p className="mt-1 text-xs font-semibold">
                      {cat.coverId === m.id ? "Обложка" : m.isHidden ? "Скрыто" : " "}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {(
                        [
                          ["cover", "Обложка"],
                          ["up", "←"],
                          ["down", "→"],
                          [m.isHidden ? "show" : "hide", m.isHidden ? "Показать" : "Скрыть"],
                        ] as const
                      ).map(([op, label]) => (
                        <form key={op} action={updatePhoto}>
                          <input type="hidden" name="id" value={m.id} />
                          <input type="hidden" name="op" value={op} />
                          <button className="rounded-full bg-paper px-2.5 py-1 text-xs ring-1 ring-line hover:bg-line">{label}</button>
                        </form>
                      ))}
                    </div>
                  </li>
                ))}
            </ul>
            <h3 className="pt-2 font-semibold">Видео: ссылки на Instagram</h3>
            <ul className="space-y-1 text-sm">
              {cat.media
                .filter((m) => m.kind === "INSTAGRAM")
                .map((m) => (
                  <li key={m.id} className={`flex items-center gap-2 ${m.isHidden ? "opacity-50" : ""}`}>
                    <a href={m.url!} target="_blank" className="truncate underline">
                      {m.url}
                    </a>
                    <form action={updatePhoto}>
                      <input type="hidden" name="id" value={m.id} />
                      <input type="hidden" name="op" value={m.isHidden ? "show" : "hide"} />
                      <button className="rounded-full bg-paper px-2.5 py-1 text-xs ring-1 ring-line">{m.isHidden ? "Показать" : "Скрыть"}</button>
                    </form>
                  </li>
                ))}
            </ul>
            <form action={addInstagramLink} className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="catId" value={cat.id} />
              <Field label="Ссылка на пост или reels">
                <input name="url" type="url" placeholder="https://www.instagram.com/reel/..." required className={inputCls} />
              </Field>
              <button className={btnSecondaryCls}>Добавить</button>
            </form>
          </Card>
        </section>
      )}

      {cat && (
        <section id="updates" className="scroll-mt-20">
          <Card title="Новости (дневник)">
            <form action={saveCatUpdate} className="space-y-3">
              <input type="hidden" name="catId" value={cat.id} />
              <Field label="Дата">
                <input type="date" name="date" defaultValue={toDateInput(new Date())} className={inputCls} />
              </Field>
              <LocalizedField name="text" label="Текст новости" multiline rows={3} />
              <button className={btnSecondaryCls}>Добавить новость</button>
            </form>
            <ul className="divide-y divide-line">
              {cat.updates.map((u) => (
                <li key={u.id} className="py-3">
                  <details>
                    <summary className="cursor-pointer">
                      <span className="text-sm text-ink-soft">{toDateInput(u.date)}</span> {t(u.text, "ru").slice(0, 120)} <StateBadge state={u.state} />
                    </summary>
                    <form action={saveCatUpdate} className="mt-3 space-y-3">
                      <input type="hidden" name="catId" value={cat.id} />
                      <input type="hidden" name="id" value={u.id} />
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Дата">
                          <input type="date" name="date" defaultValue={toDateInput(u.date)} className={inputCls} />
                        </Field>
                        <Field label="Публикация">
                          <StateSelect value={u.state} />
                        </Field>
                      </div>
                      <LocalizedField name="text" label="Текст" value={u.text} multiline rows={3} />
                      <button className={btnSecondaryCls}>Сохранить</button>
                    </form>
                  </details>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}
    </div>
  );
}
