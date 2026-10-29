import { describe, expect, it } from "vitest";
import { payrollWorkspaceLinks } from "../src/payroll-workspace";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import PayrollWorkspaceNav from "../src/PayrollWorkspaceNav";

const cycle = "11111111-1111-1111-1111-111111111111";
const batch = "22222222-2222-2222-2222-222222222222";
const other = "33333333-3333-3333-3333-333333333333";
const selected = `#payouts?cycle=${cycle}&batch=${batch}`;
describe("P09 Payroll workspace navigation", () => {
  it("renders named navigation with exactly one current destination and real history links", () => {
    const html=renderToStaticMarkup(createElement(PayrollWorkspaceNav,{hash:`${selected}&view=reports`,actor:"synthetic-staff"}));
    expect(html).toContain('aria-label="Payroll workspace"');
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html.match(/<a /g)).toHaveLength(4);
    expect(html).not.toContain('role="tab"');
    expect(html).toContain('href="#payouts?');
  });
  it("keeps precisely the four routine work areas", () => {
    expect(payrollWorkspaceLinks(selected).links.map(v => v.label)).toEqual(["Payroll Batches", "Payment Recording", "Individual Payments", "Reports"]);
  });
  it.each(["recording", "reconciliation"])("keeps %s in Payment Recording without losing the batch", view => {
    const navigation = payrollWorkspaceLinks(`${selected}&view=${view}`);
    expect(navigation.active).toBe("recording");
    expect(navigation.links.find(v => v.id === "batches")?.href).toBe(selected);
  });
  it("preserves batch context through Individual Payments and back", () => {
    const individual = payrollWorkspaceLinks(selected).links[2].href;
    expect(payrollWorkspaceLinks(individual).links[1].href).toBe(`${selected}&view=recording`);
    expect(payrollWorkspaceLinks(individual).active).toBe("individual");
  });
  it("recovers UI context for an existing direct transaction link without forwarding its transaction ID to payroll", () => {
    const navigation = payrollWorkspaceLinks(`#individual-payments?transaction=${other}`, selected);
    expect(navigation.links[3].href).toBe(`${selected}&view=reports`);
    expect(navigation.links.every(v => !v.href.includes("transaction="))).toBe(true);
  });
  it("never pairs a new cycle with a remembered batch from another cycle", () => {
    expect(payrollWorkspaceLinks(`#payouts?cycle=${other}`, selected).links[1].href).toBe(`#payouts?cycle=${other}&view=recording`);
  });
  it("does not retain a batch without its cycle or retain arbitrary saved URL fields", () => {
    const navigation = payrollWorkspaceLinks(`#payouts?batch=${batch}&request=arbitrary&version=1`);
    expect(navigation.links[0].href).toBe("#payouts");
  });
  it("rejects untrusted navigation identifiers", () => {
    expect(payrollWorkspaceLinks("#payouts?cycle=javascript:alert(1)&batch=anything").links[0].href).toBe("#payouts");
  });
  it("recognizes report direct links and discards stale view state when returning to batches", () => {
    const navigation = payrollWorkspaceLinks(`${selected}&view=reports&annual=${other}`);
    expect(navigation.active).toBe("reports");
    expect(navigation.links[0].href).toBe(selected);
  });
});
