import React, { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, Download, Filter, X } from 'lucide-react';

interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

interface AdminDataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchPlaceholder?: string;
  searchKeys?: string[];
  pageSize?: number;
  onExportCSV?: () => void;
  onExportJSON?: () => void;
  filterContent?: React.ReactNode;
  bulkActions?: React.ReactNode;
  title?: string;
}

export function AdminDataTable<T extends Record<string, any>>({
  data,
  columns,
  searchPlaceholder = 'Buscar...',
  searchKeys = [],
  pageSize = 10,
  onExportCSV,
  onExportJSON,
  filterContent,
  bulkActions,
  title,
}: AdminDataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    let result = data;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(item =>
        searchKeys.some(key => String(item[key] || '').toLowerCase().includes(q)) ||
        Object.values(item).some(v => String(v || '').toLowerCase().includes(q))
      );
    }
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const aVal = a[sortKey] ?? '';
        const bVal = b[sortKey] ?? '';
        const cmp = String(aVal).localeCompare(String(bVal), 'pt-BR', { numeric: true });
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return result;
  }, [data, search, sortKey, sortDir, searchKeys]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const toggleRow = (id: string) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedRows.size === paged.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(paged.map(r => r.id)));
    }
  };

  const handleExportCSV = () => {
    if (onExportCSV) { onExportCSV(); return; }
    const headers = columns.map(c => c.label).join(',');
    const rows = filtered.map(item => columns.map(c => `"${String(item[c.key] || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([`${headers}\n${rows}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${title || 'export'}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    if (onExportJSON) { onExportJSON(); return; }
    const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${title || 'export'}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-[0.75rem] border border-[var(--border)] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border)]">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex items-center gap-3 flex-1 w-full sm:w-auto">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
              <input
                type="text"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(0); }}
                placeholder={searchPlaceholder}
                className="w-full pl-9 pr-3 py-2 rounded-[0.75rem] border border-[var(--border)] bg-[var(--background)] text-[0.85rem] outline-none focus:border-[#253663] transition-colors"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
                </button>
              )}
            </div>
            {filterContent && (
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-[0.75rem] border text-[0.85rem] transition-colors ${
                  showFilters ? 'bg-[#253663] text-white border-[#253663]' : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[#253663]'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                Filtros
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selectedRows.size > 0 && bulkActions && (
              <div className="flex items-center gap-2 mr-2">
                <span className="text-[0.8rem] text-[var(--muted-foreground)]">{selectedRows.size} selecionado(s)</span>
                {bulkActions}
              </div>
            )}
            <button onClick={handleExportCSV} className="flex items-center gap-1.5 px-3 py-2 rounded-[0.75rem] border border-[var(--border)] text-[0.8rem] text-[var(--muted-foreground)] hover:border-[#253663] transition-colors">
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
            <button onClick={handleExportJSON} className="flex items-center gap-1.5 px-3 py-2 rounded-[0.75rem] border border-[var(--border)] text-[0.8rem] text-[var(--muted-foreground)] hover:border-[#253663] transition-colors">
              <Download className="w-3.5 h-3.5" /> JSON
            </button>
          </div>
        </div>

        {/* Filter area */}
        {showFilters && filterContent && (
          <div className="mt-3 pt-3 border-t border-[var(--border-light)]">
            {filterContent}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border)]">
              {bulkActions && (
                <th className="pl-4 pr-2 py-3">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === paged.length && paged.length > 0}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded border-[var(--border)] accent-[#253663]"
                  />
                </th>
              )}
              {columns.map(col => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left text-[0.75rem] font-[500] text-[var(--muted-foreground)] uppercase tracking-wider ${col.sortable !== false ? 'cursor-pointer hover:text-[#253663] select-none' : ''}`}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key && (
                      <span className="text-[#253663]">{sortDir === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (bulkActions ? 1 : 0)} className="px-4 py-12 text-center text-[var(--muted-foreground)] text-[0.85rem]">
                  Nenhum resultado encontrado
                </td>
              </tr>
            ) : (
              paged.map((item, i) => (
                <tr key={item.id || i} className="border-b border-[var(--border-light)] hover:bg-[var(--background)] transition-colors">
                  {bulkActions && (
                    <td className="pl-4 pr-2 py-3">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(item.id)}
                        onChange={() => toggleRow(item.id)}
                        className="w-4 h-4 rounded border-[var(--border)] accent-[#253663]"
                      />
                    </td>
                  )}
                  {columns.map(col => (
                    <td key={col.key} className="px-4 py-3 text-[0.85rem] text-[var(--foreground)]">
                      {col.render ? col.render(item) : String(item[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border)]">
        <p className="text-[0.8rem] text-[var(--muted-foreground)]">
          {filtered.length === 0 ? '0 resultados' : `${page * pageSize + 1}-${Math.min((page + 1) * pageSize, filtered.length)} de ${filtered.length}`}
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="p-1.5 rounded-[0.5rem] border border-[var(--border)] disabled:opacity-30 hover:bg-[var(--background)] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            const pageNum = totalPages <= 5 ? i : Math.max(0, Math.min(page - 2, totalPages - 5)) + i;
            return (
              <button
                key={pageNum}
                onClick={() => setPage(pageNum)}
                className={`w-8 h-8 rounded-[0.5rem] text-[0.8rem] transition-colors ${
                  page === pageNum ? 'bg-[#253663] text-white' : 'hover:bg-[var(--background)]'
                }`}
              >
                {pageNum + 1}
              </button>
            );
          })}
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="p-1.5 rounded-[0.5rem] border border-[var(--border)] disabled:opacity-30 hover:bg-[var(--background)] transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
