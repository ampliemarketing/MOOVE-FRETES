import React, { useState } from 'react';
import { Eye, EyeOff, AlertTriangle, Star, UserMinus, Package } from 'lucide-react';
import { AdminDataTable } from './AdminDataTable';
import { mockReviews, type AdminReview } from './admin-mock-data';
import { toast } from 'sonner@2.0.3';

const statusColors: Record<string, string> = {
  visible: 'bg-green-100 text-green-700',
  hidden: 'bg-gray-100 text-gray-600',
  pending_review: 'bg-amber-100 text-amber-700',
};
const statusLabels: Record<string, string> = {
  visible: 'Visível',
  hidden: 'Oculta',
  pending_review: 'Em Análise',
};

export function AdminReviews() {
  const [reviews, setReviews] = useState(mockReviews);
  const [filterTab, setFilterTab] = useState<'all' | 'reported' | 'pending'>('all');

  const filtered = filterTab === 'all' ? reviews : filterTab === 'reported' ? reviews.filter(r => r.reported) : reviews.filter(r => r.status === 'pending_review');

  const handleHide = (r: AdminReview) => {
    setReviews(prev => prev.map(rv => rv.id === r.id ? { ...rv, status: rv.status === 'hidden' ? 'visible' : 'hidden' as any } : rv));
    toast.success(r.status === 'hidden' ? 'Avaliação restaurada' : 'Avaliação ocultada');
  };

  const columns = [
    {
      key: 'fromUser',
      label: 'De',
      render: (r: AdminReview) => <span className="font-[500] text-[0.85rem]">{r.fromUser}</span>,
    },
    {
      key: 'toUser',
      label: 'Para',
      render: (r: AdminReview) => <span className="text-[0.85rem]">{r.toUser}</span>,
    },
    {
      key: 'rating',
      label: 'Nota',
      render: (r: AdminReview) => (
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 5 }, (_, i) => (
            <Star key={i} className={`w-3.5 h-3.5 ${i < r.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
          ))}
        </div>
      ),
    },
    {
      key: 'comment',
      label: 'Comentário',
      render: (r: AdminReview) => <p className="text-[0.85rem] max-w-xs truncate">{r.comment}</p>,
    },
    {
      key: 'freightCode',
      label: 'Frete',
      render: (r: AdminReview) => (
        <span className="flex items-center gap-1 text-[0.8rem] text-[#253663]">
          <Package className="w-3 h-3" /> {r.freightCode}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (r: AdminReview) => (
        <div>
          <span className={`inline-flex px-2 py-0.5 rounded-full text-[0.75rem] font-[500] ${statusColors[r.status]}`}>
            {statusLabels[r.status]}
          </span>
          {r.reported && (
            <div className="flex items-center gap-1 mt-1 text-red-600 text-[0.7rem]">
              <AlertTriangle className="w-3 h-3" /> {r.reportReason}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'createdAt',
      label: 'Data',
      render: (r: AdminReview) => <span className="text-[0.8rem] text-[var(--muted-foreground)]">{new Date(r.createdAt).toLocaleDateString('pt-BR')}</span>,
    },
    {
      key: 'actions',
      label: 'Ações',
      sortable: false,
      render: (r: AdminReview) => (
        <div className="flex items-center gap-1">
          <button onClick={() => handleHide(r)} className="p-1.5 rounded-[0.5rem] hover:bg-[var(--background)] text-[var(--muted-foreground)] hover:text-[#253663]" title={r.status === 'hidden' ? 'Restaurar' : 'Ocultar'}>
            {r.status === 'hidden' ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
          {r.reported && (
            <button onClick={() => toast.success('Usuário punido: -50 XP')} className="p-1.5 rounded-[0.5rem] hover:bg-red-50 text-[var(--muted-foreground)] hover:text-red-600" title="Punir usuário">
              <UserMinus className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-[0.75rem] border border-[var(--border)] p-3 text-center">
          <p className="text-[1.25rem] font-[500] text-[#253663]">{reviews.length}</p>
          <p className="text-[0.75rem] text-[var(--muted-foreground)]">Total</p>
        </div>
        <div className="bg-white rounded-[0.75rem] border border-[var(--border)] p-3 text-center">
          <p className="text-[1.25rem] font-[500] text-amber-500">{reviews.filter(r => r.status === 'pending_review').length}</p>
          <p className="text-[0.75rem] text-[var(--muted-foreground)]">Em Análise</p>
        </div>
        <div className="bg-white rounded-[0.75rem] border border-[var(--border)] p-3 text-center">
          <p className="text-[1.25rem] font-[500] text-red-500">{reviews.filter(r => r.reported).length}</p>
          <p className="text-[0.75rem] text-[var(--muted-foreground)]">Denunciadas</p>
        </div>
        <div className="bg-white rounded-[0.75rem] border border-[var(--border)] p-3 text-center">
          <p className="text-[1.25rem] font-[500] text-amber-400">★ {(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)}</p>
          <p className="text-[0.75rem] text-[var(--muted-foreground)]">Média Global</p>
        </div>
      </div>

      <div className="flex gap-2">
        {(['all', 'reported', 'pending'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setFilterTab(tab)}
            className={`px-3 py-1.5 rounded-[0.75rem] text-[0.85rem] transition-colors ${filterTab === tab ? 'bg-[#253663] text-white' : 'bg-white border border-[var(--border)] text-[var(--muted-foreground)]'}`}
          >
            {tab === 'all' ? 'Todas' : tab === 'reported' ? 'Denunciadas' : 'Em Análise'}
          </button>
        ))}
      </div>

      <AdminDataTable
        data={filtered}
        columns={columns}
        searchPlaceholder="Buscar por usuário, comentário, frete..."
        searchKeys={['fromUser', 'toUser', 'comment', 'freightCode']}
        title="avaliacoes"
      />
    </div>
  );
}
