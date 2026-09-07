import { ValuesView } from "@/components/values/values-view";
import { listPersonalValues } from "@/lib/db/personal-values";

export default async function ValuesPage() {
  // Both halves in one query: the archived view is a switch on this screen, not
  // a route, and the list is small enough that a second round-trip buys nothing.
  const values = await listPersonalValues({ includeArchived: true });
  return <ValuesView values={values} />;
}
