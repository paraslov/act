// Invite records and the single source of truth for an invite's status. Kept
// free of server-only imports so both the admin server components and the
// client row UI derive status from the same pure helper -- status is never
// stored (it would drift past its own expires_at).

export type InviteStatus = "active" | "usedUp" | "expired" | "revoked";

export type InviteRecord = {
  id: string;
  note: string;
  email: string | null;
  maxUses: number;
  usedCount: number;
  expiresAt: string | null; // ISO 8601, or null for no expiry
  createdAt: string; // ISO 8601
  revokedAt: string | null; // ISO 8601, or null when active
};

export function inviteStatus(
  invite: Pick<
    InviteRecord,
    "usedCount" | "maxUses" | "expiresAt" | "revokedAt"
  >,
  now: Date = new Date(),
): InviteStatus {
  if (invite.revokedAt) {
    return "revoked";
  }
  if (invite.expiresAt && new Date(invite.expiresAt) <= now) {
    return "expired";
  }
  if (invite.usedCount >= invite.maxUses) {
    return "usedUp";
  }
  return "active";
}

/** The first 8 characters of the uuid, used to identify a row in the UI. */
export function shortInviteId(id: string) {
  return id.slice(0, 8);
}
