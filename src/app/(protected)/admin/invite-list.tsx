"use client";

import { useLocale, useTranslations } from "next-intl";
import { revokeInvite } from "@/actions/invites";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  type InviteRecord,
  type InviteStatus,
  inviteStatus,
  shortInviteId,
} from "@/lib/invites";
import { cn } from "@/lib/utils";

const GRID =
  "grid grid-cols-[minmax(160px,1.4fr)_104px_64px_112px_minmax(120px,1fr)_112px_92px] items-center gap-x-3";

const statusMarker: Record<InviteStatus, string> = {
  active: "size-2 rounded-[2px] bg-toward",
  usedUp: "size-2 rounded-full bg-muted-foreground",
  expired: "size-2 rounded-full border-[1.5px] border-away",
  revoked: "h-[3px] w-2 rounded-[1px] bg-muted-foreground",
};

export function InviteList({ invites }: { invites: InviteRecord[] }) {
  const t = useTranslations("admin");
  const locale = useLocale();

  function formatDate(iso: string) {
    return new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold">{t("listTitle")}</h2>

      <div className="overflow-x-auto rounded-lg border">
        <div className="min-w-[760px]">
          <div
            className={cn(
              GRID,
              "border-b px-4 py-2.5 font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase",
            )}
          >
            <span>{t("colInvite")}</span>
            <span>{t("colStatus")}</span>
            <span>{t("colUses")}</span>
            <span>{t("colExpires")}</span>
            <span>{t("colEmail")}</span>
            <span>{t("colCreated")}</span>
            <span className="sr-only">{t("revoke")}</span>
          </div>

          {invites.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              {t("empty")}
            </p>
          ) : (
            invites.map((invite) => {
              const status = inviteStatus(invite);
              const inactive = status !== "active";

              return (
                <div
                  key={invite.id}
                  className={cn(
                    GRID,
                    "border-b px-4 py-3 text-sm last:border-b-0",
                    inactive && "opacity-65",
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate">
                      {invite.note || (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {t("idLabel")} {shortInviteId(invite.id)}
                    </span>
                  </span>

                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className={cn("shrink-0", statusMarker[status])}
                    />
                    <span className="text-[13px]">
                      {t(
                        status === "active"
                          ? "statusActive"
                          : status === "usedUp"
                            ? "statusUsed"
                            : status === "expired"
                              ? "statusExpired"
                              : "statusRevoked",
                      )}
                    </span>
                  </span>

                  <span className="font-mono text-[13px] tabular-nums">
                    {invite.usedCount}/{invite.maxUses}
                  </span>

                  <span
                    className={cn(
                      "text-[13px]",
                      status === "expired" && "text-away",
                    )}
                  >
                    {invite.expiresAt
                      ? formatDate(invite.expiresAt)
                      : t("noExpiry")}
                  </span>

                  <span className="min-w-0 truncate text-[13px]">
                    {invite.email ?? t("unbound")}
                  </span>

                  <span className="text-[13px] text-muted-foreground">
                    {formatDate(invite.createdAt)}
                  </span>

                  <span className="justify-self-end">
                    {status === "active" ? (
                      <RevokeButton invite={invite} />
                    ) : null}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      <p className="text-[12.5px] text-muted-foreground">{t("listFoot")}</p>
    </section>
  );
}

function RevokeButton({ invite }: { invite: InviteRecord }) {
  const t = useTranslations("admin");

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          {t("revoke")}
        </Button>
      </DialogTrigger>
      <DialogContent role="alertdialog" className="sm:max-w-md">
        <DialogTitle>{t("revokeTitle")}</DialogTitle>
        <DialogDescription>{t("revokeBody")}</DialogDescription>
        <p className="rounded-md bg-field px-3 py-2 text-sm">
          {invite.note ? `${invite.note} · ` : ""}
          <span className="font-mono text-[13px] text-muted-foreground">
            {t("idLabel")} {shortInviteId(invite.id)}
          </span>
        </p>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              {t("cancel")}
            </Button>
          </DialogClose>
          {/* No DialogClose here: wrapping the submit swallows the form
              action. On success the row flips to revoked and this whole
              RevokeButton (dialog included) unmounts. */}
          <form action={revokeInvite}>
            <input type="hidden" name="id" value={invite.id} />
            <Button type="submit">{t("revokeConfirm")}</Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
