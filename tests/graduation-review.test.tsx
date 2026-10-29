import {describe,it,expect} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {EvidenceFields} from '../src/GraduationReview';
import {graduationCommandPath,restoreGraduationCommand} from '../src/graduation-api';
describe('graduation source entry and recovery boundary',()=>{
 it('requires an explicit source type and leaves genuinely unknown source dates blank',()=>{const noop=()=>{};const html=renderToStaticMarkup(createElement(EvidenceFields,{reference:'',setReference:noop,issuer:'',setIssuer:noop,type:'',setType:noop,location:'',setLocation:noop,issuedOn:'',setIssuedOn:noop}));expect(html).toContain('Select actual source type');expect(html).toContain('Official school curriculum');expect(html).toContain('Source issued date, if known');expect(html).not.toContain('2026-');expect(html).not.toContain('checked');});
 it('accepts only the new command paths and never restores a financial command into this namespace',()=>{expect(graduationCommandPath('program-duration-references')).toBe(true);expect(graduationCommandPath('graduation-monitoring-cases/12345678-1234-4234-8234-123456789012/events')).toBe(true);for(const p of ['payouts/paid','scholar-registrations','graduation-monitoring-cases/x/events','../payments'])expect(graduationCommandPath(p)).toBe(false);expect(restoreGraduationCommand('no-browser-storage')).toBe(null);});
});
