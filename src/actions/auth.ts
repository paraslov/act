"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { verifyPassword } from "@/auth/password";
import { createSession, deleteCurrentSession } from "@/auth/session";
import { query } from "@/lib/db/client";

const credentialsSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(1_024),
});

type AccountRow = {
  id: string;
  password_hash: string;
  is_active: boolean;
  locked_until: Date | null;
};

export type LoginState = {
  error?: string;
};

export async function login(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Enter a valid email and password." };
  }

  const result = await query<AccountRow>(
    `SELECT id, password_hash, is_active, locked_until
       FROM users
      WHERE email = $1
      LIMIT 1`,
    [parsed.data.email],
  );
  const account = result.rows[0];

  // Run the same expensive operation even when the account does not exist.
  const passwordMatches = account
    ? await verifyPassword(parsed.data.password, account.password_hash)
    : await verifyPassword(
        parsed.data.password,
        "scrypt$16384$8$1$N2M3SjR1NVVWckk2SW83cA$VoGYndiiLuN4CBT5Jbb8xqITCezfjSvaQjt28S2H_StdiHdjGEgrLEiuPps-aRVuXR_MNCF4rED2fjtTHtJVCg",
      );

  const isLocked = account?.locked_until
    ? account.locked_until.getTime() > Date.now()
    : false;

  if (!account || !account.is_active || !passwordMatches || isLocked) {
    if (account && !passwordMatches && account.is_active && !isLocked) {
      await query(
        `UPDATE users
            SET failed_login_count = failed_login_count + 1,
                locked_until = CASE
                  WHEN failed_login_count + 1 >= 5
                    THEN now() + interval '15 minutes'
                  ELSE locked_until
                END,
                updated_at = now()
          WHERE id = $1`,
        [account.id],
      );
    }

    return { error: "Email or password is incorrect." };
  }

  await query(
    `UPDATE users
        SET failed_login_count = 0,
            locked_until = NULL,
            last_login_at = now(),
            updated_at = now()
      WHERE id = $1`,
    [account.id],
  );
  await createSession(account.id);
  redirect("/");
}

export async function logout() {
  await deleteCurrentSession();
  redirect("/login");
}
