"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  clearAccountLoginFailures,
  clearRegisterFailures,
  getLoginSource,
  isLoginBlocked,
  isRegisterBlocked,
  recordLoginFailure,
  recordRegisterFailure,
} from "@/auth/login-throttle";
import { hashPassword, verifyPassword } from "@/auth/password";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/auth/policy";
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
};

export type LoginState = {
  error?: "invalidInput" | "invalidCredentials";
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
    return { error: "invalidInput" };
  }

  const email = parsed.data.email;
  const source = getLoginSource(await headers());
  const result = await query<AccountRow>(
    `SELECT id, password_hash, is_active
       FROM users
      WHERE email = $1
      LIMIT 1`,
    [email],
  );
  const account = result.rows[0];
  const activeAccountExists = Boolean(account?.is_active);

  if (await isLoginBlocked(email, source, activeAccountExists)) {
    return { error: "invalidCredentials" };
  }

  // Run the same expensive operation even when the account does not exist.
  const passwordMatches = account
    ? await verifyPassword(parsed.data.password, account.password_hash)
    : await verifyPassword(
        parsed.data.password,
        "scrypt$16384$8$1$N2M3SjR1NVVWckk2SW83cA$VoGYndiiLuN4CBT5Jbb8xqITCezfjSvaQjt28S2H_StdiHdjGEgrLEiuPps-aRVuXR_MNCF4rED2fjtTHtJVCg",
      );

  if (!account || !account.is_active || !passwordMatches) {
    await recordLoginFailure(email, source, activeAccountExists);
    return { error: "invalidCredentials" };
  }

  await query(
    `UPDATE users
        SET last_login_at = now(),
            updated_at = now()
      WHERE id = $1`,
    [account.id],
  );
  await clearAccountLoginFailures(email, source);
  await createSession(account.id);
  redirect("/");
}

const registrationSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .transform((value) => value.toLowerCase()),
  password: z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH),
  code: z.string().trim().min(1).max(256),
});

type InviteRow = {
  email: string | null;
  max_uses: number;
  used_count: number;
  expires_at: Date | null;
  revoked_at: Date | null;
};

type RegisterResultRow = {
  user_id: string | null;
  error: string | null;
};

export type RegisterState = {
  error?: "invalidInput" | "invalidInvite" | "emailTaken";
};

function hashInviteCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

export async function register(
  _previousState: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const parsed = registrationSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    code: formData.get("code"),
  });

  if (!parsed.success) {
    return { error: "invalidInput" };
  }

  const { email, password, code } = parsed.data;
  const source = getLoginSource(await headers());

  if (await isRegisterBlocked(source)) {
    return { error: "invalidInvite" };
  }

  const codeHash = hashInviteCode(code);

  // Cheap, best-effort pre-check so an obviously unusable code never triggers
  // the expensive password hash below. register_user() re-validates the invite
  // authoritatively (locking the row); this only short-circuits the scrypt.
  const inviteResult = await query<InviteRow>(
    `SELECT email, max_uses, used_count, expires_at, revoked_at
       FROM invite_codes
      WHERE code_hash = $1
      LIMIT 1`,
    [codeHash],
  );
  const invite = inviteResult.rows[0];
  const inviteUsable =
    invite !== undefined &&
    invite.revoked_at === null &&
    (invite.expires_at === null || invite.expires_at > new Date()) &&
    invite.used_count < invite.max_uses &&
    (invite.email === null || invite.email === email);

  if (!inviteUsable) {
    await recordRegisterFailure(source);
    return { error: "invalidInvite" };
  }

  const passwordHash = await hashPassword(password);

  const registered = await query<RegisterResultRow>(
    "SELECT user_id, error FROM register_user($1, $2, $3)",
    [email, passwordHash, codeHash],
  );
  const result = registered.rows[0];

  // An existing email is reported plainly (enumeration is accepted under
  // invite-gating) and is not counted as an abuse failure: the invite was not
  // consumed, and a legitimate user may simply already have an account.
  if (result?.error === "emailTaken") {
    return { error: "emailTaken" };
  }

  if (!result?.user_id || result.error) {
    await recordRegisterFailure(source);
    return { error: "invalidInvite" };
  }

  await clearRegisterFailures(source);
  await createSession(result.user_id);
  redirect("/");
}

export async function logout() {
  await deleteCurrentSession();
  redirect("/login");
}
