import { useState, useEffect, type ReactNode } from "react";

export function StatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "warning" | "danger" }) {
  return <span className={`status-badge status-${tone}`}>{children}</span>;
}

/** Search and paging affect presentation only; the server remains authoritative. */
export function PagedTable<T>({ items, label, columns, searchText, row, storageKey, pageSizes }: {
  pageSizes?: number[]; storageKey?: string; items: T[]; label: string; columns: string[]; searchText: (item: T) => string; row: (item: T) => ReactNode;
}) {
  const [saved] = useState(() => {try{return JSON.parse(storageKey ? sessionStorage.getItem(storageKey) ?? "{}" : "{}");}catch{return {};}});
  const [query, setQuery] = useState<string>(saved.query ?? ""), [page, setPage] = useState<number>(saved.page ?? 0);
  const [pageSize,setPageSize] = useState<number>(pageSizes?.includes(saved.pageSize) ? saved.pageSize : pageSizes?.[0] ?? 10);
  useEffect(()=>{if(storageKey)sessionStorage.setItem(storageKey,JSON.stringify({query,page,pageSize}));},[query,page,pageSize,storageKey]);
  const matches = items.filter(item => searchText(item).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const current = Math.min(page, Math.max(0, Math.ceil(matches.length / pageSize) - 1));
  return <div className="record-table">
    <div className="list-toolbar">
      <label className="search-field"><span className="visually-hidden">Search {label}</span><input type="search" className="form-control" placeholder={`Search ${label.toLowerCase()}`} value={query} onChange={e => { setQuery(e.target.value); setPage(0); }} /></label>
      <span className="text-muted" role="status">{matches.length} {matches.length === 1 ? "record" : "records"}</span>
      {pageSizes && <label className="page-size-control">Rows<select className="form-select" aria-label={`Rows per page for ${label}`} value={pageSize} onChange={e=>{setPageSize(Number(e.target.value));setPage(0);}}>{pageSizes.map(size=><option key={size}>{size}</option>)}</select></label>}
    </div>
    <p className="table-scroll-hint">Scroll the table sideways to see all columns.</p>
    <div className="table-responsive" tabIndex={0} role="region" aria-label={label}>
      <table className="table compact-table"><thead><tr>{columns.map(c => <th key={c} scope="col">{c}</th>)}</tr></thead><tbody>{matches.slice(current * pageSize, current * pageSize + pageSize).map(row)}</tbody></table>
    </div>
    {!matches.length && <p className="empty-state">No matching records. Try another name or filter.</p>}
    {matches.length > pageSize && <nav className="list-pagination" aria-label={`${label} pages`}>
      <button type="button" className="btn btn-outline-secondary" disabled={!current} onClick={() => setPage(current - 1)}>Previous</button>
      <span>Page {current + 1} of {Math.ceil(matches.length / pageSize)}</span>
      <button type="button" className="btn btn-outline-secondary" disabled={(current + 1) * pageSize >= matches.length} onClick={() => setPage(current + 1)}>Next</button>
    </nav>}
  </div>;
}
