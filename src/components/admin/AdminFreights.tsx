import React, { useState, useEffect } from 'react';
import { Eye, XCircle, RefreshCw, MessageSquare, ArrowRight, DollarSign } from 'lucide-react';
import { AdminDataTable } from './AdminDataTable';
import type { AdminFreight } from './admin-mock-data';
import { fetchAdminFreights, updateFreightStatus } from '../../utils/admin-supabase-service';
import { toast } from 'sonner@2.0.3';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  active: 'bg-blue-100 text-blue-700',
  scheduled: 'bg-amber-100 text-amber-700',
  in_transit: 'bg-indigo-100 text-indigo-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};
const statusLabels: Record<string, string> = {
  draft: 'Rascunho',
  active: 'Ativo',
  scheduled: 'Agendado',
  in_transit: 'Em Trânsito',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};

export function AdminFreights() {
  const [freights, setFreights] = useState<AdminFreight[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchAdminFreights().then((data) => { setFreights(data); setLoading(false); });
  }, []);

  const filtered = filterStatus === 'all' ? freights : freights.filter(f => f.status === filterStatus);

  const handleCancel = async (f: AdminFreight) => {
    await updateFreightStatus(f.id, 'cancelled');
    setFreights(prev => prev.map(fr => fr.id === f.id ? { ...fr, status: 'cancelled' as const } : fr));
    toast.success(`Frete ${f.code} cancelado pelo admin`);
  };

  const handleChangeStatus = async (f: AdminFreight, newStatus: AdminFreight['status']) => {
    await updateFreightStatus(f.id, newStatus);
    setFreights(prev => prev.map(fr => fr.id === f.id ? { ...fr, status: newStatus } : fr));
    toast.success(`Status de ${f.code} alterado para ${statusLabels[newStatus]}`);
  };

  const columns = [
    {
      key: 'code',
      label: 'Código',
      render: (f: AdminFreight) => <span className="font-mono font-[500] text-[#253663] text-[0.85rem]">{f.code}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (f: AdminFreight) => (
        <span className={`inline-flex px-2 py-0.5 rounded-full text-[0.75rem] font-[500] ${statusColors[f.status]}`}>
          {statusLabels[f.status]}
        </span>
      ),
    },
    {
      key: 'route',
      label: 'Rota',
      render: (f: AdminFreight) => (
        <span className="flex items-center gap-1 text-[0.85rem]">
          {f.origin.split(',')[0]} <ArrowRight className="w-3 h-3 text-[var(--muted-foreground)]" /> {f.destination.split(',')[0]}
        </span>
      ),
    },
    {
      key: 'value',
      label: 'Valor',
      render: (f: AdminFreight) => <span className="font-[500]">R$ {f.value.toLocaleString('pt-BR')}</span>,
    },
    {
      key: 'shipper',
      label: 'Embarcador',
      render: (f: AdminFreight) => <span className="text-[0.85rem]">{f.shipper}</span>,
    },
    {
      key: 'carrier',
      label: 'Transportador',
      render: (f: AdminFreight) => <span className="text-[0.85rem]">{f.carrier || <span className="text-[var(--muted-foreground)] italic">Sem atribuição</span>}</span>,
    },
    {
      key: 'cargoType',
      label: 'Carga',
    },
    {
      key: 'createdAt',
      label: 'Criado',
      render: (f: AdminFreight) => <span className="text-[0.8rem] text-[var(--muted-foreground)]">{new Date(f.createdAt).toLocaleDateString('pt-BR')}</span>,
    },
    {
      key: 'actions',
      label: 'Ações',
      sortable: false,
      render: (f: AdminFreight) => (
        <div className="flex items-center gap-1">
          <button onClick={() => toast.info(`Timeline do frete ${f.code}`)} className="p-1.5 rounded-[0.5rem] hover:bg-[var(--background)] text-[var(--muted-foreground)] hover:text-[#253663]" title="Ver timeline">
            <Eye className="w-4 h-4" />
          </button>
          <button onClick={() => toast.info(`Chat do frete ${f.code}`)} className="p-1.5 rounded-[0.5rem] hover:bg-[var(--background)] text-[var(--muted-foreground)] hover:text-blue-600" title="Ver chat">
            <MessageSquare className="w-4 h-4" />
          </button>
          {f.status !== 'cancelled' && f.status !== 'completed' && (
            <button onClick={() => handleCancel(f)} className="p-1.5 rounded-[0.5rem] hover:bg-red-50 text-[var(--muted-foreground)] hover:text-red-600" title="Cancelar frete">
              <XCircle className="w-4 h-4" />
            </button>
          )}
          {f.status === 'completed' && (
            <button onClick={() => toast.info('Reembolso processado (simulado)')} className="p-1.5 rounded-[0.5rem] hover:bg-amber-50 text-[var(--muted-foreground)] hover:text-amber-600" title="Reembolsar taxa">
              <DollarSign className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  const filterContent = (
    <div className="flex flex-wrap gap-3">
      <div>
        <label className="text-[0.75rem] text-[var(--muted-foreground)] block mb-1">Status</label>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-1.5 rounded-[0.5rem] border border-[var(--border)] text-[0.85rem] bg-white outline-none">
          <option value="all">Todos</option>
          {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
    </div>
  );

  if (loading) return <div className="flex items-center justify-center py-12 text-[var(--muted-foreground)]">Carregando fretes...</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Object.entries(statusLabels).map(([key, label]) => (
          <div key={key} className="bg-white rounded-[0.75rem] border border-[var(--border)] p-3 text-center cursor-pointer hover:shadow-sm transition-shadow" onClick={() => setFilterStatus(key)}>
            <p className="text-[1.1rem] font-[500]" style={{ color: key === 'completed' ? '#22c55e' : key === 'cancelled' ? '#ef4444' : key === 'active' ? '#3b82f6' : '#253663' }}>
              {freights.filter(f => f.status === key).length}
            </p>
            <p className="text-[0.7rem] text-[var(--muted-foreground)]">{label}</p>
          </div>
        ))}
      </div>

      <AdminDataTable
        data={filtered}
        columns={columns}
        searchPlaceholder="Buscar por código, cidade, embarcador..."
        searchKeys={['code', 'origin', 'destination', 'shipper', 'carrier', 'cargoType']}
        filterContent={filterContent}
        title="fretes"
      />
    </div>
  );
}
