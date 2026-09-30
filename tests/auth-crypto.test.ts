import { describe, expect, it } from "vitest";
import {
  csrfToken,
  digest,
  hashPassword,
  newToken,
  sameToken,
  validPassword,
  verifyPassword,
} from "../server/auth/crypto.js";

describe("password and token handling", () => {
  it("salts password hashes and verifies only the right password", async () => {
    const password = "A unique test passphrase!";
    const first = await hashPassword(password);
    const second = await hashPassword(password);
    expect(first).not.toBe(second);
    expect(first).not.toContain(password);
    expect(await verifyPassword(password, first)).toBe(true);
    expect(await verifyPassword("incorrect-password", first)).toBe(false);
    expect(await verifyPassword(password, null)).toBe(false);
    expect(await verifyPassword(password, "malformed")).toBe(false);
  });
  it("allows long passphrases but rejects short and excessive inputs", () => {
    expect(validPassword("short")).toBe(false);
    expect(validPassword("An individual account passphrase")).toBe(true);
    expect(validPassword("x".repeat(129))).toBe(false);
  });
  it("uses unpredictable session secrets and session-specific CSRF tokens", () => {
    const first = newToken(),
      second = newToken();
    expect(first).toHaveLength(43);
    expect(first).not.toBe(second);
    expect(digest(first)).not.toContain(first);
    expect(csrfToken(first)).not.toBe(csrfToken(second));
    expect(sameToken(csrfToken(first), csrfToken(first))).toBe(true);
    expect(sameToken(csrfToken(second), csrfToken(first))).toBe(false);
    expect(sameToken(undefined, csrfToken(first))).toBe(false);
    expect(sameToken("é".repeat(43), csrfToken(first))).toBe(false);
  });
});
