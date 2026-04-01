import React, { useState } from 'react';
import { Eye, CheckCircle, XCircle, Pause, Building2, Users, Package } from 'lucide-react';
import { AdminDataTable } from './AdminDataTable';
import { mockCompanies, type AdminCompany } from './admin-mock-data';
import { toast } from 'sonner@2.0.3';

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  blocked: 'bg-red-100 text-red-700',
};
const statusLabels: Record<string, string> = {
  active: 'Ativa',
  pending: 'Pendente',
  blocked: 'Bloqueada',
};
const typeLabels: Record<string, string> = {
  transportadora: 'Transportadora',
  embarcador: 'Embarcador',
  agenciador: 'Agenciador',
};

export function AdminCompanies() {
  const [companies, setCompanies] = useState(mockCompanies);
  const [selected, setSelected] = useState<AdminCompany | null>(null);

  const handleApprove = (c: AdminCompany) => {
    setCompanies(prev => prev.map(co => co.id === c.id ? { ...co, status: 'active' as const } : co));
    toast.success(`${c.name} aprovada`);
  };

  const handleReject = (c: AdminCompany) => {
    setCompanies(prev => prev.map(co => co.id === c.id ? { ...co, status: 'blocked' as const } : co));
    toast.success(`${c.name} rejeitada`);
  };

  const columns = [
    {
      key: 'name',
      label: 'Empresa',
      render: (c: AdminCompany) => (
        <div>
          <p className="font-[500]">{c.name}</p>
          <p className="text-[0.75rem] text-[var(--muted-foreground)]">CNPJ: {c.cnpj}</p>
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Tipo',
      render: (c: AdminCompany) => <span className="text-[0.85rem]">{typeLabels[c.type]}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (c: AdminCompany) => (
        <span className={`inline-flex px-2 py-0.5 rounded-full text-[0.75rem] font-[500] ${statusColors[c.status]}`}>
          {statusLabels[c.status]}
        </span>
      ),
    },
    {
      key: 'owner',
      label: 'Responsável',
    },
    {
      key: 'collaborators',
      label: 'Colab.',
      render: (c: AdminCompany) => <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-[var(--muted-foreground)]" /> {c.collaborators}</span>,
    },
    {
      key: 'activeFreights',
      label: 'Fretes Ativos',
      render: (c: AdminCompany) => <span className="flex items-center gap-1"><Package className="w-3.5 h-3.5 text-[var(--muted-foreground)]" /> {c.activeFreights}</span>,
    },
    {
      key: 'state',
      label: 'UF',
    },
    {
      key: 'actions',
      label: 'Ações',
      sortable: false,
      render: (c: AdminCompany) => (
        <div className="flex items-center gap-1">
          <button onClick={() => setSelected(c)} className="p-1.5 rounded-[0.5rem] hover:bg-[var(--background)] text-[var(--muted-foreground)] hover:text-[#253663]" title="Ver detalhes">
            <Eye className="w-4 h-4" />
          </button>
          {c.status === 'pending' && (
            <>
              <button onClick={() => handleApprove(c)} className="p-1.5 rounded-[0.5rem] hover:bg-green-50 text-[var(--muted-foreground)] hover:text-green-600" title="Aprovar">
                <CheckCircle className="w-4 h-4" />
              </button>
              <button onClick={() => handleReject(c)} className="p-1.5 rounded-[0.5rem] hover:bg-red-50 text-[var(--muted-foreground)] hover:text-red-600" title="Rejeitar">
                <XCircle className="w-4 h-4" />
              </button>
            </>
          )}
          {c.status === 'active' && (
            <button onClick={() => { setCompanies(prev => prev.map(co => co.id === c.id ? { ...co, status: 'blocked' as const } : co)); toast.success('Operações suspensas'); }} className="p-1.5 rounded-[0.5rem] hover:bg-amber-50 text-[var(--muted-foreground)] hover:text-amber-600" title="Suspender">
              <Pause className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-[0.75rem] border border-[var(--border)] p-3 text-center">
          <p className="text-[1.25rem] font-[500] text-[#253663]">{companies.length}</p>
          <p className="text-[0.75rem] text-[var(--muted-foreground)]">Total</p>
        </div>
        <div className="bg-white rounded-[0.75rem] border border-[var(--border)] p-3 text-center">
          <p className="text-[1.25rem] font-[500] text-green-600">{companies.filter(c => c.status === 'active').length}</p>
          <p className="text-[0.75rem] text-[var(--muted-foreground)]">Ativas</p>
        </div>
        <div className="bg-white rounded-[0.75rem] border border-[var(--border)] p-3 text-center">
          <p className="text-[1.25rem] font-[500] text-amber-500">{companies.filter(c => c.status === 'pending').length}</p>
          <p className="text-[0.75rem] text-[var(--muted-foreground)]">Pendentes</p>
        </div>
      </div>

      <AdminDataTable
        data={companies}
        columns={columns}
        searchPlaceholder="Buscar por nome, CNPJ, RNTRC..."
        searchKeys={['name', 'cnpj', 'rntrc', 'owner']}
        title="empresas"
      />

      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-[0.75rem] max-w-lg w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-[500] text-[1.1rem]">Detalhes da Empresa</h3>
              <button onClick={() => setSelected(null)} className="p-1 rounded-full hover:bg-[var(--background)]">✕</button>
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-[0.75rem] bg-[#253663]/10 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-[#253663]" />
              </div>
              <div>
                <p className="font-[500]">{selected.name}</p>
                <p className="text-[0.8rem] text-[var(--muted-foreground)]">{selected.cnpj}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-[0.85rem]">
              <div><span className="text-[var(--muted-foreground)]">Tipo:</span> {typeLabels[selected.type]}</div>
              <div><span className="text-[var(--muted-foreground)]">Status:</span> <span className={`inline-flex px-2 py-0.5 rounded-full text-[0.75rem] font-[500] ${statusColors[selected.status]}`}>{statusLabels[selected.status]}</span></div>
              <div><span className="text-[var(--muted-foreground)]">Responsável:</span> {selected.owner}</div>
              <div><span className="text-[var(--muted-foreground)]">RNTRC:</span> {selected.rntrc || '—'}</div>
              <div><span className="text-[var(--muted-foreground)]">Colaboradores:</span> {selected.collaborators}</div>
              <div><span className="text-[var(--muted-foreground)]">Fretes Ativos:</span> {selected.activeFreights}</div>
              <div><span className="text-[var(--muted-foreground)]">UF:</span> {selected.state}</div>
              <div><span className="text-[var(--muted-foreground)]">Criada em:</span> {new Date(selected.createdAt).toLocaleDateString('pt-BR')}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
