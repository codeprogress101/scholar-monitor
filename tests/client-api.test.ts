import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchHealth } from "../src/api";

afterEach(() => vi.unstubAllGlobals());
describe("browser service response handling", () => {
  it("accepts the expected health response", async () => {
    const data = {
      status: "ok",
      service: "ldss-api",
      release: "0.1.0",
      checkpoint: "F00",
      database: "connected",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json(data)),
    );
    expect(await fetchHealth()).toEqual(data);
  });
  it("rejects a proxy error instead of displaying a connected state", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("Unavailable", { status: 503 })),
    );
    await expect(fetchHealth()).rejects.toThrow("did not respond");
  });
  it("rejects unexpected JSON instead of treating any HTTP 200 as healthy", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ status: "ok" })),
    );
    await expect(fetchHealth()).rejects.toThrow("unexpected response");
  });
});
