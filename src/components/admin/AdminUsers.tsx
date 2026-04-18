import React, { useState, useEffect } from 'react';
import { Eye, Ban, Unlock, RotateCcw, UserCog, Shield, Mail } from 'lucide-react';
import { AdminDataTable } from './AdminDataTable';
import type { AdminUser } from './admin-mock-data';
import { fetchAdminUsers, updateUserStatus } from '../../utils/admin-supabase-service';
import { toast } from 'sonner@2.0.3';

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  blocked: 'bg-red-100 text-red-700',
  suspended: 'bg-orange-100 text-orange-700',
};

const statusLabels: Record<string, string> = {
  active: 'Ativo',
  pending: 'Pendente',
  blocked: 'Bloqueado',
  suspended: 'Suspenso',
};

const typeLabels: Record<string, string> = {
  caminhoneiro: 'Caminhoneiro',
  transportadora: 'Transportadora',
  embarcador: 'Embarcador',
  agenciador: 'Agenciador',
};

const typeColors: Record<string, string> = {
  caminhoneiro: 'bg-blue-100 text-blue-700',
  transportadora: 'bg-purple-100 text-purple-700',
  embarcador: 'bg-teal-100 text-teal-700',
  agenciador: 'bg-indigo-100 text-indigo-700',
};

export function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetchAdminUsers().then((data) => { setUsers(data); setLoading(false); });
  }, []);

  const filteredUsers = users.filter(u => {
    if (filterType !== 'all' && u.userType !== filterType) return false;
    if (filterStatus !== 'all' && u.status !== filterStatus) return false;
    return true;
  });

  const handleBlock = async (user: AdminUser) => {
    const newStatus = user.status === 'blocked' ? 'active' : 'blocked';
    await updateUserStatus(user.id, newStatus as AdminUser['status']);
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: newStatus as AdminUser['status'] } : u));
    toast.success(user.status === 'blocked' ? `${user.name} desbloqueado` : `${user.name} bloqueado`);
  };

  const handleImpersonate = (user: AdminUser) => {
    toast.info(`Impersonando ${user.name}... (modo de visualização simulado)`);
  };

  const columns = [
    {
      key: 'name',
      label: 'Usuário',
      render: (u: AdminUser) => (
        <div>
          <p className="font-[500]">{u.name}</p>
          <p className="text-[0.75rem] text-[var(--muted-foreground)]">{u.email}</p>
        </div>
      ),
    },
    {
      key: 'userType',
      label: 'Tipo',
      render: (u: AdminUser) => (
        <span className={`inline-flex px-2 py-0.5 rounded-full text-[0.75rem] font-[500] ${typeColors[u.userType]}`}>
          {typeLabels[u.userType]}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (u: AdminUser) => (
        <span className={`inline-flex px-2 py-0.5 rounded-full text-[0.75rem] font-[500] ${statusColors[u.status]}`}>
          {statusLabels[u.status]}
        </span>
      ),
    },
    {
      key: 'rating',
      label: 'Rating',
      render: (u: AdminUser) => (
        <span className="text-[0.85rem]">{u.rating > 0 ? `★ ${u.rating.toFixed(1)}` : '—'}</span>
      ),
    },
    {
      key: 'totalFreights',
      label: 'Fretes',
      render: (u: AdminUser) => <span>{u.totalFreights}</span>,
    },
    {
      key: 'city',
      label: 'Cidade/UF',
      render: (u: AdminUser) => <span className="text-[0.85rem]">{u.city}, {u.state}</span>,
    },
    {
      key: 'lastLogin',
      label: 'Último Login',
      render: (u: AdminUser) => (
        <span className="text-[0.8rem] text-[var(--muted-foreground)]">
          {new Date(u.lastLogin).toLocaleDateString('pt-BR')} {new Date(u.lastLogin).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Ações',
      sortable: false,
      render: (u: AdminUser) => (
        <div className="flex items-center gap-1">
          <button onClick={() => setSelectedUser(u)} className="p-1.5 rounded-[0.5rem] hover:bg-[var(--background)] text-[var(--muted-foreground)] hover:text-[#253663] transition-colors" title="Ver perfil">
            <Eye className="w-4 h-4" />
          </button>
          <button onClick={() => handleBlock(u)} className="p-1.5 rounded-[0.5rem] hover:bg-[var(--background)] text-[var(--muted-foreground)] hover:text-red-600 transition-colors" title={u.status === 'blocked' ? 'Desbloquear' : 'Bloquear'}>
            {u.status === 'blocked' ? <Unlock className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
          </button>
          <button onClick={() => handleImpersonate(u)} className="p-1.5 rounded-[0.5rem] hover:bg-[var(--background)] text-[var(--muted-foreground)] hover:text-amber-600 transition-colors" title="Impersonate">
            <UserCog className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const filterContent = (
    <div className="flex flex-wrap gap-3">
      <div>
        <label className="text-[0.75rem] text-[var(--muted-foreground)] block mb-1">Tipo</label>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="px-3 py-1.5 rounded-[0.5rem] border border-[var(--border)] text-[0.85rem] bg-white outline-none">
          <option value="all">Todos</option>
          <option value="caminhoneiro">Caminhoneiro</option>
          <option value="transportadora">Transportadora</option>
          <option value="embarcador">Embarcador</option>
          <option value="agenciador">Agenciador</option>
        </select>
      </div>
      <div>
        <label className="text-[0.75rem] text-[var(--muted-foreground)] block mb-1">Status</label>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-1.5 rounded-[0.5rem] border border-[var(--border)] text-[0.85rem] bg-white outline-none">
          <option value="all">Todos</option>
          <option value="active">Ativo</option>
          <option value="pending">Pendente</option>
          <option value="blocked">Bloqueado</option>
          <option value="suspended">Suspenso</option>
        </select>
      </div>
    </div>
  );

  const bulkActions = (
    <div className="flex gap-1">
      <button onClick={() => toast.success('Usuários selecionados bloqueados')} className="px-2.5 py-1 rounded-[0.5rem] bg-red-100 text-red-700 text-[0.75rem] hover:bg-red-200 transition-colors">
        Bloquear
      </button>
      <button onClick={() => toast.success('Notificação enviada')} className="px-2.5 py-1 rounded-[0.5rem] bg-blue-100 text-blue-700 text-[0.75rem] hover:bg-blue-200 transition-colors">
        Notificar
      </button>
    </div>
  );

  if (loading) return <div className="flex items-center justify-center py-12 text-[var(--muted-foreground)]">Carregando usuários...</div>;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-[0.75rem] border border-[var(--border)] p-3 text-center">
          <p className="text-[1.25rem] font-[500] text-[#253663]">{users.length}</p>
          <p className="text-[0.75rem] text-[var(--muted-foreground)]">Total</p>
        </div>
        <div className="bg-white rounded-[0.75rem] border border-[var(--border)] p-3 text-center">
          <p className="text-[1.25rem] font-[500] text-green-600">{users.filter(u => u.status === 'active').length}</p>
          <p className="text-[0.75rem] text-[var(--muted-foreground)]">Ativos</p>
        </div>
        <div className="bg-white rounded-[0.75rem] border border-[var(--border)] p-3 text-center">
          <p className="text-[1.25rem] font-[500] text-amber-500">{users.filter(u => u.status === 'pending').length}</p>
          <p className="text-[0.75rem] text-[var(--muted-foreground)]">Pendentes</p>
        </div>
        <div className="bg-white rounded-[0.75rem] border border-[var(--border)] p-3 text-center">
          <p className="text-[1.25rem] font-[500] text-red-500">{users.filter(u => u.status === 'blocked').length}</p>
          <p className="text-[0.75rem] text-[var(--muted-foreground)]">Bloqueados</p>
        </div>
      </div>

      <AdminDataTable
        data={filteredUsers}
        columns={columns}
        searchPlaceholder="Buscar por nome, email, CPF/CNPJ..."
        searchKeys={['name', 'email', 'cpfCnpj', 'city']}
        filterContent={filterContent}
        bulkActions={bulkActions}
        title="usuarios"
      />

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedUser(null)}>
          <div className="bg-white rounded-[0.75rem] max-w-lg w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-[500] text-[1.1rem] text-[var(--foreground)]">Detalhes do Usuário</h3>
              <button onClick={() => setSelectedUser(null)} className="p-1 rounded-full hover:bg-[var(--background)]">✕</button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-full bg-[#253663] flex items-center justify-center text-white text-[1.2rem] font-[500]">
                  {selectedUser.name.charAt(0)}
                </div>
                <div>
                  <p className="font-[500] text-[1rem]">{selectedUser.name}</p>
                  <p className="text-[0.85rem] text-[var(--muted-foreground)]">{selectedUser.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-[0.85rem]">
                <div><span className="text-[var(--muted-foreground)]">ID:</span> <span className="font-mono text-[0.75rem]">{selectedUser.id}</span></div>
                <div><span className="text-[var(--muted-foreground)]">Tipo:</span> <span className={`inline-flex px-2 py-0.5 rounded-full text-[0.75rem] font-[500] ${typeColors[selectedUser.userType]}`}>{typeLabels[selectedUser.userType]}</span></div>
                <div><span className="text-[var(--muted-foreground)]">Status:</span> <span className={`inline-flex px-2 py-0.5 rounded-full text-[0.75rem] font-[500] ${statusColors[selectedUser.status]}`}>{statusLabels[selectedUser.status]}</span></div>
                <div><span className="text-[var(--muted-foreground)]">Rating:</span> {selectedUser.rating > 0 ? `★ ${selectedUser.rating}` : '—'}</div>
                <div><span className="text-[var(--muted-foreground)]">Telefone:</span> {selectedUser.phone}</div>
                <div><span className="text-[var(--muted-foreground)]">CPF/CNPJ:</span> {selectedUser.cpfCnpj}</div>
                <div><span className="text-[var(--muted-foreground)]">Cidade:</span> {selectedUser.city}, {selectedUser.state}</div>
                <div><span className="text-[var(--muted-foreground)]">Fretes:</span> {selectedUser.totalFreights}</div>
                <div><span className="text-[var(--muted-foreground)]">Verificado:</span> {selectedUser.verified ? '✓ Sim' : '✗ Não'}</div>
                <div><span className="text-[var(--muted-foreground)]">Criado em:</span> {new Date(selectedUser.createdAt).toLocaleDateString('pt-BR')}</div>
              </div>
              <div className="flex gap-2 pt-4 border-t border-[var(--border)]">
                <button onClick={() => { handleBlock(selectedUser); setSelectedUser(null); }} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-[0.75rem] bg-red-50 text-red-700 text-[0.85rem] hover:bg-red-100 transition-colors">
                  <Ban className="w-4 h-4" />
                  {selectedUser.status === 'blocked' ? 'Desbloquear' : 'Bloquear'}
                </button>
                <button onClick={() => { toast.success('Link de reset enviado'); setSelectedUser(null); }} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-[0.75rem] bg-amber-50 text-amber-700 text-[0.85rem] hover:bg-amber-100 transition-colors">
                  <RotateCcw className="w-4 h-4" />
                  Reset Senha
                </button>
                <button onClick={() => { handleImpersonate(selectedUser); setSelectedUser(null); }} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-[0.75rem] bg-blue-50 text-blue-700 text-[0.85rem] hover:bg-blue-100 transition-colors">
                  <Shield className="w-4 h-4" />
                  Impersonate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
