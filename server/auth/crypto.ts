import {
  createHash,
  createHmac,
  randomBytes,
  scrypt,
  timingSafeEqual,
} from "node:crypto";

const N = 32768,
  r = 8,
  p = 3;
const derive = (password: string, salt: string) =>
  new Promise<Buffer>((resolve, reject) => {
    scrypt(
      password,
      salt,
      64,
      { N, r, p, maxmem: 64 * 1024 * 1024 },
      (error, key) => (error ? reject(error) : resolve(key)),
    );
  });
export const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const newToken = () => randomBytes(32).toString("base64url");
export const validToken = (value: unknown): value is string =>
  typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value);
export const csrfToken = (sessionToken: string) =>
  createHmac("sha256", sessionToken).update("ldss-csrf-v1").digest("base64url");
export function sameToken(actual: unknown, expected: string) {
  return (
    typeof actual === "string" &&
    Buffer.byteLength(actual) === Buffer.byteLength(expected) &&
    timingSafeEqual(Buffer.from(actual), Buffer.from(expected))
  );
}
export function validPassword(password: string) {
  return (
    [...password].length >= 15 &&
    [...password].length <= 128 &&
    Buffer.byteLength(password, "utf8") <= 512
  );
}
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt$${N}$${r}$${p}$${salt}$${(await derive(password, salt)).toString("hex")}`;
}
export async function verifyPassword(password: string, encoded: string | null) {
  const parts = encoded?.split("$");
  const valid =
    parts?.length === 6 &&
    parts[0] === "scrypt" &&
    parts[1] === String(N) &&
    parts[2] === String(r) &&
    parts[3] === String(p) &&
    /^[a-f0-9]{32}$/.test(parts[4]) &&
    /^[a-f0-9]{128}$/.test(parts[5]);
  // Absent/disabled/uninitialized identities still pay the password-hash cost.
  const key = await derive(
    password,
    valid ? parts[4] : "00000000000000000000000000000000",
  );
  const expected = valid ? Buffer.from(parts[5], "hex") : Buffer.alloc(64);
  return timingSafeEqual(key, expected) && Boolean(valid);
}
