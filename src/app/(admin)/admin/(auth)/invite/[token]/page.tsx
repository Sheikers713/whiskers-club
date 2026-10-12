import { db } from "@/lib/db";
import { hashToken } from "@/lib/auth/tokens";
import { InviteForm } from "../../AuthForms";

export const metadata = { title: "Приглашение" };

export default async function InvitePage({ params }: PageProps<"/admin/invite/[token]">) {
  const { token } = await params;
  const invite = await db.invitation.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!invite || invite.acceptedAt || invite.revokedAt || invite.expiresAt < new Date()) {
    return <p>Приглашение недействительно или истекло. Попросите суперадмина прислать новое.</p>;
  }
  return <InviteForm token={token} email={invite.email} name={invite.name} />;
}
