import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { LoginForm } from "../AuthForms";

export const metadata = { title: "Вход" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/admin");
  return <LoginForm />;
}
