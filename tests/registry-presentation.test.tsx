import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import RegistryEligibilityCell,{compactRegistryLabel} from '../src/RegistryEligibility';
import {initialPlacementSchema} from '../server/scholars/annual-intake-validation';

describe('Registry status presentation preserves its financial meaning',()=>{
 it('shortens membership without presenting it as a payment outcome',()=>{
  expect(compactRegistryLabel('Already on payroll')).toBe('On payroll');
  for(const label of ['Paid','Unclaimed','Needs review','Unknown future status'])expect(compactRegistryLabel(label)).toBe(label);
 });
 it('retains the full source label and a scholar-specific details action',()=>{
  const html=renderToStaticMarkup(<RegistryEligibilityCell compact scholarLabel="LDSS-2026-00001" scholarId="person" mode="payout" state={{loading:false,error:'',data:{periods:[],periodId:null,items:[{scholarId:'person',eligible:false,reasons:[{code:'ON_PAYROLL',message:'Existing payroll membership'}],payment:null,inclusion:null,payout:{status:'Already on payroll',eligible:false}}]}}}/>);
  expect(html).toContain('On payroll');expect(html).toContain('Already on payroll');expect(html).toContain('Payout details for LDSS-2026-00001');expect(html).not.toContain('>Paid<');
 });
});
describe('Supplied text does not become an academic reference ID',()=>{
 it('keeps unknown initial facts nullable without coercing abbreviations into IDs',()=>{
  expect(initialPlacementSchema.parse({schoolId:'',courseId:'',yearLevel:''})).toEqual({schoolId:null,courseId:null,yearLevel:null});
  for(const value of [{schoolId:'CNSC'},{courseId:'BSIT'},{schoolName:'CNSC'},{courseName:'BSIT'}])expect(initialPlacementSchema.safeParse(value).success).toBe(false);
 });
});
