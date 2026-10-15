import assert from "node:assert/strict";
import type { LightMyRequestResponse } from "fastify";
import { OFFICIAL_COHORT } from "../server/continuing/official-cohort.js";

type Request = (role: string, path: string, body?: object, key?: string) => Promise<LightMyRequestResponse>;
export async function testRolloverReceiving(request: Request, year: string, previousSemester: string, scholar: string, annual: string) {
  const ok = async (p: Promise<LightMyRequestResponse>) => { const r = await p; assert.equal(r.statusCode, 200, r.body); return r.json(); };
  const config = (kind: string, fields: object) => ok(request("system_admin", `/api/v1/configuration/${kind}`, { action: "create", expectedVersion: 0, fields }));
  const semester = await config("semesters", { code: "ROLLED-TERM1", name: "Rollover current semester", academicYearId: year, startsOn: "2026-01-01", endsOn: "2026-12-31" });
  const definitions: string[] = [];
  for (const code of ["ROLLED-COR", "ROLLED-COG"]) definitions.push((await ok(request("system_admin", "/api/v1/requirement-definitions", { action: "create", expectedVersion: 0, code, fields: { documentKind: code.endsWith("COR") ? "enrollment" : "grades", name: code, instructions: "Present physical document", appliesTo: "semester", semesterId: null, effectiveFrom: "2026-01-01", effectiveUntil: null } }))).id);
  const path = `/api/v1/continuing-rosters/${OFFICIAL_COHORT}/semester-setup`;
  await ok(request("coordinator", path, { semesterId: semester.id, expectedSemesterVersion: 1, coverageReason: "Synthetic explicitly reviewed predecessor calendar", predecessorSemesterId: previousSemester, corDefinitionVersionId: definitions[0], cogDefinitionVersionId: definitions[1], issuer: "Synthetic Coordinator", reference: "ROLLOVER-TEST", sourceReference: "Synthetic semester coverage", reviewed: true }));
  const setup = (await ok(request("coordinator", path))).setups[0];
  await ok(request("coordinator", path + "/availability", { scopeId: setup.id, expectedRevision: 1, mode: "enabled", expectedSemesterVersion: 1, expectedPredecessorVersion: 1, reviewed: true }));
  const provision = `/api/v1/scholars/${scholar}/semester-requirements/provision`;
  assert.equal((await request("system_admin", provision, { periodId: semester.id })).statusCode, 403);
  await ok(request("staff", provision, { periodId: semester.id }));
  const checklists = await ok(request("staff", `/api/v1/scholars/${scholar}/semester-requirements`));
  assert.ok(JSON.stringify(checklists).includes("not_submitted"));
  const list = await ok(request("staff", `/api/v1/scholars/${scholar}/scholarships`));
  assert.equal(list.items.find((r: { id: string }) => r.id === annual).status, "continuing");
  const school = await config("schools", { code: "ROLLED-SCHOOL", name: "Rollover confirmed school" });
  const course = await config("courses", { code: "ROLLED-COURSE", name: "Rollover confirmed course" });
  await ok(request("staff", `/api/v1/scholars/${scholar}/academic-records`, { academicYearId: year, schoolId: school.id, courseId: course.id, yearLevel: "Second year" }));
  const master = await ok(request("staff", "/api/v1/masterlists", { academicYearId: year, title: "Rollover pending approval" }));
  await ok(request("staff", `/api/v1/masterlists/${master.id}/entries`, { action: "add", expectedVersion: 1, scholarId: scholar, awardNumber: null }));
  const cycle = await ok(request("system_admin", "/api/v1/payout-cycles", { action: "create", expectedVersion: 0, code: "ROLLED-PAY", semesterId: semester.id, expectedSemesterVersion: 1, fields: { name: "Rollover payroll", targetDate: "2026-10-08", requirements: definitions.map(definitionVersionId => ({ definitionVersionId, allowWaiver: false })) } }));
  await ok(request("coordinator", `/api/v1/payout-cycles/${cycle.id}/open`, { action: "open", expectedVersion: 1 }));
  const eligibility = await ok(request("staff", `/api/v1/payout-cycles/${cycle.id}/scholarships/${annual}/eligibility`));
  assert.equal(eligibility.current.eligible, false);
  console.log("PASS Rolled scholar receives next-year COR/COG and joins draft without repeat selection; no copied verification, official approval or payroll eligibility; System Administrator receiving denied");
}
