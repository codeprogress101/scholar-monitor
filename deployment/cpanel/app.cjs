// Packaged as app.js beneath a CommonJS package.json for Passenger's loader.
// The compiled application remains ESM in dist/server.
if (globalThis.PhusionPassenger) {
  globalThis.PhusionPassenger.configure({ autoInstall: false });
}
import("./hosting/start.mjs").catch(() => {
  console.error("LDSS startup failed. Check the private hosting configuration.");
  process.exitCode = 1;
});
