import { ResetForm } from "../../AuthForms";

export const metadata = { title: "Новый пароль" };

export default async function ResetPage({ params }: PageProps<"/admin/reset/[token]">) {
  const { token } = await params;
  return <ResetForm token={token} />;
}
