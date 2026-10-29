import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import ExcelJS from "exceljs";
import { ExportService } from "../server/exports/service.js";
import type { LightMyRequestResponse } from "fastify";
import type { Pool, RowDataPacket } from "mysql2/promise";
import { AuthorizationService } from "../server/authorization/service.js";
import { currentPayout } from "../server/payouts/service.js";
import { cachedReads } from "../server/read-cache.js";
import { cohortReads } from "../server/eligibility/cohort-reads.js";
import { candidateReads } from "../server/ovr/candidate-reads.js";
import type { EligibilityView } from "../server/eligibility/model.js";
import { REPORTS, type ReportKind } from "../server/reports/model.js";
import { readOperationalReport, ReportService } from "../server/reports/service.js";
import { legacyOperationalReport } from "../tests/fixtures/legacy-operational-report.js";

const stable = <T extends { generatedAt: string }>(value: T) => { const { generatedAt: _at, ...rest } = value; void _at; return rest; };
/** Whole legacy reports and bounded pages share one repeatable-read snapshot.
 * Compare all fields, not merely eligible counts or one representative scholar.
 */
export async function assertReportParity(pool: Pool, actor: string, cycleId: string) {
  let compared = 0;
  await new AuthorizationService(pool).readSnapshot(actor, "scholars.read", async db => {
    const cycle = await currentPayout(db, cycleId);
    const [annuals] = await db.execute<RowDataPacket[]>("SELECT id FROM scholarship_records WHERE academic_year_id=? ORDER BY id", [cycle.academicYearId]);
    const ids = annuals.map(r => String(r.id));
    const reads = await cohortReads(await candidateReads(cachedReads(db), ids, cycle.semesterId), cycle.academicYearId, cycle.semesterId, cycle.id, ids);
    const assessments = new Map<string, EligibilityView>();
    for (const kind of Object.keys(REPORTS) as ReportKind[]) {
      const base = { kind, cycleId, offset: 0, limit: 100 };
      const original = await legacyOperationalReport(reads, base, assessments);
      for (const limit of [25, 50, 100]) {
        const offsets = new Set([0, Math.floor(original.total / 2 / limit) * limit, Math.floor(Math.max(0, original.total - 1) / limit) * limit, original.total]);
        for (const offset of offsets) {
          const q = { ...base, limit, offset };
          const expected = await legacyOperationalReport(reads, q, assessments);
          const compatibility = await readOperationalReport(reads, q);
          assert.deepEqual(stable(compatibility), stable(expected), `${kind} complete hash/count/order/row parity at ${offset}/${limit}`);
          const page = await readOperationalReport(reads, q, undefined, true);
          assert.deepEqual(page.items, expected.items, `${kind} SQL page differs`);
          assert.equal(page.total, expected.total);
          assert.deepEqual(page.cycle, expected.cycle);
          assert.deepEqual(page.columns, expected.columns);
          assert.equal(page.scope, expected.scope);
          if (!["scholars", "eligibility", "masterlists", "ovr"].includes(kind)) assert.deepEqual(stable(page), stable(expected));
          else if (offset === 0 && original.total <= limit) assert.deepEqual(page.counts, expected.counts);
          compared++;
        }
      }
    }
  });
  console.log(`PASS R05 legacy/page parity: ${compared} kind/offset/limit cases, complete rows, global fingerprints and counts`);
}

export async function assertReportSnapshot(pool: Pool, actor: string, cycleId: string) {
  const [[database]] = await pool.query<RowDataPacket[]>("SELECT DATABASE() AS name");
  assert.match(database.name, /^ldss_f19_test_\d+_[a-f0-9]{8}$/, "Concurrent mutation is disposable-fixture only");
  const authorization = new AuthorizationService(pool), service = new ReportService(authorization);
  const q = { kind: "scholars" as const, cycleId, offset: 0, limit: 25 };
  const first = await service.page(actor, q);
  if (!first.items.length) return;
  const [[person]] = await pool.execute<RowDataPacket[]>("SELECT s.id,s.first_name FROM scholars s JOIN scholarship_records r ON r.scholar_id=s.id WHERE r.id=?", [first.items[0].id]);
  const scholarId = randomUUID(), annualId = randomUUID();
  try {
    await authorization.readSnapshot(actor, "scholars.read", async db => {
      const before = await readOperationalReport(db, q, undefined, true);
      const writer = await pool.getConnection();
      try {
        await writer.beginTransaction();
        await writer.execute("UPDATE scholars SET first_name=? WHERE id=?", ["R05 concurrent synthetic edit", person.id]);
        await writer.execute("INSERT INTO scholars(id,first_name,last_name,academic_year_id,created_at,updated_at) VALUES(?,?,?, ?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", [scholarId,"R05 concurrent","Disposable",before.cycle.academicYearId]);
        await writer.execute("INSERT INTO scholar_identifiers(scholar_id,entry_year,sequence_no) VALUES(?,2097,1)", [scholarId]);
        await writer.execute("INSERT INTO scholarship_records(id,scholar_id,academic_year_id,status,last_effective_on,created_at,updated_at) VALUES(?,?,?,'selected',CURRENT_DATE(),UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", [annualId,scholarId,before.cycle.academicYearId]);
        await writer.commit();
      } catch (error) { await writer.rollback(); throw error; } finally { writer.release(); }
      const during = await readOperationalReport(db, q, undefined, true);
      assert.deepEqual(stable(during), stable(before), "Page count and rows must use the same consistent snapshot");
    });
    const after = await service.page(actor, q);
    assert.equal(after.total, first.total + 1, "Next request must count the committed annual record");
    assert.notEqual(after.sourceHash, first.sourceHash, "Next request must see committed changes without cross-request caching");
  } finally {
    await pool.execute("UPDATE scholars SET first_name=? WHERE id=?", [person.first_name, person.id]);
    await pool.execute("DELETE FROM scholarship_records WHERE id=?", [annualId]);
    await pool.execute("DELETE FROM scholar_identifiers WHERE scholar_id=?", [scholarId]);
    await pool.execute("DELETE FROM scholars WHERE id=?", [scholarId]);
  }
  assert.deepEqual(stable(await service.page(actor, q)), stable(first));
  console.log("PASS R05 concurrent edit: stable in-flight count/rows, fresh next page/count, removed disposable insert and restored identity");
}

/** More than two 100-row pages; all mutations are synthetic and cleaned up. */
export async function assertReportCapacity(pool: Pool, actor: string, cycleId: string) {
  const [[database]] = await pool.query<RowDataPacket[]>("SELECT DATABASE() AS name");
  assert.match(database.name, /^ldss_f19_test_\d+_[a-f0-9]{8}$/);
  const authorization = new AuthorizationService(pool);
  const cycle = await authorization.readSnapshot(actor, "scholars.read", db => currentPayout(db, cycleId));
  const ids = Array.from({ length: 235 }, () => ({ scholar: randomUUID(), annual: randomUUID() }));
  try {
    for (let offset=0;offset<ids.length;offset+=100) {
      const part=ids.slice(offset,offset+100);
      await pool.query("INSERT INTO scholars(id,first_name,last_name,academic_year_id,created_at,updated_at) VALUES "+part.map(()=>"(?,?,?, ?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))").join(","),part.flatMap((r,i)=>[r.scholar,"R05Synthetic",`Capacity ${offset+i}`,cycle.academicYearId]));
      await pool.query("INSERT INTO scholar_identifiers(scholar_id,entry_year,sequence_no) VALUES "+part.map(()=>"(?,2096,?)").join(","),part.flatMap((r,i)=>[r.scholar,offset+i+1]));
      await pool.query("INSERT INTO scholarship_records(id,scholar_id,academic_year_id,status,last_effective_on,created_at,updated_at) VALUES "+part.map(()=>"(?,?,?,'selected',CURRENT_DATE(),UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))").join(","),part.flatMap(r=>[r.annual,r.scholar,cycle.academicYearId]));
    }
    await assertReportParity(pool, actor, cycleId);
    // Existing Excel export is a full filtered registration-year export, not a
    // report-page export. Keep its distinct scoping and audit command intact.
    const exported = await new ExportService(authorization).scholars(actor, { academicYearId: cycle.academicYearId, q: "R05Synthetic" }, randomUUID());
    const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(exported.buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    const sheet = workbook.getWorksheet("Scholars")!;
    assert.equal(sheet.rowCount, 236, "Export must include all 235 filtered scholars, not 25/50/100 rows");
    const identities = new Set<string>(); sheet.eachRow((r,n) => { if(n>1) identities.add(String(r.getCell(1).value)); });
    assert.equal(identities.size,235);
    console.log("PASS R05 235-scholar paging matrix and complete, unique filtered Excel export");
  } finally {
    for (const row of ids) {
      await pool.execute("DELETE FROM scholarship_records WHERE id=?", [row.annual]);
      await pool.execute("DELETE FROM scholar_identifiers WHERE scholar_id=?", [row.scholar]);
      await pool.execute("DELETE FROM scholars WHERE id=?", [row.scholar]);
    }
  }
}

export async function assertReportRoutes(request: (role: string, path: string) => Promise<LightMyRequestResponse>, cycleId: string) {
  for (const suffix of ["/page", "/summary"]) {
    const path = `/api/v1/reports/operational${suffix}?cycleId=${cycleId}`;
    for (const role of ["system_admin", "unassigned"]) for (const kind of ["scholars", "payments", "masterlists"]) assert.equal((await request(role, `${path}&kind=${kind}`)).statusCode,403);
    for (const extra of ["kind=secret", "kind=scholars&limit=0", "kind=scholars&limit=101", "kind=scholars&offset=-1", "kind=scholars&offset=100001", "kind=scholars&email=true"]) assert.equal((await request("staff", `${path}&${extra}`)).statusCode,422);
    assert.equal((await request("staff", `/api/v1/reports/operational${suffix}?cycleId=${randomUUID()}&kind=scholars`)).statusCode,404);
    for (const kind of Object.keys(REPORTS) as ReportKind[]) {
      const actual = await request("staff", `${path}&kind=${kind}`); assert.equal(actual.statusCode,200,actual.body);
      assert.equal(actual.headers["cache-control"],"no-store"); assert.equal(actual.headers.vary,"Cookie");
      const original = (await request("staff", `/api/v1/reports/operational?cycleId=${cycleId}&kind=${kind}`)).json(), page = actual.json();
      assert.equal(page.total,original.total); assert.deepEqual(page.cycle,original.cycle);
      if (suffix === "/page") { assert.deepEqual(page.items,original.items); assert.equal(page.countsScope,["scholars","eligibility","masterlists","ovr"].includes(kind)?"page":"report"); assert.match(page.sourceHash,/^[a-f0-9]{64}$/); }
      else { assert.match(page.sourceHash,/^[a-f0-9]{64}$/); assert.equal(page.sourceHashBasis,"dashboard-summary-v1");assert.deepEqual(page.counts,original.counts);assert.equal(page.items,undefined); assert.equal(page.columns,undefined); assert.ok(page.period.semesterId); }
    }
  }
  console.log("PASS R05 page/summary routes, all report permissions, strict pagination, unknown cycles, no-store, explicit hash bases and whole-report counts");
}
