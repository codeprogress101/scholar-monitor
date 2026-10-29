import { describe, it, expect } from "vitest";
import type { PoolConnection } from "mysql2/promise";
import { parseNoticeFilters, noticeLink } from "../server/notifications/service";
import { notificationQuery } from "../server/notifications/queries";
import { sourceSql } from "../server/notifications/sources";
import { sourceSql as legacySources } from "./fixtures/legacy-notification-sources";

const db = { escape: (v: string) => `'${v.replaceAll("'", "''")}'` } as PoolConnection;
const input = parseNoticeFilters({});
describe("R06 bounded authoritative notifications", () => {
  it("keeps every original source, audience and workflow calculation", () => { expect(sourceSql).toBe(legacySources); });
  it("counts without hydrating titles, pending rules, periods or payroll JSON", () => {
    const sql = notificationQuery(db, "actor", ["ovr.prepare"], { ...input, unread: true }, "count")!;
    expect(sql).toContain("SUM(count)"); expect(sql).toContain("nr.event_id IS NULL");
    expect(sql).not.toContain("JSON_EXTRACT"); expect(sql).not.toContain("AS title");
    expect(sql).not.toContain("JOIN academic_years"); expect(sql).not.toContain("AS pending_permission");
  });
  it("prunes unreadable branches before SQL, without trusting client audiences", () => {
    expect(notificationQuery(db, "actor", [], input, "page")).toBeNull();
    const sql = notificationQuery(db, "actor", ["users.manage"], input, "page")!;
    expect(sql).toContain("FROM users q"); expect(sql).not.toContain("requirement_instances");
    expect(() => parseNoticeFilters({ userId: "other" })).toThrow();
    expect(() => parseNoticeFilters({ role: "coordinator" })).toThrow();
  });
  it.each([25, 50, 100])("bounds keys and defers details for %i rows", limit => {
    const sql = notificationQuery(db, "actor", ["scholars.read"], { ...input, offset: 100, limit, year: "year", type: "standing" }, "page")!;
    expect(sql).toContain(`LIMIT ${100 + limit}`); expect(sql).toContain(`LIMIT ${limit} OFFSET 100`);
    expect(sql).toContain("a.academic_year_id='year'"); expect(sql).not.toContain(" AS title");
    const detail = notificationQuery(db, "actor", ["scholars.read"], input, "details", ["event-id"])!;
    expect(detail).toContain("n.id IN ('event-id')");
  });
  it("validates bounds and retains chronological and pending ordering", () => {
    for (const raw of [{ limit: 101 }, { offset: -1 }, { semester: "bad" }, { unread: "yes" }]) expect(() => parseNoticeFilters(raw)).toThrow();
    expect(notificationQuery(db, "a", ["scholars.read"], input, "page")).toContain("ORDER BY sort_time DESC,notice_id");
    expect(notificationQuery(db, "a", ["scholars.read", "requirements.verify"], { ...input, mode: "pending" }, "page")).toContain("ORDER BY sort_time ASC,notice_id");
  });
  it("retains database type-filter collation instead of JavaScript equality", () => {
    const sql = notificationQuery(db, "actor", ["scholars.read"], { ...input, type: "STANDING " }, "page")!;
    expect(sql).toContain("'standing'='STANDING '");
    expect(sql).toContain("FROM status_change_requests");
  });
  it("preserves actionable source/version/year deep links", () => {
    expect(noticeLink({ kind: "document", source_id: "doc", scholar_id: "scholar", revision: 2, year_id: "year" })).toBe("#scholars?request=doc&version=2&scholar=scholar&section=requirements&academicYear=year&document=doc");
  });
});
