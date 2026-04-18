import React, { useState, useEffect } from 'react';
import { Activity, User, Package, Building2, DollarSign, Shield, Navigation } from 'lucide-react';
import { AdminDataTable } from './AdminDataTable';
import type { AdminLog } from './admin-mock-data';
import { fetchAdminLogs } from '../../utils/admin-supabase-service';

const categoryIcons: Record<string, React.ElementType> = {
  auth: Shield,
  freight: Package,
  company: Building2,
  admin: Shield,
  driver: Navigation,
  financial: DollarSign,
  route: Navigation,
};

const categoryColors: Record<string, string> = {
  auth: 'bg-blue-100 text-blue-700',
  freight: 'bg-indigo-100 text-indigo-700',
  company: 'bg-purple-100 text-purple-700',
  admin: 'bg-red-100 text-red-700',
  driver: 'bg-teal-100 text-teal-700',
  financial: 'bg-green-100 text-green-700',
  route: 'bg-amber-100 text-amber-700',
};

export function AdminLogs() {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState('all');

  useEffect(() => {
    fetchAdminLogs().then((data) => { setLogs(data); setLoading(false); });
  }, []);

  const filtered = filterCategory === 'all' ? logs : logs.filter(l => l.category === filterCategory);
  const categories = [...new Set(logs.map(l => l.category))];

  const columns = [
    {
      key: 'createdAt',
      label: 'Data/Hora',
      render: (l: AdminLog) => (
        <span className="text-[0.8rem] text-[var(--muted-foreground)] font-mono">
          {new Date(l.createdAt).toLocaleDateString('pt-BR')} {new Date(l.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      ),
    },
    {
      key: 'userName',
      label: 'Usuário',
      render: (l: AdminLog) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[#253663]/10 flex items-center justify-center">
            <User className="w-3.5 h-3.5 text-[#253663]" />
          </div>
          <div>
            <p className="font-[500] text-[0.85rem]">{l.userName}</p>
            <p className="text-[0.7rem] text-[var(--muted-foreground)] font-mono">{l.userId}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      label: 'Categoria',
      render: (l: AdminLog) => {
        const Icon = categoryIcons[l.category] || Activity;
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.75rem] font-[500] ${categoryColors[l.category] || 'bg-gray-100 text-gray-600'}`}>
            <Icon className="w-3 h-3" />
            {l.category}
          </span>
        );
      },
    },
    {
      key: 'action',
      label: 'Ação',
      render: (l: AdminLog) => <span className="font-mono text-[0.8rem] text-[var(--foreground)]">{l.action}</span>,
    },
    {
      key: 'details',
      label: 'Detalhes',
      render: (l: AdminLog) => <span className="text-[0.85rem] max-w-xs block truncate">{l.details}</span>,
    },
    {
      key: 'ip',
      label: 'IP',
      render: (l: AdminLog) => <span className="font-mono text-[0.8rem] text-[var(--muted-foreground)]">{l.ip}</span>,
    },
  ];

  const filterContent = (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => setFilterCategory('all')}
        className={`px-2.5 py-1 rounded-[0.5rem] text-[0.8rem] transition-colors ${filterCategory === 'all' ? 'bg-[#253663] text-white' : 'bg-[var(--background)] text-[var(--muted-foreground)]'}`}
      >
        Todas
      </button>
      {categories.map(cat => (
        <button
          key={cat}
          onClick={() => setFilterCategory(cat)}
          className={`px-2.5 py-1 rounded-[0.5rem] text-[0.8rem] transition-colors ${filterCategory === cat ? 'bg-[#253663] text-white' : 'bg-[var(--background)] text-[var(--muted-foreground)]'}`}
        >
          {cat}
        </button>
      ))}
    </div>
  );

  if (loading) return <div className="flex items-center justify-center py-12 text-[var(--muted-foreground)]">Carregando logs...</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-[0.75rem] border border-[var(--border)] p-3 text-center">
          <p className="text-[1.25rem] font-[500] text-[#253663]">{logs.length}</p>
          <p className="text-[0.75rem] text-[var(--muted-foreground)]">Total (24h)</p>
        </div>
        <div className="bg-white rounded-[0.75rem] border border-[var(--border)] p-3 text-center">
          <p className="text-[1.25rem] font-[500] text-blue-600">{logs.filter(l => l.category === 'auth').length}</p>
          <p className="text-[0.75rem] text-[var(--muted-foreground)]">Autenticação</p>
        </div>
        <div className="bg-white rounded-[0.75rem] border border-[var(--border)] p-3 text-center">
          <p className="text-[1.25rem] font-[500] text-indigo-600">{logs.filter(l => l.category === 'freight').length}</p>
          <p className="text-[0.75rem] text-[var(--muted-foreground)]">Fretes</p>
        </div>
        <div className="bg-white rounded-[0.75rem] border border-[var(--border)] p-3 text-center">
          <p className="text-[1.25rem] font-[500] text-red-600">{logs.filter(l => l.category === 'admin').length}</p>
          <p className="text-[0.75rem] text-[var(--muted-foreground)]">Admin</p>
        </div>
      </div>

      <AdminDataTable
        data={filtered}
        columns={columns}
        searchPlaceholder="Buscar por usuário, ação, IP, detalhes..."
        searchKeys={['userName', 'action', 'details', 'ip', 'category']}
        filterContent={filterContent}
        title="logs-auditoria"
      />
    </div>
  );
}
