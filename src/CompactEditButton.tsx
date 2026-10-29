import {Pencil} from 'lucide-react';
import type {MouseEventHandler} from 'react';

/** Secondary row edit action; the caller retains its command and permission guards. */
export default function CompactEditButton({label,disabled,onClick}:{label:string;disabled?:boolean;onClick:MouseEventHandler<HTMLButtonElement>}) {
  return <button type="button" className="btn btn-outline-secondary compact-row-edit" title={label} aria-label={label} disabled={disabled} onClick={onClick}><Pencil size={16} aria-hidden="true"/></button>;
}
