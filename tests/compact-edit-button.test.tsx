import {describe,it,expect} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import CompactEditButton from '../src/CompactEditButton';

describe('Compact secondary edit action',()=>{
 it('has a specific accessible name, tooltip and non-submit button semantics',()=>{
  const html=renderToStaticMarkup(createElement(CompactEditButton,{label:'Edit payment date for LDSS-2026-00001',onClick:()=>{}}));
  expect(html).toContain('type="button"');
  expect(html).toContain('aria-label="Edit payment date for LDSS-2026-00001"');
  expect(html).toContain('title="Edit payment date for LDSS-2026-00001"');
  expect(html).toContain('aria-hidden="true"');
  expect(html).not.toContain('disabled=""');
 });
 it('retains the caller’s disabled guard',()=>{
  expect(renderToStaticMarkup(createElement(CompactEditButton,{label:'Edit payment date',disabled:true,onClick:()=>{}}))).toContain('disabled=""');
 });
});
