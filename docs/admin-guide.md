# Admin guide: making yourself an admin & inviting people

Two short procedures: **become an admin once**, then **invite people from the app**.
Everything about how this is secured is in
[`registration-invite-plan.md`](./registration-invite-plan.md); this file is just the
how-to.

---

## One-time: make your account an admin

The app's runtime deliberately cannot change who is an admin (same hardening that stops it
minting accounts), so the first admin is set out-of-band, through the privileged database
URL. This is a chicken-and-egg step: you can't promote yourself from a panel you can't yet
open.

**You need:** an existing account (if you don't have one, create it first — see
[Bootstrapping the first account](#bootstrapping-the-first-account)), and
`DATABASE_ADMIN_URL` set in your environment.

### Locally

```bash
pnpm db:set-admin your@email.com
```

You should see `your@email.com: is_admin = true`. Sign out and back in if you were already
logged in, then **Invites** appears in the sidebar under **ADMIN**.

To remove admin later:

```bash
pnpm db:set-admin your@email.com --revoke
```

### In production (Neon)

`pnpm db:set-admin` reads `DATABASE_ADMIN_URL`. Run it against your Neon **admin** URL —
the same privileged connection you use for migrations, not the app's runtime URL:

```bash
DATABASE_ADMIN_URL="postgresql://<admin-user>:<pw>@<host>/<db>" pnpm db:set-admin your@email.com
```

Or, if you'd rather not run the script against production, run this once in the Neon SQL
console:

```sql
UPDATE users SET is_admin = true, updated_at = now() WHERE email = 'your@email.com';
```

---

## Everyday: invite someone from the app

1. Open **Invites** in the sidebar (`/admin`). Non-admins can't see it and get a 404 if
   they try the URL directly.
2. In **Create an invite**, set:
   - **Uses** — how many accounts this one code may create (usually `1`).
   - **Expires** — No expiry / 7 / 30 / 90 days.
   - **Bind to email** *(optional)* — lock the code so only that address can use it.
   - **Note** *(optional)* — who it's for, so you recognise it in the list later.
3. Click **Create invite**. A dialog shows the code **once** — copy it now. Once you close
   the dialog the plaintext is gone forever (only a hash is stored); if you lose it, revoke
   it and make a new one.
4. Send the code to the person. They go to **/register**, enter their email, a password
   (min 8 characters), and the code.

### Reading the list

Each invite shows a status you never edit directly — it's derived:

| Status | Meaning |
| --- | --- |
| **Active** (green square) | Usable |
| **Used up** (grey circle) | Reached its use limit |
| **Expired** (amber ring) | Past its expiry date |
| **Revoked** (grey bar) | You revoked it |

Nothing is ever deleted — used-up, expired and revoked invites stay listed as a record.

### Revoking

Click **Revoke** on an active invite and confirm. It stops working immediately; anyone
holding that code can no longer register with it. The row stays, marked **Revoked**.

---

## Bootstrapping the first account

If there is no account yet (fresh database), create one directly — registration needs an
invite, and there's no admin to issue one yet:

```bash
pnpm db:create-user your@email.com
```

Then make it an admin as above. From that point on you can invite everyone else from the
panel.

---

## Do we still need the scripts now that there's a panel?

- **`db:set-admin`** — yes. Admin promotion can't happen inside the app; this is the only
  way (short of raw SQL).
- **`db:create-user`** — yes, for the very first account and any out-of-band provisioning.
- **`db:create-invite`** — optional. The panel replaces it for day-to-day use. Keep it as
  a fallback for automation or if you're ever locked out of the UI; ignore it otherwise.
