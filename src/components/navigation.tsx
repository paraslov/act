import { Home, LogOut } from "lucide-react";
import Link from "next/link";
import { logout } from "@/actions/auth";
import type { CurrentUser } from "@/auth/session";
import { AppName } from "@/components/app-name";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export function Navigation({ user }: { user: CurrentUser }) {
  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex min-h-16 items-center justify-between gap-4 px-6 py-3">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-xl font-bold tracking-tight">
            <AppName />
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link href="/">
              <Home className="size-4" />
              Home
            </Link>
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden max-w-56 truncate text-sm text-muted-foreground sm:block">
            {user.email}
          </span>
          <ThemeToggle />
          <form action={logout}>
            <Button
              type="submit"
              variant="outline"
              size="icon"
              aria-label="Sign out"
            >
              <LogOut className="size-4" />
            </Button>
          </form>
        </div>
      </div>
    </nav>
  );
}
