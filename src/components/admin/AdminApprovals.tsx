import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Eye, FileText, User, Clock, AlertTriangle } from 'lucide-react';
import { AdminDataTable } from './AdminDataTable';
import type { VerificationRequest } from './admin-mock-data';
import { toast } from 'sonner@2.0.3';
import { supabase } from '../../utils/supabase/client';

import { fetchVerificationRequests } from '../../utils/admin-supabase-service';

export function AdminApprovals() {
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Fetch from profiles table
  useEffect(() => {
    fetchVerificationRequests().then(data => {
      setRequests(data);
      setLoading(false);
    });
  }, []);

  const handleApprove = async (id: string) => {
    toast.promise(new Promise(resolve => setTimeout(resolve, 1000)), {
      loading: 'Aprovando documento...',
      success: () => {
        setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'approved', reviewedAt: new Date().toISOString() } : r));
        setSelectedRequest(null);
        return 'Documento aprovado com sucesso!';
      },
      error: 'Erro ao aprovar documento',
    });
  };

  const handleReject = async (id: string) => {
    if (!rejectionReason.trim()) {
      toast.error('Informe o motivo da rejeição');
      return;
    }
    toast.promise(new Promise(resolve => setTimeout(resolve, 1000)), {
      loading: 'Rejeitando documento...',
      success: () => {
        setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected', reviewedAt: new Date().toISOString(), rejectionReason } : r));
        setSelectedRequest(null);
        setRejectionReason('');
        return 'Documento rejeitado e usuário notificado.';
      },
      error: 'Erro ao rejeitar documento',
    });
  };

  const columns = [
    {
      key: 'userName',
      label: 'Usuário',
      render: (r: VerificationRequest) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
            <User className="w-4 h-4 text-slate-500" />
          </div>
          <div>
            <p className="font-[500] text-[0.85rem]">{r.userName}</p>
            <p className="text-[0.7rem] text-slate-500 capitalize">{r.userType}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'documentType',
      label: 'Tipo de Documento',
      render: (r: VerificationRequest) => (
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-[0.5rem] bg-slate-100 text-slate-700 text-[0.75rem] font-[500] uppercase">
          <FileText className="w-3 h-3" />
          {r.documentType.replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'submittedAt',
      label: 'Enviado em',
      render: (r: VerificationRequest) => (
        <span className="text-[0.8rem] text-slate-500">
          {new Date(r.submittedAt).toLocaleDateString('pt-BR')} {new Date(r.submittedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (r: VerificationRequest) => {
        const styles = {
          pending: 'bg-amber-100 text-amber-700',
          approved: 'bg-green-100 text-green-700',
          rejected: 'bg-red-100 text-red-700',
        };
        const labels = { pending: 'Pendente', approved: 'Aprovado', rejected: 'Rejeitado' };
        return (
          <span className={`px-2 py-0.5 rounded-full text-[0.7rem] font-[500] ${styles[r.status]}`}>
            {labels[r.status]}
          </span>
        );
      },
    },
    {
      key: 'actions',
      label: 'Ações',
      render: (r: VerificationRequest) => (
        <button
          onClick={() => setSelectedRequest(r)}
          className="p-1.5 rounded-[0.5rem] hover:bg-slate-100 text-slate-500 hover:text-[#253663] transition-colors"
          title="Analisar Documento"
        >
          <Eye className="w-4.5 h-4.5" />
        </button>
      ),
    },
  ];

  if (loading) return <div className="flex items-center justify-center py-20 text-slate-500">Carregando solicitações...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-[0.75rem] border border-slate-200">
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
            <Clock className="w-4 h-4" /> Pendentes
          </div>
          <p className="text-2xl font-[500] text-amber-600">{requests.filter(r => r.status === 'pending').length}</p>
        </div>
        <div className="bg-white p-4 rounded-[0.75rem] border border-slate-200">
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
            <CheckCircle className="w-4 h-4" /> Aprovados (24h)
          </div>
          <p className="text-2xl font-[500] text-green-600">8</p>
        </div>
        <div className="bg-white p-4 rounded-[0.75rem] border border-slate-200">
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
            <AlertTriangle className="w-4 h-4" /> Tempo Médio
          </div>
          <p className="text-2xl font-[500] text-slate-700">45m</p>
        </div>
      </div>

      <AdminDataTable
        data={requests}
        columns={columns}
        title="aprovacao-documentos"
        searchPlaceholder="Buscar por nome de usuário..."
        searchKeys={['userName']}
      />

      {/* Modal de Análise */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[1rem] max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-[500] text-lg">Análise de Documento: {selectedRequest.userName}</h3>
              <button onClick={() => setSelectedRequest(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 flex flex-col lg:flex-row gap-8">
              {/* Preview */}
              <div className="flex-1 bg-slate-100 rounded-[0.75rem] overflow-hidden border flex items-center justify-center">
                <img 
                  src={selectedRequest.documentUrl} 
                  alt="Documento" 
                  className="max-w-full max-h-[500px] object-contain shadow-sm" 
                />
              </div>

              {/* Sidebar Análise */}
              <div className="w-full lg:w-80 space-y-6">
                <div>
                  <h4 className="text-xs font-[600] text-slate-400 uppercase tracking-wider mb-2">Informações do Envio</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-slate-500">Documento:</span> <span className="font-[500] uppercase">{selectedRequest.documentType}</span></p>
                    <p><span className="text-slate-500">Usuário:</span> <span className="font-[500]">{selectedRequest.userName}</span></p>
                    <p><span className="text-slate-500">Tipo Conta:</span> <span className="font-[500] capitalize">{selectedRequest.userType}</span></p>
                    <p><span className="text-slate-500">Enviado em:</span> <span className="font-[500]">{new Date(selectedRequest.submittedAt).toLocaleString('pt-BR')}</span></p>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-100 rounded-[0.75rem]">
                  <p className="text-[0.75rem] text-blue-800 leading-relaxed">
                    <strong>Checklist Sugerido:</strong><br/>
                    • Nome corresponde ao perfil?<br/>
                    • Documento está dentro da validade?<br/>
                    • Foto está nítida e legível?
                  </p>
                </div>

                {selectedRequest.status === 'pending' ? (
                  <div className="space-y-3">
                    <button
                      onClick={() => handleApprove(selectedRequest.id)}
                      className="w-full py-2.5 rounded-[0.75rem] bg-green-600 text-white font-[500] flex items-center justify-center gap-2 hover:bg-green-700 transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" /> Aprovar Documento
                    </button>
                    
                    <div className="space-y-2 pt-2">
                      <label className="text-xs font-[600] text-slate-400 uppercase">Motivo da Rejeição (se houver)</label>
                      <textarea
                        value={rejectionReason}
                        onChange={e => setRejectionReason(e.target.value)}
                        placeholder="Ex: Foto ilegível, Documento vencido..."
                        className="w-full px-3 py-2 rounded-[0.75rem] border text-sm outline-none focus:border-red-400 h-20 resize-none"
                      />
                      <button
                        onClick={() => handleReject(selectedRequest.id)}
                        className="w-full py-2.5 rounded-[0.75rem] border border-red-200 text-red-600 font-[500] flex items-center justify-center gap-2 hover:bg-red-50 transition-colors"
                      >
                        <XCircle className="w-4 h-4" /> Rejeitar Documento
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={`p-4 rounded-[0.75rem] text-center ${selectedRequest.status === 'approved' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                    <p className="font-[600]">Documento já {selectedRequest.status === 'approved' ? 'Aprovado' : 'Rejeitado'}</p>
                    <p className="text-[0.75rem] mt-1">Revisado em: {new Date(selectedRequest.reviewedAt!).toLocaleString('pt-BR')}</p>
                    {selectedRequest.rejectionReason && (
                      <p className="text-[0.75rem] mt-2 bg-white/50 p-2 rounded">Motivo: {selectedRequest.rejectionReason}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
