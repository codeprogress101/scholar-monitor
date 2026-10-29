import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {SuppliedTextFields} from '../src/AnnualIntakePanel';
describe('Optional supplied text controls',()=>{
 it('exposes labelled text inputs and escapes supplied content without catalog IDs',()=>{const html=renderToStaticMarkup(<SuppliedTextFields value={{schoolText:' CNSC ',courseText:'<BSIT>'}} onChange={()=>{}}/>);expect(html).toContain('School (Optional)');expect(html).toContain('Course (Optional)');expect(html).toContain('value=" CNSC "');expect(html).toContain('&lt;BSIT&gt;');expect(html).not.toContain('<select');expect(html).toContain('aria-describedby');expect(html).toContain('maxLength="600"');});
 it('protects known fields during routine completion',()=>{const html=renderToStaticMarkup(<SuppliedTextFields value={{schoolText:'CNSC',courseText:null}} fixed={{schoolText:'CNSC',courseText:null}} onChange={()=>{}}/>);expect((html.match(/readOnly=""/g)??[]).length).toBe(1);});
});
