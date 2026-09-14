import "server-only";

import { query } from "@/lib/db/client";
import type { InviteRecord } from "@/lib/invites";

type InviteDbRow = {
  id: string;
  note: string;
  email: string | null;
  max_uses: number;
  used_count: number;
  expires_at: Date | null;
  created_at: Date;
  revoked_at: Date | null;
};

/**
 * Lists every invite, newest first, for the admin panel. invite_codes is a
 * pre-auth table with explicit column grants (not RLS), so this reads through
 * the plain pool. There is deliberately no code column -- only hashes are
 * stored, so a code cannot be shown after creation.
 */
export async function listInvites(): Promise<InviteRecord[]> {
  const result = await query<InviteDbRow>(
    `SELECT id, note, email, max_uses, used_count, expires_at, created_at, revoked_at
       FROM invite_codes
      ORDER BY created_at DESC`,
  );

  return result.rows.map((row) => ({
    id: row.id,
    note: row.note,
    email: row.email,
    maxUses: row.max_uses,
    usedCount: row.used_count,
    expiresAt: row.expires_at ? row.expires_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
    revokedAt: row.revoked_at ? row.revoked_at.toISOString() : null,
  }));
}
