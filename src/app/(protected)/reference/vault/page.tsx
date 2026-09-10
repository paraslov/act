import { Suspense } from "react";
import { VaultView } from "@/components/reference/vault-view";
import { LIBRARY_SEARCH_INDEX } from "@/lib/reference/library-search";

export default function VaultPage() {
  return (
    <Suspense>
      <VaultView searchIndex={LIBRARY_SEARCH_INDEX} />
    </Suspense>
  );
}
