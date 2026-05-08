import React, { useState } from 'react';
import { Send, Users, MapPin, Bell, CheckCircle } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

import { fetchAdminNotifications, sendAdminNotification } from '../../utils/admin-supabase-service';

export function AdminNotifications() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState('all');
  const [userTypes, setUserTypes] = useState<string[]>([]);
  const [region, setRegion] = useState('all');
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    fetchAdminNotifications().then(setHistory);
  }, []);

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error('Preencha título e mensagem');
      return;
    }
    setSending(true);
    const { error } = await sendAdminNotification({ title, message, audience, userTypes });
    setSending(false);
    
    if (error) {
      toast.error('Erro ao enviar notificação');
    } else {
      toast.success('Notificação enviada com sucesso');
      setTitle('');
      setMessage('');
      fetchAdminNotifications().then(setHistory);
    }
  };

  const toggleUserType = (type: string) => {
    setUserTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* New notification */}
      <div className="bg-white rounded-[0.75rem] border border-[var(--border)] p-5">
        <h3 className="font-[500] text-[var(--foreground)] mb-4 flex items-center gap-2">
          <Bell className="w-4 h-4 text-[#253663]" />
          Nova Notificação Broadcast
        </h3>

        <div className="space-y-4">
          <div>
            <label className="text-[0.8rem] text-[var(--muted-foreground)] block mb-1">Título</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Título da notificação..."
              className="w-full px-3 py-2 rounded-[0.75rem] border border-[var(--border)] text-[0.9rem] outline-none focus:border-[#253663]"
            />
          </div>

          <div>
            <label className="text-[0.8rem] text-[var(--muted-foreground)] block mb-1">Mensagem</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Conteúdo da notificação..."
              className="w-full px-3 py-2 rounded-[0.75rem] border border-[var(--border)] text-[0.9rem] outline-none focus:border-[#253663] resize-none h-24"
            />
          </div>

          <div>
            <label className="text-[0.8rem] text-[var(--muted-foreground)] block mb-1">Audiência</label>
            <select value={audience} onChange={e => setAudience(e.target.value)} className="w-full px-3 py-2 rounded-[0.75rem] border border-[var(--border)] text-[0.9rem] bg-white outline-none focus:border-[#253663]">
              <option value="all">Todos os usuários</option>
              <option value="type">Por tipo de usuário</option>
              <option value="region">Por região</option>
              <option value="active">Apenas ativos</option>
            </select>
          </div>

          {audience === 'type' && (
            <div>
              <label className="text-[0.8rem] text-[var(--muted-foreground)] block mb-2">Tipos de Usuário</label>
              <div className="flex flex-wrap gap-2">
                {['caminhoneiro', 'transportadora', 'embarcador', 'agenciador'].map(type => (
                  <button
                    key={type}
                    onClick={() => toggleUserType(type)}
                    className={`px-3 py-1.5 rounded-[0.75rem] text-[0.85rem] transition-colors capitalize ${
                      userTypes.includes(type) ? 'bg-[#253663] text-white' : 'bg-[var(--background)] border border-[var(--border)] text-[var(--muted-foreground)]'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          )}

          {audience === 'region' && (
            <div>
              <label className="text-[0.8rem] text-[var(--muted-foreground)] block mb-1">Região</label>
              <select value={region} onChange={e => setRegion(e.target.value)} className="w-full px-3 py-2 rounded-[0.75rem] border border-[var(--border)] text-[0.9rem] bg-white outline-none">
                <option value="all">Todas</option>
                <option value="sudeste">Sudeste</option>
                <option value="sul">Sul</option>
                <option value="nordeste">Nordeste</option>
                <option value="centro-oeste">Centro-Oeste</option>
                <option value="norte">Norte</option>
              </select>
            </div>
          )}

          <button
            onClick={handleSend}
            disabled={sending}
            className="flex items-center gap-2 px-6 py-2.5 rounded-[0.75rem] bg-[#253663] text-white hover:bg-[#253663]/90 disabled:opacity-50 transition-colors text-[0.9rem]"
          >
            <Send className="w-4 h-4" />
            {sending ? 'Enviando...' : 'Enviar Notificação'}
          </button>
        </div>
      </div>

      {/* History */}
      <div className="bg-white rounded-[0.75rem] border border-[var(--border)] p-5">
        <h3 className="font-[500] text-[var(--foreground)] mb-4">Histórico de Broadcasts</h3>
        <div className="space-y-3">
          {history.map(h => (
            <div key={h.id} className="flex items-start gap-3 p-3 rounded-[0.75rem] bg-[var(--background)] border border-[var(--border-light)]">
              <div className="p-2 rounded-full bg-green-100">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-[500] text-[0.9rem]">{h.title}</p>
                  <span className="text-[0.75rem] text-[var(--muted-foreground)]">
                    {new Date(h.sentAt).toLocaleDateString('pt-BR')} {new Date(h.sentAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-[0.85rem] text-[var(--muted-foreground)] mt-0.5">{h.message}</p>
                <div className="flex items-center gap-3 mt-2 text-[0.75rem] text-[var(--muted-foreground)]">
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {h.audience}</span>
                  <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500" /> {h.delivered.toLocaleString('pt-BR')} entregues</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
