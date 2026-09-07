import { describe, expect, it } from "vitest";
import { DOMAINS, domainLabel } from "./constants";

describe("personal value domains", () => {
  const domains = [
    ["relationships", "Relationships"],
    ["work_education", "Work & Education"],
    ["personal_growth_health", "Personal Growth & Health"],
    ["leisure", "Leisure"],
  ];

  it("keeps the four persisted ids and display labels in canonical order", () => {
    expect(DOMAINS.map(({ id, label }) => [id, label])).toEqual(domains);
  });

  it.each(domains)("labels %s as %s", (id, label) => {
    expect(domainLabel(id)).toBe(label);
  });

  it("uses the first domain label for unknown ids, like other label helpers", () => {
    expect(domainLabel("unknown")).toBe("Relationships");
  });
});
