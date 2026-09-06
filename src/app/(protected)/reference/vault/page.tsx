import { Suspense } from "react";
import { VaultView } from "@/components/reference/vault-view";

export default function VaultPage() {
  return (
    <Suspense>
      <VaultView />
    </Suspense>
  );
}
