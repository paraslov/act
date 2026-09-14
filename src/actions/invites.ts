"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminUser } from "@/auth/session";
import { query } from "@/lib/db/client";

const DAY_MS = 24 * 60 * 60 * 1000;

const createSchema = z.object({
  maxUses: z.coerce.number().int().min(1).max(1_000),
  expiresDays: z.enum(["", "7", "30", "90"]),
  email: z
    .string()
    .trim()
    .max(254)
    .transform((value) => value.toLowerCase())
    .refine(
      (value) => value === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      {
        message: "invalidEmail",
      },
    ),
  note: z.string().trim().max(200),
});

export type CreatedInvite = {
  code: string;
  maxUses: number;
  expiresAt: string | null;
  email: string | null;
};

export type CreateInviteState = {
  created?: CreatedInvite;
  error?: "invalidInput";
};

export async function createInvite(
  _previousState: CreateInviteState,
  formData: FormData,
): Promise<CreateInviteState> {
  const admin = await requireAdminUser();

  const parsed = createSchema.safeParse({
    maxUses: formData.get("maxUses"),
    expiresDays: formData.get("expiresDays"),
    email: formData.get("email") ?? "",
    note: formData.get("note") ?? "",
  });

  if (!parsed.success) {
    return { error: "invalidInput" };
  }

  const { maxUses, expiresDays, email, note } = parsed.data;
  const days = expiresDays === "" ? null : Number(expiresDays);

  // Generate the plaintext and hash it here; only the hash reaches the database.
  const code = randomBytes(24).toString("base64url");
  const codeHash = createHash("sha256").update(code).digest("hex");

  await query("SELECT admin_create_invite($1, $2, $3, $4, $5, $6)", [
    admin.id,
    codeHash,
    email === "" ? null : email,
    maxUses,
    days,
    note,
  ]);

  revalidatePath("/admin");

  return {
    created: {
      code,
      maxUses,
      expiresAt:
        days === null
          ? null
          : new Date(Date.now() + days * DAY_MS).toISOString(),
      email: email === "" ? null : email,
    },
  };
}

export async function revokeInvite(formData: FormData) {
  const admin = await requireAdminUser();
  const id = z.string().uuid().parse(formData.get("id"));

  await query("SELECT admin_revoke_invite($1, $2)", [admin.id, id]);
  revalidatePath("/admin");
}
