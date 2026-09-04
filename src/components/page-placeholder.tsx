import { getTranslations } from "next-intl/server";

type NavTitle =
  | "today"
  | "journal"
  | "episodes"
  | "progress"
  | "flexibility"
  | "loop"
  | "vault";

export async function PagePlaceholder({ title }: { title: NavTitle }) {
  const nav = await getTranslations("nav");
  const placeholder = await getTranslations("placeholder");

  return (
    <div className="max-w-[900px] py-1">
      <h1 className="font-serif text-[34px] leading-tight font-normal tracking-[-0.02em]">
        {nav(title)}
      </h1>
      <p className="mt-2 max-w-[62ch] text-sm text-muted-foreground">
        {placeholder("description")}
      </p>
    </div>
  );
}
