import { requireUser } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings";
import { PageTitle } from "@/components/admin/ui";
import { ThemeEditor } from "@/components/admin/ThemeEditor";

export const metadata = { title: "Оформление" };

export default async function Design() {
  await requireUser(["SUPERADMIN"]);
  const { theme } = await getSettings();
  return (
    <div className="space-y-4">
      <PageTitle>Оформление сайта</PageTitle>
      <p className="max-w-3xl text-ink-soft">
        Цвета, шрифты, скругления и фон публичного сайта. Справа живое превью: изменения видны сразу, но на сайт попадают только
        после «Сохранить на сайт». Админка остаётся в стандартных цветах.
      </p>
      <ThemeEditor saved={theme} />
    </div>
  );
}
