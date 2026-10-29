import{ApiError}from"../src/auth-api";
import{masterlistResultUncertain,definitiveMasterlistConflict}from"../src/prior-command";
import {describe,it,expect} from "vitest";
import{renderToStaticMarkup}from"react-dom/server";
import{ActionButton,OperationProgress}from"../src/ActionProgress";
describe("Action loading feedback",()=>{
 it("disables a pending action and supplies its active name",()=>{const s=renderToStaticMarkup(<ActionButton pending activeLabel="Verifying...">Verify document</ActionButton>);expect(s).toContain('disabled=""');expect(s).toContain('aria-busy="true"');expect(s).toContain("Verifying...");expect(s).not.toContain("Verify document");expect(s).toContain('aria-hidden="true"');expect(s).toContain('role="status"');expect(s).toContain('aria-live="polite"');});
 it("preserves a definitive disabled restriction after loading ends",()=>{expect(renderToStaticMarkup(<ActionButton pending={false} disabled>Finalize</ActionButton>)).toContain('disabled=""');});
 it("restores the normal label when no action is pending",()=>{const s=renderToStaticMarkup(<ActionButton pending={false}>Save</ActionButton>);expect(s).not.toContain("action-spinner");expect(s).not.toContain('disabled=""');expect(s).toContain("Save");});
 it("shows an actual identity and supplied reviewed count without invented progress",()=>{const s=renderToStaticMarkup(<OperationProgress operation="Finalizing Payroll" identity="PAY-003 / actual-id" count={834} pending/>);expect(s).toContain("PAY-003 / actual-id");expect(s).toContain("834 reviewed scholars");expect(s).toContain('role="status"');expect(s).not.toContain("progressbar");expect(s).not.toContain("%");});
 it.each([undefined,NaN,-1,1.5,Infinity])("does not invent a verified count from %j",count=>{expect(renderToStaticMarkup(<OperationProgress operation="Creating payroll draft" identity="cycle-id" count={count} pending/>)).not.toContain("reviewed scholars");});
 it("keeps the actual uncertain reason and supported exact retry",()=>{const s=renderToStaticMarkup(<OperationProgress operation="Recording payments" identity="PAY-002" pending={false} uncertain error="Response not confirmed" retry={()=>{}}/>);expect(s).toContain("Result not confirmed");expect(s).toContain("Response not confirmed");expect(s).toContain("Retry Exact Action");expect(s).not.toContain("action-spinner");expect(s).not.toContain("Cancel");});
});

describe("Retained Masterlist response safety",()=>{
 it.each([401,403,500])("retains an unresolved command after retry HTTP %s",status=>{expect(masterlistResultUncertain(new ApiError(status,"AUTH_REQUIRED","Unavailable"),true)).toBe(true);});
 it("recognizes only post-ledger stale evidence as a definitive retry rejection",()=>{const e=new ApiError(409,"SELECTION_CHANGED","Review again");expect(masterlistResultUncertain(e,true)).toBe(false);expect(definitiveMasterlistConflict(e,"masterlists/00000000-0000-0000-0000-000000000000/add-scope")).toBe(true);expect(definitiveMasterlistConflict(e,"ovr-batches/id/finalize")).toBe(false);});
 it("never clears an uncertain changed-key conflict as a new operation",()=>{expect(masterlistResultUncertain(new ApiError(409,"IDEMPOTENCY_CONFLICT","Different payload"),true)).toBe(true);});
});
