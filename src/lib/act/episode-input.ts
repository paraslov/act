import { z } from "zod";
import { AXES, HOOK_TYPES, SKILLS, STATES } from "@/lib/act/constants";
import { todayId } from "@/lib/act/date";

const text = z.string().trim().max(10_000);
const optionalText = text.optional().default("");
export const directionSchema = z.enum(["toward", "away", "mixed", "unknown"]);
export const behaviorSchema = z.enum(["acted", "planned", "not-described"]);
const score = z.union([z.literal(0), z.literal(1), z.literal(2), z.null()]);
export const checksSchema = z.object(
  Object.fromEntries(AXES.map(({ id }) => [id, score.optional()])) as Record<
    (typeof AXES)[number]["id"],
    z.ZodOptional<typeof score>
  >,
);

const patterns = z
  .array(z.enum([...STATES.map(({ id }) => id), "unknown", "none-noticed"]))
  .refine(
    (items) =>
      new Set(items).size === items.length &&
      (!items.some((id) => id === "unknown" || id === "none-noticed") ||
        items.length === 1),
  );
const skills = z
  .array(z.enum([...SKILLS.map(({ id }) => id), "unknown", "no-skill"]))
  .refine(
    (items) =>
      new Set(items).size === items.length &&
      (!items.some((id) => id === "unknown" || id === "no-skill") ||
        items.length === 1),
  );

export const createEpisodeSchema = z
  .object({
    day: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine((day) => {
        const parsed = new Date(`${day}T00:00:00Z`);
        return (
          Number.isFinite(parsed.getTime()) &&
          parsed.toISOString().slice(0, 10) === day
        );
      })
      .optional()
      .transform((day) => day ?? todayId()),
    // TODO A15 / Phase 6: suggest the band in the user's configured time zone.
    band: z
      .number()
      .int()
      .min(0)
      .max(7)
      .optional()
      .transform((band) => band ?? Math.floor(new Date().getUTCHours() / 3)),
    dir: directionSchema.optional().default("unknown"),
    behaviorStatus: behaviorSchema.optional().default("not-described"),
    hook: optionalText,
    hookType: z
      .enum(HOOK_TYPES.map(({ id }) => id))
      .nullable()
      .optional()
      .default(null),
    situation: optionalText,
    states: patterns.optional().default([]),
    skills: skills.optional().default([]),
    value: optionalText,
    move: optionalText,
    workable: optionalText,
    immediateOutcome: optionalText,
    laterConsequences: optionalText,
    consequenceStatus: z
      .enum(["observed", "expected", "unknown"])
      .optional()
      .default("unknown"),
    intendedFunction: optionalText,
    nextExperiment: optionalText,
    interpretation: optionalText,
    checks: checksSchema.optional().default({}),
    valueId: z.uuid().nullable().optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (!value.hook && !value.situation && !value.move)
      ctx.addIssue({
        code: "custom",
        path: ["hook"],
        message: "Describe the situation, experience, or action",
      });
    if (value.behaviorStatus === "acted" && !value.move)
      ctx.addIssue({
        code: "custom",
        path: ["move"],
        message: "Describe the completed action",
      });
  });

/** Only these explicit clarifications change; other historical fields stay intact. */
export const clarifyEpisodeSchema = z
  .object({
    id: z.uuid(),
    dir: directionSchema,
    behaviorStatus: behaviorSchema,
    move: text,
    checks: checksSchema,
  })
  .strict()
  .refine((value) => value.behaviorStatus !== "acted" || !!value.move, {
    path: ["move"],
    message: "Describe the completed action",
  });
