"use client";

import { Loader2, UserPlus } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useState } from "react";
import { type RegisterState, register } from "@/actions/auth";
import { PASSWORD_MIN_LENGTH } from "@/auth/policy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const initialState: RegisterState = {};
const min = PASSWORD_MIN_LENGTH;

export function RegisterForm() {
  const t = useTranslations("register");
  const [state, formAction, pending] = useActionState(register, initialState);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [canPaste, setCanPaste] = useState(false);

  useEffect(() => {
    setCanPaste(
      typeof navigator !== "undefined" &&
        typeof navigator.clipboard?.readText === "function",
    );
  }, []);

  async function pasteCode() {
    try {
      const text = await navigator.clipboard.readText();
      setCode(text.trim());
    } catch {
      // Clipboard read denied or unavailable; native paste still works.
    }
  }

  const length = password.length;
  const meetsMin = length >= min;
  // Only reddens after a submit that came back as invalidInput while the
  // password is still too short — never while the user is simply typing.
  const showShortError = state.error === "invalidInput" && length < min;
  const railPercent = Math.min(100, (length / min) * 100);
  const isInputError = state.error === "invalidInput";

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email">{t("email")}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          required
          disabled={pending}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">{t("password")}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={min}
          required
          disabled={pending}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span
              className={cn(
                "text-[12.5px]",
                showShortError ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {t(showShortError ? "passwordShort" : "passwordHint", { min })}
            </span>
            <span
              className={cn(
                "font-mono text-[11px] tabular-nums",
                showShortError ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {Math.min(length, min)}/{min}
            </span>
          </div>
          <div className="h-0.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full transition-[width]",
                showShortError
                  ? "bg-destructive"
                  : meetsMin
                    ? "bg-foreground"
                    : "bg-muted-foreground",
              )}
              style={{ width: `${railPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="code">{t("code")}</Label>
          {canPaste ? (
            <button
              type="button"
              onClick={pasteCode}
              disabled={pending}
              className="rounded-md border px-2 py-0.5 font-mono text-[10px] uppercase text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
            >
              {t("paste")}
            </button>
          ) : null}
        </div>
        <Input
          id="code"
          name="code"
          type="text"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          required
          disabled={pending}
          placeholder={t("codePlaceholder")}
          value={code}
          onChange={(event) => setCode(event.target.value)}
          className="h-10 truncate bg-field font-mono text-[13px] tracking-[0.02em]"
        />
        <p className="text-[12.5px] text-muted-foreground">{t("codeHint")}</p>
      </div>

      {state.error ? (
        <div role="alert" className="flex items-start gap-2 text-[13.5px]">
          <span
            aria-hidden="true"
            className={cn(
              "mt-1 size-[5px] shrink-0 rounded-[1px]",
              isInputError ? "bg-destructive" : "bg-away",
            )}
          />
          <p className={isInputError ? "text-destructive" : "text-foreground"}>
            {t(state.error, { min })}
            {state.error === "emailTaken" ? (
              <>
                {" "}
                <Link
                  href="/login"
                  className="text-foreground underline underline-offset-2"
                >
                  {t("emailTakenAction")}
                </Link>
              </>
            ) : null}
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-2.5">
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <UserPlus className="size-4" />
          )}
          {pending ? t("pending") : t("submit")}
        </Button>
        {pending ? (
          <p className="text-center text-[12.5px] text-muted-foreground">
            {t("pendingNote")}
          </p>
        ) : null}
      </div>
    </form>
  );
}
