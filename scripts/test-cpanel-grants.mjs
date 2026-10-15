import assert from "node:assert/strict";
import { summarizeGrants } from "../deployment/cpanel/grant-summary.mjs";
const target = "iskotwfh_ldss_monitor";
for (const scope of [target, String.raw`iskotwfh\_ldss\_monitor`]) {
  const result = summarizeGrants([`GRANT ALL PRIVILEGES ON \`${scope}\`.* TO 'operator'@'localhost'`], target);
  assert.equal(result.canCreateTables, true);
  assert.equal(result.canCreateViews, true);
  assert.equal(result.canCreateTriggers, true);
  assert.equal(result.canDelegateScopedPermissions, false);
}
const partial = summarizeGrants(["GRANT CREATE VIEW ON `iskotwfh_ldss_monitor`.* TO 'operator'@'localhost'", "GRANT ALL PRIVILEGES ON `unrelated`.* TO 'operator'@'localhost' WITH GRANT OPTION"], target);
assert.equal(partial.canCreateTables, false);
assert.equal(partial.canCreateViews, true);
assert.equal(partial.canCreateTriggers, false);
assert.equal(partial.canDelegateScopedPermissions, false);
assert.equal(summarizeGrants(["GRANT CREATE, TRIGGER ON *.* TO 'operator'@'localhost' WITH GRANT OPTION"], target).canDelegateScopedPermissions, true);
assert.equal(summarizeGrants(["GRANT USAGE ON *.* TO 'operator'@'localhost' IDENTIFIED BY PASSWORD 'synthetic-hash'"], target).canCreateTables, false);
console.log("PASS escaped database scopes, exact privilege names, unrelated grants and delegation distinction; no authentication metadata returned.");
