"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { logout } from "@/actions/auth";
import { setLocaleAction } from "@/actions/settings";
import type { CurrentUser } from "@/auth/session";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { type Locale, locales } from "@/i18n/config";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label:
    | "today"
    | "journal"
    | "episodes"
    | "progress"
    | "flexibility"
    | "loop"
    | "vault";
  count?: number;
};

const dailyItems: NavItem[] = [
  { href: "/", label: "today" },
  { href: "/journal", label: "journal" },
  { href: "/episodes", label: "episodes" },
  { href: "/progress", label: "progress" },
];

const referenceItems: NavItem[] = [
  { href: "/reference/flexibility", label: "flexibility" },
  { href: "/reference/loop", label: "loop" },
  { href: "/reference/vault", label: "vault" },
];

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({
  items,
  episodeCount,
}: {
  items: NavItem[];
  episodeCount: number;
}) {
  const pathname = usePathname();
  const t = useTranslations("nav");

  return (
    <nav className="flex min-w-max flex-row gap-0.5 min-[900px]:min-w-0 min-[900px]:flex-col">
      {items.map((item) => {
        const active = isActivePath(pathname, item.href);
        const count = item.label === "episodes" ? episodeCount : item.count;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-9 items-center gap-2.5 rounded-button px-2.5 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              active && "bg-accent font-semibold text-foreground",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "size-1.5 shrink-0 rounded-[2px] bg-border",
                active && "bg-toward",
              )}
            />
            <span className="flex-1">{t(item.label)}</span>
            {count !== undefined ? (
              <span className="font-mono text-[10px] text-muted-foreground">
                {count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppSidebar({
  user,
  episodeCount,
  streak = null,
}: {
  user: CurrentUser;
  episodeCount: number;
  streak?: number | null;
}) {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const t = useTranslations();
  const [isLocalePending, startLocaleTransition] = useTransition();

  function changeLocale(nextLocale: Locale) {
    startLocaleTransition(async () => {
      await setLocaleAction(nextLocale);
      router.refresh();
    });
  }

  return (
    <aside className="grid w-full shrink-0 grid-cols-[auto_minmax(0,1fr)] gap-x-4 border-b bg-background px-4 py-3 min-[900px]:sticky min-[900px]:top-0 min-[900px]:flex min-[900px]:h-screen min-[900px]:w-[236px] min-[900px]:flex-col min-[900px]:overflow-y-auto min-[900px]:border-r min-[900px]:border-b-0 min-[900px]:px-3.5 min-[900px]:py-5">
      <Link
        href="/"
        className="order-1 flex items-center gap-2.5 self-center px-1 min-[900px]:mb-7 min-[900px]:self-stretch"
      >
        <span className="text-xl font-semibold tracking-[-0.02em]">
          {t("common.appName")}
        </span>
        <span className="rounded-chip border px-2 py-1 font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
          {t("nav.practice")}
        </span>
      </Link>

      <div className="order-3 col-span-2 mt-3 flex min-w-0 gap-4 overflow-x-auto border-t pt-3 min-[900px]:order-2 min-[900px]:mt-0 min-[900px]:block min-[900px]:overflow-visible min-[900px]:border-0 min-[900px]:pt-0">
        <section>
          <p className="mb-3.5 hidden px-2 font-mono text-[10px] tracking-[0.16em] text-muted-foreground/80 uppercase min-[900px]:block">
            {t("nav.groupDaily")}
          </p>
          <NavLinks items={dailyItems} episodeCount={episodeCount} />
        </section>

        <section className="min-[900px]:mt-5">
          <p className="mb-2.5 hidden px-2 font-mono text-[10px] tracking-[0.16em] text-muted-foreground/80 uppercase min-[900px]:block">
            {t("nav.groupReference")}
          </p>
          <NavLinks items={referenceItems} episodeCount={episodeCount} />
        </section>
      </div>

      <Link
        href="/reference/flexibility"
        className="order-3 mx-2 mt-5 hidden border-t pt-4.5 text-left min-[900px]:block"
      >
        <span className="mb-2 block font-mono text-[10px] tracking-[0.16em] text-muted-foreground/80 uppercase">
          {t("nav.masterStat")}
        </span>
        <span className="block font-serif text-[19px] leading-[1.2] tracking-[-0.01em] text-foreground">
          {t("nav.masterStatLine1")}
          <br />
          {t("nav.masterStatLine2")}
        </span>
        <span className="mt-2 block text-xs leading-4.5 text-muted-foreground">
          {t("nav.masterStatDescription")}
        </span>
      </Link>

      <div className="order-4 mx-2 mt-4.5 hidden rounded-[10px] border bg-page p-3 min-[900px]:block">
        <p className="mb-1.5 font-mono text-[10px] tracking-[0.14em] text-muted-foreground/80 uppercase">
          {t("nav.streak")}
        </p>
        <p className="font-serif text-[28px] leading-none tracking-[-0.02em]">
          {streak ?? "—"}{" "}
          <span className="font-sans text-[13px] tracking-normal text-muted-foreground">
            {t("nav.days")}
          </span>
        </p>
        <p className="mt-1.5 text-[11.5px] leading-[1.45] text-muted-foreground">
          {t("nav.streakUnit")}
        </p>
      </div>

      <div className="order-2 flex min-w-0 items-center justify-end gap-1.5 min-[900px]:order-5 min-[900px]:mt-auto min-[900px]:justify-start min-[900px]:border-t min-[900px]:pt-4">
        <span className="mr-auto hidden min-w-0 truncate text-xs text-muted-foreground min-[900px]:block">
          {user.email}
        </span>
        <label className="sr-only" htmlFor="app-locale">
          {t("locale.label")}
        </label>
        <select
          id="app-locale"
          value={locale}
          disabled={isLocalePending}
          onChange={(event) => changeLocale(event.target.value as Locale)}
          className="h-9 cursor-pointer rounded-button border bg-background px-2 font-mono text-[10px] uppercase outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
        >
          {locales.map((item) => (
            <option key={item} value={item}>
              {t(`locale.${item}`)}
            </option>
          ))}
        </select>
        <ThemeToggle ariaLabel={t("nav.toggleTheme")} />
        <form action={logout}>
          <Button
            type="submit"
            variant="outline"
            size="icon"
            aria-label={t("common.signOut")}
            title={t("common.signOut")}
          >
            <LogOut className="size-4" />
          </Button>
        </form>
      </div>
    </aside>
  );
}
