import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/auth/session";
import { AppName } from "@/components/app-name";
import { LocaleSwitcher } from "@/components/locale-switcher";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RegisterForm } from "./register-form";

export default async function RegisterPage() {
  if (await getCurrentUser()) {
    redirect("/");
  }

  const t = await getTranslations("register");

  return (
    <main className="container mx-auto flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="flex justify-end">
          <LocaleSwitcher />
        </div>
        <div className="space-y-3 text-center">
          <h1 className="text-4xl font-bold tracking-tight">
            <AppName />
          </h1>
          <p className="text-muted-foreground">{t("intro")}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("title")}</CardTitle>
            <CardDescription>{t("description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <RegisterForm />
            <div className="border-t pt-4 text-center text-[13px] text-muted-foreground">
              {t("haveAccount")}{" "}
              <Link
                href="/login"
                className="text-foreground underline underline-offset-2"
              >
                {t("signIn")}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
