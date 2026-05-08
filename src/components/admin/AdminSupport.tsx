import React, { useState, useEffect } from 'react';
import { LifeBuoy, MessageSquare, Clock, CheckCircle, AlertCircle, Send, User, Filter, Search } from 'lucide-react';
import { AdminDataTable } from './AdminDataTable';
import type { SupportTicket } from './admin-mock-data';
import { toast } from 'sonner@2.0.3';

import { fetchSupportTickets, sendSupportReply, updateSupportTicketStatus } from '../../utils/admin-supabase-service';

export function AdminSupport() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [reply, setReply] = useState('');

  useEffect(() => {
    fetchSupportTickets().then(data => {
      setTickets(data);
      setLoading(false);
    });
  }, []);

  const handleSendReply = async () => {
    if (!reply.trim() || !selectedTicket) return;
    
    const { error } = await sendSupportReply(selectedTicket.id, reply);
    if (!error) {
      toast.success('Resposta enviada com sucesso!');
      setReply('');
    } else {
      toast.error('Erro ao enviar resposta');
    }
  };

  const handleStatusChange = async (id: string, newStatus: SupportTicket['status']) => {
    const { error } = await updateSupportTicketStatus(id, newStatus);
    if (!error) {
      setTickets(prev => prev.map(t => t.id === id ? { ...t, status: newStatus, updatedAt: new Date().toISOString() } : t));
      if (selectedTicket?.id === id) {
        setSelectedTicket(prev => prev ? { ...prev, status: newStatus } : null);
      }
      toast.success(`Ticket atualizado para ${newStatus}`);
    } else {
      toast.error('Erro ao atualizar status');
    }
  };

  const priorityColors = {
    low: 'bg-slate-100 text-slate-700',
    medium: 'bg-blue-100 text-blue-700',
    high: 'bg-amber-100 text-amber-700',
    urgent: 'bg-red-100 text-red-700',
  };

  const statusColors = {
    open: 'bg-red-50 text-red-600 border-red-100',
    in_progress: 'bg-blue-50 text-blue-600 border-blue-100',
    resolved: 'bg-green-50 text-green-600 border-green-100',
    closed: 'bg-slate-50 text-slate-600 border-slate-100',
  };

  const columns = [
    {
      key: 'id',
      label: 'ID',
      render: (t: SupportTicket) => <span className="font-mono text-xs font-[600]">{t.id}</span>
    },
    {
      key: 'userName',
      label: 'Usuário',
      render: (t: SupportTicket) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center">
            <User className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <span className="text-[0.85rem] font-[500]">{t.userName}</span>
        </div>
      )
    },
    {
      key: 'subject',
      label: 'Assunto',
      render: (t: SupportTicket) => (
        <div className="max-w-xs">
          <p className="text-[0.85rem] font-[500] truncate">{t.subject}</p>
          <p className="text-[0.7rem] text-slate-500 truncate">{t.lastMessage}</p>
        </div>
      )
    },
    {
      key: 'priority',
      label: 'Prioridade',
      render: (t: SupportTicket) => (
        <span className={`px-2 py-0.5 rounded-full text-[0.7rem] font-[600] uppercase ${priorityColors[t.priority]}`}>
          {t.priority}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (t: SupportTicket) => (
        <span className={`px-2 py-0.5 rounded-full text-[0.7rem] font-[600] border ${statusColors[t.status]}`}>
          {t.status.replace('_', ' ')}
        </span>
      )
    },
    {
      key: 'updatedAt',
      label: 'Última Ativ.',
      render: (t: SupportTicket) => (
        <span className="text-[0.75rem] text-slate-500">
          {new Date(t.updatedAt).toLocaleDateString('pt-BR')} {new Date(t.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Ações',
      render: (t: SupportTicket) => (
        <button
          onClick={() => setSelectedTicket(t)}
          className="p-1.5 rounded-[0.5rem] hover:bg-slate-100 text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <MessageSquare className="w-4.5 h-4.5" />
        </button>
      )
    }
  ];

  if (loading) return <div className="flex items-center justify-center py-20 text-slate-500">Carregando tickets...</div>;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-[0.75rem] border border-slate-200">
          <p className="text-[0.8rem] text-slate-500 mb-1">Abertos</p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-[500] text-red-600">{tickets.filter(t => t.status === 'open').length}</span>
            <AlertCircle className="w-5 h-5 text-red-100" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-[0.75rem] border border-slate-200">
          <p className="text-[0.8rem] text-slate-500 mb-1">Em Atendimento</p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-[500] text-blue-600">{tickets.filter(t => t.status === 'in_progress').length}</span>
            <Clock className="w-5 h-5 text-blue-100" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-[0.75rem] border border-slate-200">
          <p className="text-[0.8rem] text-slate-500 mb-1">Resolvidos (Hoje)</p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-[500] text-green-600">12</span>
            <CheckCircle className="w-5 h-5 text-green-100" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-[0.75rem] border border-slate-200">
          <p className="text-[0.8rem] text-slate-500 mb-1">Tempo de Resposta</p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-[500] text-slate-700">1.5h</span>
            <LifeBuoy className="w-5 h-5 text-slate-100" />
          </div>
        </div>
      </div>

      <AdminDataTable
        data={tickets}
        columns={columns}
        title="tickets-suporte"
        searchPlaceholder="Buscar por assunto, usuário ou ID..."
        searchKeys={['id', 'userName', 'subject']}
      />

      {/* Ticket Detail Drawer-like Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex justify-end">
          <div className="bg-white w-full max-w-2xl h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <button onClick={() => setSelectedTicket(null)} className="p-2 hover:bg-slate-200 rounded-full">✕</button>
                <div>
                  <h3 className="font-[600] text-slate-900">Ticket {selectedTicket.id}</h3>
                  <p className="text-xs text-slate-500">{selectedTicket.category.toUpperCase()}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select 
                  value={selectedTicket.status} 
                  onChange={(e) => handleStatusChange(selectedTicket.id, e.target.value as any)}
                  className="text-xs border rounded-md px-2 py-1 bg-white"
                >
                  <option value="open">Aberto</option>
                  <option value="in_progress">Em Andamento</option>
                  <option value="resolved">Resolvido</option>
                  <option value="closed">Fechado</option>
                </select>
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
              <div className="flex flex-col gap-1">
                <p className="text-xl font-[500] text-slate-900">{selectedTicket.subject}</p>
                <p className="text-xs text-slate-500">Iniciado em {new Date(selectedTicket.createdAt).toLocaleString('pt-BR')}</p>
              </div>

              <div className="space-y-4">
                {/* User Message */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex-shrink-0 flex items-center justify-center text-xs font-bold">
                    {selectedTicket.userName.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="bg-white p-4 rounded-[1rem] rounded-tl-none border border-slate-200 shadow-sm">
                      <p className="text-[0.9rem] text-slate-800 leading-relaxed">
                        {selectedTicket.lastMessage}
                      </p>
                    </div>
                    <p className="text-[0.65rem] text-slate-400 mt-1 ml-1">{new Date(selectedTicket.createdAt).toLocaleTimeString('pt-BR')}</p>
                  </div>
                </div>

                {/* Admin Message (Example) */}
                <div className="flex items-start gap-3 flex-row-reverse">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex-shrink-0 flex items-center justify-center text-xs font-bold">
                    AD
                  </div>
                  <div className="flex-1 flex flex-col items-end">
                    <div className="bg-indigo-600 p-4 rounded-[1rem] rounded-tr-none text-white shadow-sm max-w-[90%]">
                      <p className="text-[0.9rem] leading-relaxed">
                        Olá {selectedTicket.userName}, recebemos sua solicitação. Poderia nos informar qual o erro que aparece ao tentar o saque?
                      </p>
                    </div>
                    <p className="text-[0.65rem] text-slate-400 mt-1 mr-1">Há 10 minutos</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Input Area */}
            <div className="p-4 border-t bg-white">
              <div className="relative">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Digite sua resposta..."
                  className="w-full px-4 py-3 pr-14 rounded-[1rem] border border-slate-200 bg-slate-50 text-[0.9rem] outline-none focus:border-indigo-400 focus:bg-white transition-all h-24 resize-none"
                />
                <button 
                  onClick={handleSendReply}
                  disabled={!reply.trim()}
                  className="absolute right-3 bottom-3 p-2.5 rounded-[0.75rem] bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-lg shadow-indigo-200"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-3 flex items-center gap-4 text-xs text-slate-400">
                <button className="hover:text-indigo-600">Inserir Resposta Padrão</button>
                <button className="hover:text-indigo-600">Anexar Documento</button>
                <button className="hover:text-red-600 ml-auto">Escalar Ticket</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
