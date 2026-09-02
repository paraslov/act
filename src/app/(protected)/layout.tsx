import type { ReactNode } from "react";
import { requireCurrentUser } from "@/auth/session";
import { Navigation } from "@/components/navigation";

export default async function ProtectedLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const user = await requireCurrentUser();

  return (
    <>
      <Navigation user={user} />
      {children}
    </>
  );
}
