import { getTranslations } from "next-intl/server";
import { requireAdminUser } from "@/auth/session";
import { listInvites } from "@/lib/db/invites";
import { CreateInvite } from "./create-invite";
import { InviteList } from "./invite-list";

export default async function AdminInvitesPage() {
  await requireAdminUser();
  const t = await getTranslations("admin");
  const invites = await listInvites();

  return (
    <div className="mx-auto max-w-[1080px] space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {t("intro")}
        </p>
      </header>

      <CreateInvite />
      <InviteList invites={invites} />
    </div>
  );
}
