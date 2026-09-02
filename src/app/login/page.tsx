import { redirect } from "next/navigation";
import { getCurrentUser } from "@/auth/session";
import { AppName } from "@/components/app-name";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  if (await getCurrentUser()) {
    redirect("/");
  }

  return (
    <main className="container mx-auto flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-3 text-center">
          <h1 className="text-4xl font-bold tracking-tight">
            <AppName />
          </h1>
          <p className="text-muted-foreground">Sign in to continue.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Use your ACT email and password.</CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
