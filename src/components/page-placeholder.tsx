import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

type NavTitle =
  | "today"
  | "journal"
  | "episodes"
  | "progress"
  | "flexibility"
  | "loop"
  | "vault";

export async function PagePlaceholder({
  title,
  action,
}: {
  title: NavTitle;
  action?: ReactNode;
}) {
  const nav = await getTranslations("nav");
  const placeholder = await getTranslations("placeholder");

  return (
    <div className="max-w-[900px] py-1">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-serif text-[34px] leading-tight font-normal tracking-[-0.02em]">
          {nav(title)}
        </h1>
        {action}
      </div>
      <p className="mt-2 max-w-[62ch] text-sm text-muted-foreground">
        {placeholder("description")}
      </p>
    </div>
  );
}
