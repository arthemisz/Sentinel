import crypto from "crypto";

/**
 * Generates a new Sentinel API key with the "snt_live_" prefix.
 * The raw key is shown to the user once; only the SHA-256 hash is stored in the database.
 *
 * @returns Object containing rawKey (display once), hashedKey (store in DB), and prefix (for identification)
 */
export function generateApiKey(): {
  rawKey: string;
  hashedKey: string;
  prefix: string;
} {
  const randomHex = crypto.randomBytes(20).toString("hex");
  const rawKey = `snt_live_${randomHex}`;
  const prefix = rawKey.substring(0, 12); // "snt_live_" + first 3 hex chars
  const hashedKey = hashApiKey(rawKey);

  return { rawKey, hashedKey, prefix };
}

/**
 * Produces a SHA-256 hash of the given API key for secure database storage and lookup.
 */
export function hashApiKey(rawKey: string): string {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}
