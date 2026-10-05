import { describe, expect, it } from "vitest";
import { loadConfig } from "../server/config.js";

describe("environment configuration", () => {
  it("runs locally without database credentials and uses a loopback listener", () => {
    expect(loadConfig({})).toMatchObject({
      APP_ENV: "development",
      HOST: "127.0.0.1",
      PORT: 3001,
      DB_PORT: 3306,
    });
    expect(loadConfig({}).DB_USER).toBeUndefined();
  });
  it.each(["0", "65536", "abc", "3001.5"])(
    "rejects invalid port %s",
    (PORT) => {
      expect(() => loadConfig({ PORT })).toThrow("PORT");
    },
  );
  it("rejects invalid environment and database identifiers without echoing values", () => {
    expect(() => loadConfig({ APP_ENV: "secret-token" })).toThrow("APP_ENV");
    expect(() =>
      loadConfig({ DB_NAME: "private-secret; DROP DATABASE x" }),
    ).toThrow("DB_NAME");
    try {
      loadConfig({ DB_NAME: "private-secret; DROP DATABASE x" });
    } catch (error) {
      expect(String(error)).not.toContain("private-secret");
    }
  });
  it("requires explicit environment in production runtime", () => {
    expect(() => loadConfig({ NODE_ENV: "production" })).toThrow("APP_ENV");
    expect(() => loadConfig({ NODE_ENV: "production", APP_ENV: "test" })).toThrow("APP_ENV");
  });
  it.each([
    "ftp://example.invalid", "https://user:secret@example.invalid",
    "https://example.invalid/path", "https://example.invalid?key=secret",
    "https://example.invalid#fragment",
  ])("rejects non-origin configuration %s", (APP_ORIGIN) => {
    expect(() => loadConfig({ APP_ORIGIN })).toThrow("APP_ORIGIN");
  });
  it("normalizes an origin with a trailing slash", () => {
    expect(loadConfig({ APP_ORIGIN: "https://example.invalid/" }).APP_ORIGIN).toBe("https://example.invalid");
  });
  it.each(["production", "staging"])(
    "requires HTTPS and dedicated DB credentials in %s",
    (APP_ENV) => {
      expect(() => loadConfig({ APP_ENV })).toThrow();
      expect(() =>
        loadConfig({
          APP_ENV,
          APP_ORIGIN: "http://example.invalid",
          DB_USER: "root",
        }),
      ).toThrow();
      expect(
        loadConfig({
          APP_ENV,
          APP_ORIGIN: "https://example.invalid",
          DB_USER: "ldss_app",
          DB_PASSWORD: "test-only-placeholder",
        }).APP_ENV,
      ).toBe(APP_ENV);
    },
  );
});
