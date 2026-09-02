import { requireCurrentUser } from "@/auth/session";
import { AppName } from "@/components/app-name";
import { Card, CardContent } from "@/components/ui/card";

export default async function HomePage() {
  await requireCurrentUser();

  return (
    <main className="container mx-auto px-6 py-12">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="space-y-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight">
            <AppName />
          </h1>
        </div>

        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold">ACT</h2>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
