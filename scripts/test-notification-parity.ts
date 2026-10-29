import assert from "node:assert/strict";
import type { AuthorizationService } from "../server/authorization/service.js";
import { NotificationService } from "../server/notifications/service.js";
import { LegacyNotificationService } from "../tests/fixtures/legacy-notifications.js";

function originalPendingPresentation<T>(value:T):T {
 const clone=structuredClone(value) as T & {items?:{id:string;kind:string;href:string;nextAction?:string|null}[]};
 for(const n of clone.items??[])if(n.id.startsWith(n.kind+":")){
  delete n.nextAction;
  if(n.kind==="masterlist"||n.kind==="payroll"){
   const [page,query]=n.href.split('?'),params=new URLSearchParams(query);
   if(n.kind==="masterlist")params.delete('workflow');
   else {params.delete('task');params.delete('view');}
   n.href=page+'?'+params;
  }
 }
 return clone;
}
const exactOriginal=(actual:unknown,expected:unknown)=>assert.deepEqual(originalPendingPresentation(actual),expected);

export async function assertNotificationCurrent(authorization: AuthorizationService, actors: string[]) {
  const before = new LegacyNotificationService(authorization), after = new NotificationService(authorization);
  for (const actor of actors) for (const mode of ["updates", "pending"]) {
    const expected = await before.read(actor, { mode });
    exactOriginal(await after.read(actor, { mode }), expected);
    assert.deepEqual(await after.count(actor), { unread: expected.unread });
    assert.deepEqual(await after.pending(actor), { pending: expected.pending, groups: expected.groups });
    for (const semester of expected.semesters) {
      const filtered = await before.read(actor, { mode, semester: semester.id });
      exactOriginal(await after.page(actor, { mode, semester: semester.id }), { items: filtered.items, total: filtered.total, offset: 0, limit: 25 });
    }
  }
}

/** Independent pre-R06 oracle, executed only against caller-owned test databases. */
export async function assertNotificationParity(authorization: AuthorizationService, actors: string[]) {
  const before = new LegacyNotificationService(authorization), after = new NotificationService(authorization);
  for (const actor of actors) {
    for (const mode of ["updates", "pending"] as const) {
      const initial = await before.read(actor, { mode });
      exactOriginal(await after.read(actor, { mode }), initial);
      assert.deepEqual(await after.pending(actor), { pending: initial.pending, groups: initial.groups });
      assert.deepEqual(await after.count(actor), { unread: initial.unread });
      assert.deepEqual(await after.periods(actor, { mode }), { years: initial.years, semesters: initial.semesters });
      const offsets = [...new Set([0, 25, Math.floor(initial.total / 50) * 25, Math.max(0, initial.total - 25), initial.total])];
      for (const offset of offsets) {
        const old = offset === 0 ? initial : await before.read(actor, { mode, offset });
        const page = await after.page(actor, { mode, offset });
        exactOriginal(page, { items: old.items, total: old.total, offset, limit: 25 });
      }
      for (const filter of [
        ...["admission", "account", "export", "academic", "standing", "masterlist", "masterlist-amendment", "roster", "document", "override", "payroll", "payroll-amendment", "payment-correction", "import", "unknown", "STANDING", "standing ", "Ácademic", "ACCOUNT"].map(type => ({ type })),
        ...initial.years.map(y => ({ year: y.id })), ...initial.semesters.map(s => ({ semester: s.id })),
        ...initial.items.slice(0, 1).map(n => ({ source: n.sourceId })),
      ]) exactOriginal(await after.read(actor, { mode, ...filter }), await before.read(actor, { mode, ...filter }));
      for (const limit of [50, 100]) {
        const expected = [];
        for (let offset = 0; offset < Math.min(limit, initial.total); offset += 25) expected.push(...(await before.read(actor, { mode, offset })).items);
        const page = await after.page(actor, { mode, limit });
        exactOriginal({items:page.items}, {items:expected}); assert.equal(page.total, initial.total);
      }
      if (mode === "updates") {
        const unread = await after.page(actor, { mode, unread: "true", limit: 100 });
        assert.equal(unread.total, initial.unread); assert.ok(unread.items.every(n => !n.read));
        // Current fixture has at most a page of read items: exact filtered oracle.
        if (initial.total <= 100) {
          const all = await after.page(actor, { mode, limit: 100 });
          assert.deepEqual(unread.items, all.items.filter(n => !n.read));
        }
      }
    }
  }
}
