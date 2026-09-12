import { cn } from "@/lib/utils";

/**
 * Shared chip styles for the reflection surfaces, from the design handoff's two
 * control patterns. Radius is passed in `extra` where a surface needs a specific
 * one (bands, pills); the defaults match the common case.
 */

/** "Filled" style — selected fills with ink (time bands, experience pills, domain filters). */
export function filledChip(selected: boolean, extra?: string): string {
  return cn(
    "cursor-pointer rounded-button border px-2.5 py-1.5 text-xs transition-colors",
    selected
      ? "border-primary bg-primary font-medium text-primary-foreground"
      : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
    extra,
  );
}

/**
 * "Light" style — selected gains a stronger border, a tinted fill and weight
 * (behaviour status, consequence status, skills, rating options). `dashed`
 * marks an absence option; its border is a hairline that never looks like a zero.
 */
export function lightChip(
  selected: boolean,
  dashed = false,
  extra?: string,
): string {
  return cn(
    "cursor-pointer rounded-button border px-2.5 py-1.5 text-xs transition-colors",
    dashed && "border-dashed",
    selected
      ? "border-foreground/40 bg-muted font-semibold"
      : "bg-card hover:bg-accent",
    extra,
  );
}
