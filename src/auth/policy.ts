// Shared auth policy constants. Kept free of server-only imports (no node
// builtins) so both the register server action and the client register form can
// import it. scripts/create-user.mjs cannot import TypeScript, so it hardcodes
// the same minimum -- keep the two in sync.
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 1_024;
