import {describe,it,expect} from 'vitest';
import {graduationRoute,graduationPanelAddress,closeGraduationPanel} from '../src/graduation-navigation';
const id='12345678-1234-4234-8234-123456789012';
describe('graduation review navigation',()=>{
 it('retains committed filter/page/context and strips UI-only fields from strict API input',()=>{const hash='#scholars?task=graduation&academicYearId='+id+'&q=Abad&offset=50&limit=25';const opened=graduationPanelAddress(hash,'review',id),route=graduationRoute(opened);expect(route.review).toBe(id);expect(route.query.has('review')).toBe(false);expect(route.query.has('task')).toBe(false);expect(route.query.get('offset')).toBe('50');expect(closeGraduationPanel(opened)).toBe(hash);});
 it('rejects malformed person/source links and does not pass them to the API',()=>{const route=graduationRoute('#scholars?task=graduation&review=bad&duration=bad');expect(route.invalid).toBe(true);expect(route.review).toBe(null);expect(route.duration).toBe(null);expect(route.query.toString()).toBe('');});
});
