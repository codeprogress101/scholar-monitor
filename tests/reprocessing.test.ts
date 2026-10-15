import { describe, expect, it } from "vitest";
import { claimPeriodEnded, philippineDay } from "../server/ovr/claim-deadline";
import { parseProcessing } from "../server/ovr/processing-service";
describe("semester claim deadline",()=>{
  it("permits the last Philippine day and expires at the next midnight",()=>{
    expect(claimPeriodEnded("2026-12-31",philippineDay(new Date("2026-12-31T15:59:59.999Z")))).toBe(false);
    expect(claimPeriodEnded("2026-12-31",philippineDay(new Date("2026-12-31T16:00:00.000Z")))).toBe(true);
    expect(claimPeriodEnded(null,"2026-12-31")).toBe(true);
  });
  it("requires an explicit unpaid classification and explanation for review or withholding",()=>{
    const input={expectedRevision:1,effectiveOn:"2026-01-01",reason:"Synthetic reconciliation",reference:"TEST",scholarshipId:"11111111-1111-4111-8111-111111111111",outcome:"not_paid",amount:"0.00",remarks:""};
    expect(()=>parseProcessing("record-payment",input)).toThrow();
    expect(parseProcessing("record-payment",{...input,unpaidReason:"did_not_claim"})).toMatchObject({unpaidReason:"did_not_claim"});
    for(const unpaidReason of ["withheld","review"]) {
      expect(()=>parseProcessing("record-payment",{...input,unpaidReason})).toThrow();
      expect(parseProcessing("record-payment",{...input,unpaidReason,remarks:"Awaiting review"})).toMatchObject({unpaidReason});
    }
  });
});
