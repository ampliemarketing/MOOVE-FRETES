import React, { useState, useEffect } from 'react';
import { Eye, Ban, AlertTriangle, Paperclip, Package } from 'lucide-react';
import { AdminDataTable } from './AdminDataTable';
import type { AdminMessage } from './admin-mock-data';
import { fetchAdminMessages } from '../../utils/admin-supabase-service';
import { toast } from 'sonner@2.0.3';

export function AdminMessages() {
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterReported, setFilterReported] = useState(false);

  useEffect(() => {
    fetchAdminMessages().then((data) => { setMessages(data); setLoading(false); });
  }, []);

  const filtered = filterReported ? messages.filter(m => m.reported) : messages;

  const columns = [
    {
      key: 'from',
      label: 'De',
      render: (m: AdminMessage) => <span className="font-[500] text-[0.85rem]">{m.from}</span>,
    },
    {
      key: 'to',
      label: 'Para',
      render: (m: AdminMessage) => <span className="text-[0.85rem]">{m.to}</span>,
    },
    {
      key: 'content',
      label: 'Mensagem',
      render: (m: AdminMessage) => (
        <div className="max-w-xs">
          <p className="text-[0.85rem] truncate">{m.content}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {m.freightCode && (
              <span className="flex items-center gap-1 text-[0.7rem] text-[#253663]">
                <Package className="w-3 h-3" /> {m.freightCode}
              </span>
            )}
            {m.hasAttachment && (
              <span className="flex items-center gap-1 text-[0.7rem] text-[var(--muted-foreground)]">
                <Paperclip className="w-3 h-3" /> Anexo
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'reported',
      label: 'Denúncia',
      render: (m: AdminMessage) => m.reported ? (
        <span className="flex items-center gap-1 text-red-600 text-[0.8rem]">
          <AlertTriangle className="w-3.5 h-3.5" /> Denunciada
        </span>
      ) : (
        <span className="text-[0.8rem] text-[var(--muted-foreground)]">—</span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Data',
      render: (m: AdminMessage) => (
        <span className="text-[0.8rem] text-[var(--muted-foreground)]">
          {new Date(m.createdAt).toLocaleDateString('pt-BR')} {new Date(m.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Ações',
      sortable: false,
      render: (m: AdminMessage) => (
        <div className="flex items-center gap-1">
          <button onClick={() => toast.info('Conversa completa exibida (simulado)')} className="p-1.5 rounded-[0.5rem] hover:bg-[var(--background)] text-[var(--muted-foreground)] hover:text-[#253663]" title="Ver conversa">
            <Eye className="w-4 h-4" />
          </button>
          {m.reported && (
            <button onClick={() => toast.success('Conversa bloqueada')} className="p-1.5 rounded-[0.5rem] hover:bg-red-50 text-[var(--muted-foreground)] hover:text-red-600" title="Bloquear conversa">
              <Ban className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  if (loading) return <div className="flex items-center justify-center py-12 text-[var(--muted-foreground)]">Carregando mensagens...</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-[0.75rem] border border-[var(--border)] p-3 text-center">
          <p className="text-[1.25rem] font-[500] text-[#253663]">{messages.length}</p>
          <p className="text-[0.75rem] text-[var(--muted-foreground)]">Total</p>
        </div>
        <div className="bg-white rounded-[0.75rem] border border-[var(--border)] p-3 text-center">
          <p className="text-[1.25rem] font-[500] text-red-500">{messages.filter(m => m.reported).length}</p>
          <p className="text-[0.75rem] text-[var(--muted-foreground)]">Denunciadas</p>
        </div>
        <div className="bg-white rounded-[0.75rem] border border-[var(--border)] p-3 text-center">
          <p className="text-[1.25rem] font-[500] text-blue-600">{messages.filter(m => m.freightCode).length}</p>
          <p className="text-[0.75rem] text-[var(--muted-foreground)]">Vinculadas a Fretes</p>
        </div>
        <div className="bg-white rounded-[0.75rem] border border-[var(--border)] p-3 text-center">
          <p className="text-[1.25rem] font-[500] text-amber-500">{messages.filter(m => m.hasAttachment).length}</p>
          <p className="text-[0.75rem] text-[var(--muted-foreground)]">Com Anexos</p>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setFilterReported(false)}
          className={`px-3 py-1.5 rounded-[0.75rem] text-[0.85rem] transition-colors ${!filterReported ? 'bg-[#253663] text-white' : 'bg-white border border-[var(--border)] text-[var(--muted-foreground)]'}`}
        >
          Todas
        </button>
        <button
          onClick={() => setFilterReported(true)}
          className={`px-3 py-1.5 rounded-[0.75rem] text-[0.85rem] transition-colors ${filterReported ? 'bg-red-600 text-white' : 'bg-white border border-[var(--border)] text-[var(--muted-foreground)]'}`}
        >
          Denunciadas ({messages.filter(m => m.reported).length})
        </button>
      </div>

      <AdminDataTable
        data={filtered}
        columns={columns}
        searchPlaceholder="Buscar por remetente, destinatário, conteúdo..."
        searchKeys={['from', 'to', 'content', 'freightCode']}
        title="mensagens"
      />
    </div>
  );
}
