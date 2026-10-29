import {describe,expect,it} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import PaymentStatusBadge from "../src/PaymentStatusBadge";

describe("payment outcome labels",()=>{
 it.each([['paid','Paid'],['pending','Pending'],['unclaimed','Unclaimed'],['needs_review','Needs resolution']] as const)("keeps %s readable and contextual without adding a keyboard stop",(outcome,label)=>{
  const html=renderToStaticMarkup(<table><tbody><tr><td><PaymentStatusBadge outcome={outcome}/></td><td><button>Select scholar</button></td></tr></tbody></table>);
  expect(html).toContain(`aria-label="Payment outcome: ${label}"`);expect(html).toContain(`>${label}</span>`);
  expect(html).not.toContain('tabindex');expect(html).not.toContain('aria-live');expect(html).not.toContain('disabled');
  expect(html).toContain('<button>Select scholar</button>');
 });
 it("retains the report review qualification and does not relabel a paid outcome",()=>{
  expect(renderToStaticMarkup(<PaymentStatusBadge outcome="needs_review" reviewLabel="Withheld / Review"/>)).toContain('Payment outcome: Withheld / Review');
  expect(renderToStaticMarkup(<PaymentStatusBadge outcome="paid" reviewLabel="Withheld / Review"/>)).toContain('Payment outcome: Paid');
 });
});
