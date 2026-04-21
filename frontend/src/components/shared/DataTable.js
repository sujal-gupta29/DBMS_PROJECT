import React, { useState, useMemo } from 'react';
import { Search, ChevronUp, ChevronDown } from 'lucide-react';

export default function DataTable({ columns, data, pageSize = 15, title, actions, extra }) {
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (!search) return data;
    const q = search.toLowerCase();
    return data.filter(row =>
      columns.some(col => {
        const val = col.accessor ? row[col.accessor] : '';
        return String(val ?? '').toLowerCase().includes(q);
      })
    );
  }, [data, search, columns]);

  const sorted = useMemo(() => {
    if (!sortCol) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sortCol], bv = b[sortCol];
      if (av == null) return 1; if (bv == null) return -1;
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (accessor) => {
    if (sortCol === accessor) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(accessor); setSortDir('asc'); }
    setPage(1);
  };

  const handleSearch = (e) => { setSearch(e.target.value); setPage(1); };

  return (
    <div className="table-container">
      <div className="table-header">
        {title && <span className="table-title">{title}</span>}
        <div style={{display:'flex', gap:10, alignItems:'center', flexWrap:'wrap', marginLeft:'auto'}}>
          {extra}
          <div className="search-wrapper" style={{minWidth:200}}>
            <Search size={14} className="search-icon"/>
            <input
              className="search-input"
              placeholder="Search…"
              value={search}
              onChange={handleSearch}
            />
          </div>
          {actions}
        </div>
      </div>

      <div style={{overflowX:'auto'}}>
        <table>
          <thead>
            <tr>
              {columns.map(col => (
                <th
                  key={col.accessor || col.header}
                  onClick={() => col.sortable !== false && col.accessor && handleSort(col.accessor)}
                  style={{cursor: col.sortable !== false && col.accessor ? 'pointer' : 'default', userSelect:'none'}}
                >
                  <span style={{display:'inline-flex', alignItems:'center', gap:4}}>
                    {col.header}
                    {col.sortable !== false && col.accessor && (
                      sortCol === col.accessor
                        ? (sortDir === 'asc' ? <ChevronUp size={12}/> : <ChevronDown size={12}/>)
                        : <ChevronUp size={12} style={{opacity:0.3}}/>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{textAlign:'center', color:'var(--text-muted)', padding:32}}>
                  No records found
                </td>
              </tr>
            ) : paginated.map((row, i) => (
              <tr key={i}>
                {columns.map(col => (
                  <td key={col.accessor || col.header}>
                    {col.render ? col.render(row) : (row[col.accessor] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button className="page-btn" onClick={() => setPage(1)} disabled={page === 1}>«</button>
          <button className="page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
          {Array.from({length: Math.min(5, totalPages)}, (_, i) => {
            const start = Math.max(1, Math.min(page - 2, totalPages - 4));
            const p = start + i;
            return p <= totalPages ? (
              <button key={p} className={`page-btn${p === page ? ' active' : ''}`} onClick={() => setPage(p)}>{p}</button>
            ) : null;
          })}
          <button className="page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</button>
          <button className="page-btn" onClick={() => setPage(totalPages)} disabled={page === totalPages}>»</button>
          <span style={{fontSize:'0.78rem', color:'var(--text-muted)'}}>
            {(page-1)*pageSize+1}–{Math.min(page*pageSize, sorted.length)} of {sorted.length}
          </span>
        </div>
      )}
    </div>
  );
}
