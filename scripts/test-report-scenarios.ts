import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import type { testFinalization } from "./test-ovr-finalization-scenarios.js";
import type { OperationalReport, ReportKind } from "../server/reports/model.js";
import type { EligibilityView } from "../server/eligibility/model.js";
import type { OvrDetail } from "../server/ovr/model.js";
import { ovrEligibilityIssues } from "../server/ovr/rules.js";

export async function testReports(
  c: Parameters<typeof testFinalization>[0] & {
    view: () => Promise<EligibilityView>;
  },
) {
  const path = `/api/v1/reports/operational?cycleId=${c.cycleId}`;
  const get = async (kind: ReportKind, extra = "", role = "staff") => {
    const r = await c.request(role, `${path}&kind=${kind}${extra}`);
    assert.equal(r.statusCode, 200, r.body);
    assert.equal(r.headers["cache-control"], "no-store");
    const result = r.json<OperationalReport>();
    for (const field of [
      "birthDate",
      "email",
      "addressLine",
      "phone",
      "reference_text",
      "actorName",
    ])
      assert.equal(Object.hasOwn(result, field), false);
    return result;
  };
  for (const role of ["system_admin", "unassigned"])
    for (const kind of ["scholars", "payments", "masterlists"])
      assert.equal(
        (await c.request(role, `${path}&kind=${kind}`)).statusCode,
        403,
      );
  for (const query of [
    "kind=secret",
    "kind=scholars&limit=101",
    "kind=scholars&offset=-1",
    "kind=scholars&email=true",
  ])
    assert.equal(
      (await c.request("staff", `${path}&${query}`)).statusCode,
      422,
    );
  assert.equal(
    (
      await c.request(
        "staff",
        `/api/v1/reports/operational?cycleId=${randomUUID()}&kind=scholars`,
      )
    ).statusCode,
    404,
  );
  const [auditBefore] = await c.admin.query<RowDataPacket[]>(
    "SELECT COUNT(*) AS n FROM audit_logs",
  );
  const view = await c.view(),
    year = view.current.sources.cycle.academicYearId;
  const scholars = await get("scholars"),
    coord = await get("scholars", "", "coordinator");
  const [source] = await c.admin.execute<RowDataPacket[]>(
    "SELECT operational_status,COUNT(*) AS n FROM scholarship_records WHERE academic_year_id=? GROUP BY operational_status",
    [year],
  );
  assert.equal(
    scholars.total,
    source.reduce((n, r) => n + Number(r.n), 0),
  );
  assert.deepEqual(
    scholars.counts,
    Object.fromEntries(
      source.map((r) => [r.operational_status ?? "not_assigned", Number(r.n)]),
    ),
  );
  assert.deepEqual(scholars.items, coord.items);
  const page = await get("scholars", "&limit=1");
  assert.equal(page.sourceHash, scholars.sourceHash);
  assert.equal(page.total, scholars.total);
  assert.deepEqual(page.items, scholars.items.slice(0, 1));
  assert.deepEqual(
    (await get("scholars", `&offset=${scholars.total}`)).items,
    [],
  );
  const eligible = await get("eligibility");
  const row = eligible.items.find((r) => r.id === c.annualId)!;
  assert.ok(row);
  assert.equal(row.values[2], view.effective.label);
  assert.equal(
    row.values[3],
    ovrEligibilityIssues(view).length ? "Blocked" : "Passed",
  );
  assert.equal(
    row.values[4],
    ovrEligibilityIssues(view)
      .map((i) => i.message)
      .join(" "),
  );
  assert.equal(row.values[5], view.current.sourceHash);
  for (const kind of ["missing", "verification"] as const) {
    const report = await get(kind);
    const expected = view.current.sources.requirements.filter((r) =>
      kind === "missing"
        ? [null, "not_submitted", "for_correction", "rejected"].includes(
            r.status,
          )
        : r.status === "for_verification",
    );
    assert.equal(
      report.items.filter((r) => r.id.startsWith(c.annualId + ":")).length,
      expected.length,
    );
    assert.equal(
      Object.values(report.counts).reduce((a, b) => a + b, 0),
      report.total,
    );
  }
  const masters = await get("masterlists");
  const [masterRows] = await c.admin.execute<RowDataPacket[]>(
    "SELECT m.id,(SELECT COUNT(*) FROM masterlist_entries e WHERE e.masterlist_id=m.id AND e.removed_at IS NULL) AS n FROM masterlist_versions m WHERE academic_year_id=?",
    [year],
  );
  assert.equal(masters.total, masterRows.length);
  for (const row of masterRows)
    assert.equal(
      masters.items.find((r) => r.id === row.id)?.values[3],
      String(row.n),
    );
  const ovr = await get("ovr"),
    payments = await get("payments");
  const [batches] = await c.admin.execute<RowDataPacket[]>(
    "SELECT id FROM ovr_batches WHERE cycle_id=?",
    [c.cycleId],
  );
  assert.equal(ovr.total, batches.length);
  let expectedOutcomes = 0;
  for (const batch of batches) {
    const response = await c.request(
      "staff",
      `/api/v1/ovr-batches/${batch.id}`,
    );
    assert.equal(response.statusCode, 200, response.body);
    const detail = response.json<OvrDetail>(),
      row = ovr.items.find((r) => r.id === batch.id)!;
    assert.equal(row.values[1], detail.batch.state);
    assert.equal(row.values[5], detail.reconciliation.paidTotal);
    for (const entry of detail.effectiveFinalization?.snapshot.entries ?? []) {
      expectedOutcomes++;
      const payment = detail.payments.find(
        (p) => p.scholarshipId === entry.scholarshipId,
      );
      const reportRow = payments.items.find(
        (r) => r.id === `${batch.id}:${entry.scholarshipId}`,
      )!;
      assert.ok(reportRow);
      assert.equal(reportRow.values[3], payment?.outcome ?? "pending");
      assert.equal(reportRow.values[4], payment?.amount ?? "Not recorded");
    }
  }
  assert.equal(payments.total, expectedOutcomes);
  const [auditAfter] = await c.admin.query<RowDataPacket[]>(
    "SELECT COUNT(*) AS n FROM audit_logs",
  );
  assert.equal(
    auditAfter[0].n,
    auditBefore[0].n,
    "Reports must not mutate workflow history",
  );
  if(process.argv.includes('--report-capacity')) {
    const [[annual]]=await c.admin.execute<RowDataPacket[]>('SELECT academic_year_id FROM scholarship_records WHERE id=?',[c.annualId]);
    const before=await get('scholars'), missingBefore=await get('missing');
    const ids=Array.from({length:1500},()=>({scholar:randomUUID(),annual:randomUUID()}));
    for(let offset=0;offset<ids.length;offset+=250){
      const part=ids.slice(offset,offset+250);
      await c.admin.query("INSERT INTO scholars(id,first_name,last_name,academic_year_id,created_at,updated_at) VALUES "+part.map(()=>"(?,?,?, ?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))").join(','),part.flatMap((r,i)=>[r.scholar,'Synthetic','Capacity '+(offset+i),annual.academic_year_id]));
      await c.admin.query('INSERT INTO scholar_identifiers(scholar_id,entry_year,sequence_no) VALUES '+part.map(()=>'(?,?,?)').join(','),part.flatMap((r,i)=>[r.scholar,2098,offset+i+1]));
      await c.admin.query("INSERT INTO scholarship_records(id,scholar_id,academic_year_id,status,last_effective_on,created_at,updated_at) VALUES "+part.map(()=>"(?,?,?,'selected',CURRENT_DATE(),UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))").join(','),part.flatMap(r=>[r.annual,r.scholar,annual.academic_year_id]));
    }
    const started=Date.now(), full=await get('scholars'), missing=await get('missing');
    assert.equal(full.total,before.total+1500);
    assert.equal(missing.total,missingBefore.total+3000,'Two document requirements per synthetic scholar');
    const last=await get('scholars','&offset=1500&limit=100');
    assert.equal(last.sourceHash,full.sourceHash);assert.equal(last.total,full.total);
    console.log(JSON.stringify({reportCapacity:{scholars:1500,documents:3000,elapsedMs:Date.now()-started,completeTotals:true,paginationFingerprintStable:true}}));
    for(const r of ids){await c.admin.execute('DELETE FROM scholarship_records WHERE id=?',[r.annual]);await c.admin.execute('DELETE FROM scholar_identifiers WHERE scholar_id=?',[r.scholar]);await c.admin.execute('DELETE FROM scholars WHERE id=?',[r.scholar]);}
  }

}
