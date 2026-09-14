"use client";

import { Check, Copy, Loader2, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useActionState, useEffect, useRef, useState } from "react";
import { type CreateInviteState, createInvite } from "@/actions/invites";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: CreateInviteState = {};
const DONE_UNLOCK_MS = 5_000;

const fieldClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50";

export function CreateInvite() {
  const t = useTranslations("admin");
  const locale = useLocale();
  const [state, formAction, pending] = useActionState(
    createInvite,
    initialState,
  );

  const created = state.created;
  const [revealOpen, setRevealOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [canClose, setCanClose] = useState(false);
  const shownCode = useRef<string | null>(null);

  // Open the reveal exactly once per newly created code.
  useEffect(() => {
    if (created && created.code !== shownCode.current) {
      shownCode.current = created.code;
      setCopied(false);
      setCanClose(false);
      setRevealOpen(true);
      const timer = setTimeout(() => setCanClose(true), DONE_UNLOCK_MS);
      return () => clearTimeout(timer);
    }
  }, [created]);

  async function copyCode() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.code);
      setCopied(true);
      setCanClose(true);
    } catch {
      // Clipboard blocked; the code is selectable text and the 5s timer still
      // unlocks Done.
    }
  }

  function termsLine() {
    if (!created) return "";
    const parts = [
      t("termsUses", { max: created.maxUses }),
      created.expiresAt
        ? t("termsUntil", {
            date: new Intl.DateTimeFormat(locale, {
              day: "numeric",
              month: "short",
            }).format(new Date(created.expiresAt)),
          })
        : t("termsNever"),
      created.email
        ? t("termsEmail", { email: created.email })
        : t("termsAnyone"),
    ];
    return parts.join(" · ");
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("createTitle")}</CardTitle>
          <CardDescription>{t("createHelp")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={formAction}
            className="flex flex-wrap items-end gap-x-4 gap-y-3"
          >
            <div className="space-y-1.5">
              <Label htmlFor="maxUses">{t("fUses")}</Label>
              <Input
                id="maxUses"
                name="maxUses"
                type="number"
                min={1}
                defaultValue={1}
                disabled={pending}
                className="h-9 w-24 font-mono tabular-nums"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="expiresDays">{t("fExpires")}</Label>
              <select
                id="expiresDays"
                name="expiresDays"
                defaultValue=""
                disabled={pending}
                className={`${fieldClass} w-40`}
              >
                <option value="">{t("expNever")}</option>
                <option value="7">{t("exp7")}</option>
                <option value="30">{t("exp30")}</option>
                <option value="90">{t("exp90")}</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">{t("fEmail")}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="off"
                autoCapitalize="none"
                placeholder={t("fEmailPh")}
                disabled={pending}
                className="h-9 w-56"
              />
            </div>

            <div className="min-w-[12rem] flex-1 space-y-1.5">
              <Label htmlFor="note">{t("fNote")}</Label>
              <Input
                id="note"
                name="note"
                type="text"
                placeholder={t("fNotePh")}
                disabled={pending}
                className="h-9"
              />
            </div>

            <Button type="submit" disabled={pending} className="h-9">
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              {t("createSubmit")}
            </Button>
          </form>

          {state.error ? (
            <p className="mt-3 text-sm text-destructive" role="alert">
              {t("createError")}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Dialog
        open={revealOpen}
        onOpenChange={(open) => {
          // Radix may request a close (escape, outside click). Ignore it; the
          // only exit is the Done button, which sets revealOpen false directly.
          if (open) setRevealOpen(true);
        }}
      >
        <DialogContent
          showCloseButton={false}
          onEscapeKeyDown={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
          className="gap-5 sm:max-w-md"
        >
          <div className="space-y-2">
            <span className="font-mono text-[10px] tracking-[0.16em] text-away uppercase">
              {t("revealLabel")}
            </span>
            <DialogTitle className="font-serif text-2xl">
              {t("revealTitle")}
            </DialogTitle>
            <DialogDescription>{t("revealBody")}</DialogDescription>
          </div>

          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 rounded-md bg-field px-3 py-2.5 font-mono text-sm break-all">
              {created?.code}
            </code>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={copyCode}
              className="shrink-0"
            >
              {copied ? (
                <Check className="size-4" />
              ) : (
                <Copy className="size-4" />
              )}
              {copied ? t("copied") : t("copy")}
            </Button>
          </div>

          <div className="border-t pt-3 text-[13px] text-muted-foreground">
            {termsLine()}
          </div>

          <Button
            type="button"
            size="lg"
            className="w-full"
            disabled={!canClose}
            onClick={() => setRevealOpen(false)}
          >
            {t("revealDone")}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
