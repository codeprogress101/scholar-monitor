import { randomUUID } from "node:crypto";
import type { Connection, RowDataPacket } from "mysql2/promise";
import { digest } from "../server/auth/crypto.js";
import { today } from "../server/scholars/validation.js";

/** Deliberately synthetic historical state, created only inside a disposable configuration test. */
export async function rolloverFixture(db: Connection, year: string, priorYear: string, actor: string) {
  const people: { id: string; annual: string; status: string; name: string }[] = [];
  for (const [index, status] of ["active", "active", "graduated", "suspended", "on_hold", "withdrawn", "disqualified", "unpublished"].entries()) {
    const id = randomUUID(), annual = randomUUID(), name = index === 1 ? "Returning" : `Rollover${index}`;
    await db.execute("INSERT INTO scholars(id,first_name,last_name,academic_year_id,created_at,updated_at) VALUES(?,?,'Synthetic',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", [id, name, year]);
    await db.execute("INSERT INTO scholar_identifiers(scholar_id,entry_year,sequence_no) VALUES(?,2025,?)", [id, index + 1]);
    await db.execute("INSERT INTO scholar_contacts(scholar_id) VALUES(?)", [id]);
    let source: string | null = null;
    if (index === 1) {
      source = randomUUID();
      await db.execute("INSERT INTO scholarship_records(id,scholar_id,academic_year_id,status,last_effective_on,created_at,updated_at) VALUES(?,?,?,'selected',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", [source, id, priorYear, today()]);
    }
    await db.execute("INSERT INTO scholarship_records(id,scholar_id,academic_year_id,status,last_effective_on,continuing_from_scholarship_id,operational_status,status_version,status_effective_on,created_at,updated_at) VALUES(?,?,?,?,?,?,?,1,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", [annual, id, year, source ? "continuing" : "selected", today(), source, status === "unpublished" ? "active" : status, today()]);
    people.push({ id, annual, status, name });
  }
  const masterlist = randomUUID();
  await db.execute("INSERT INTO masterlist_versions(id,academic_year_id,title,status,actor_id,created_at,updated_at) VALUES(?,?,'Synthetic outgoing official list','published',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", [masterlist, year, actor]);
  const snapshot = JSON.stringify({ masterlistId: masterlist, academicYearId: year, entries: people.filter(p => p.status !== "unpublished").map(p => ({ scholarId: p.id, snapshot: { scholarshipId: p.annual } })) });
  await db.execute("INSERT INTO masterlist_publications(masterlist_id,snapshot,snapshot_hash,effective_on,actor_id,actor_name,published_at) VALUES(?,?,?,?,?,'Synthetic Coordinator',UTC_TIMESTAMP(6))", [masterlist, snapshot, digest(snapshot), today(), actor]);
  for (const p of people.filter(p => p.status !== "unpublished")) await db.execute("INSERT INTO masterlist_activations(scholarship_id,masterlist_id,effective_on,activated_at) VALUES(?,?,?,UTC_TIMESTAMP(6))", [p.annual, masterlist, today()]);
  const [before] = await db.execute<RowDataPacket[]>("SELECT * FROM scholarship_records ORDER BY id");
  return { people, before };
}

/** Reproduce the historical Diego defect: raw Active, but an authoritative no-stipend graduation correction remains. */
export async function correctedGraduateFixture(db: Connection, annual: string, semester: string, year: string, actor: string) {
  const original = randomUUID(), correction = randomUUID();
  for (const [i, id] of [original, correction].entries()) {
    await db.execute("INSERT INTO status_change_requests(id,scholarship_id,expected_version,from_status,to_status,kind,corrects_request_id,effective_on,reason_code,reason,reference_text,actor_id,actor_name,created_at) VALUES(?,?,?,?,?,?,?,?, 'GRADUATION','Synthetic historical defect','SYNTHETIC',?,'Synthetic Coordinator',UTC_TIMESTAMP(6))", [id, annual, i+1, i ? "graduated" : "active", i ? "active" : "graduated", i ? "correction" : "change", i ? original : null, today(), actor]);
    await db.execute("INSERT INTO status_change_decisions(request_id,decision,actor_id,actor_name,reason,reference_text,resulting_version,occurred_at) VALUES(?,'approve',?,'Synthetic Coordinator','Synthetic historical fixture','SYNTHETIC',?,UTC_TIMESTAMP(6))", [id, actor, i+2]);
  }
  await db.execute("INSERT INTO graduation_confirmations(request_id,scholarship_id,semester_id,actor_id,recorded_at) VALUES(?,?,?,?,UTC_TIMESTAMP(6))", [original, annual, semester, actor]);
  await db.execute("INSERT INTO graduation_record_corrections(request_id,graduated_before_year_id,no_outstanding_stipend,operator_reference,reason,recorded_at) VALUES(?,?,1,'SYNTHETIC','Historical graduation; no stipend due',UTC_TIMESTAMP(6))", [original, year]);
  await db.execute("UPDATE scholarship_records SET operational_status='active',status_version=3 WHERE id=?", [annual]);
}
