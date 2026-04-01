import React, { useState } from 'react';
import { UserCog, RefreshCw, Database, Shield, Trash2, AlertTriangle, Terminal, HardDrive, Zap, Ban } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

export function AdminTools() {
  const [impersonateEmail, setImpersonateEmail] = useState('');
  const [banIp, setBanIp] = useState('');
  const [confirmAction, setConfirmAction] = useState<string | null>(null);

  const handleImpersonate = () => {
    if (!impersonateEmail.trim()) {
      toast.error('Informe o email do usuário');
      return;
    }
    toast.info(`Impersonando ${impersonateEmail}... (modo simulado)`);
    setImpersonateEmail('');
  };

  const handleBanIp = () => {
    if (!banIp.trim()) {
      toast.error('Informe o IP ou range');
      return;
    }
    toast.success(`IP ${banIp} banido com sucesso`);
    setBanIp('');
  };

  const tools = [
    {
      icon: RefreshCw,
      title: 'Limpar Cache Global',
      description: 'Remove todos os dados em cache dos usuários e força recarregamento',
      action: 'clear_cache',
      color: 'text-blue-600 bg-blue-100',
      danger: false,
    },
    {
      icon: Zap,
      title: 'Forçar Sync Offline',
      description: 'Força sincronização de todos os dados offline pendentes',
      action: 'force_sync',
      color: 'text-amber-600 bg-amber-100',
      danger: false,
    },
    {
      icon: Database,
      title: 'Métricas Supabase',
      description: 'Visualizar uso de storage, queries lentas e conexões ativas',
      action: 'supabase_metrics',
      color: 'text-green-600 bg-green-100',
      danger: false,
    },
    {
      icon: HardDrive,
      title: 'Limpar Storage Órfão',
      description: 'Remove arquivos no Storage sem referência no banco de dados',
      action: 'clean_storage',
      color: 'text-purple-600 bg-purple-100',
      danger: true,
    },
    {
      icon: Trash2,
      title: 'Limpar Logs Antigos',
      description: 'Remove logs de auditoria com mais de 90 dias',
      action: 'clean_logs',
      color: 'text-red-600 bg-red-100',
      danger: true,
    },
  ];

  const handleToolAction = async (action: string) => {
    setConfirmAction(null);
    toast.loading('Executando...', { id: action });
    await new Promise(r => setTimeout(r, 1500));
    toast.dismiss(action);

    switch (action) {
      case 'clear_cache': toast.success('Cache global limpo. 156 entradas removidas.'); break;
      case 'force_sync': toast.success('Sync forçado. 23 registros sincronizados.'); break;
      case 'supabase_metrics': toast.info('Storage: 2.4GB/5GB | Conexões: 34/100 | Queries lentas: 2'); break;
      case 'clean_storage': toast.success('12 arquivos órfãos removidos (18.3 MB liberados)'); break;
      case 'clean_logs': toast.success('4.521 logs antigos removidos'); break;
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Impersonate */}
      <div className="bg-white rounded-[0.75rem] border border-[var(--border)] p-5">
        <h3 className="font-[500] text-[var(--foreground)] mb-1 flex items-center gap-2">
          <UserCog className="w-4 h-4 text-amber-500" />
          Impersonate Usuário
        </h3>
        <p className="text-[0.8rem] text-[var(--muted-foreground)] mb-4">
          Faça login como qualquer usuário para debugging. Todas as ações serão logadas.
        </p>
        <div className="flex gap-2">
          <input
            type="email"
            value={impersonateEmail}
            onChange={e => setImpersonateEmail(e.target.value)}
            placeholder="Email do usuário..."
            className="flex-1 px-3 py-2 rounded-[0.75rem] border border-[var(--border)] text-[0.9rem] outline-none focus:border-[#253663]"
          />
          <button onClick={handleImpersonate} className="px-4 py-2 rounded-[0.75rem] bg-amber-500 text-white hover:bg-amber-600 transition-colors text-[0.9rem]">
            Impersonate
          </button>
        </div>
        <div className="mt-3 p-2.5 rounded-[0.5rem] bg-amber-50 border border-amber-200">
          <p className="text-[0.75rem] text-amber-800 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            Esta ação será registrada no log de auditoria com seu auth.uid() e IP.
          </p>
        </div>
      </div>

      {/* Ban IP */}
      <div className="bg-white rounded-[0.75rem] border border-[var(--border)] p-5">
        <h3 className="font-[500] text-[var(--foreground)] mb-1 flex items-center gap-2">
          <Ban className="w-4 h-4 text-red-500" />
          Banir IP / Range
        </h3>
        <p className="text-[0.8rem] text-[var(--muted-foreground)] mb-4">
          Bloqueia acesso de IPs suspeitos à plataforma.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={banIp}
            onChange={e => setBanIp(e.target.value)}
            placeholder="Ex: 192.168.1.0/24 ou 10.0.0.1"
            className="flex-1 px-3 py-2 rounded-[0.75rem] border border-[var(--border)] text-[0.9rem] outline-none focus:border-[#253663] font-mono"
          />
          <button onClick={handleBanIp} className="px-4 py-2 rounded-[0.75rem] bg-red-600 text-white hover:bg-red-700 transition-colors text-[0.9rem]">
            Banir
          </button>
        </div>
        <div className="mt-3">
          <p className="text-[0.75rem] text-[var(--muted-foreground)] mb-2">IPs banidos atualmente:</p>
          <div className="space-y-1">
            {['45.33.32.0/24', '185.220.101.0/24', '23.129.64.0/24'].map(ip => (
              <div key={ip} className="flex items-center justify-between py-1.5 px-3 rounded-[0.5rem] bg-red-50 border border-red-100">
                <span className="font-mono text-[0.8rem] text-red-700">{ip}</span>
                <button onClick={() => toast.success(`IP ${ip} removido do banlist`)} className="text-[0.75rem] text-red-600 hover:text-red-800">
                  Remover
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* System Tools */}
      <div className="bg-white rounded-[0.75rem] border border-[var(--border)] p-5">
        <h3 className="font-[500] text-[var(--foreground)] mb-4 flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[#253663]" />
          Ferramentas do Sistema
        </h3>
        <div className="space-y-3">
          {tools.map(tool => (
            <div key={tool.action} className="flex items-center justify-between p-3 rounded-[0.75rem] border border-[var(--border-light)] hover:border-[var(--border)] transition-colors">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-[0.5rem] ${tool.color}`}>
                  <tool.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-[500] text-[0.9rem]">{tool.title}</p>
                  <p className="text-[0.75rem] text-[var(--muted-foreground)]">{tool.description}</p>
                </div>
              </div>
              {tool.danger ? (
                confirmAction === tool.action ? (
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleToolAction(tool.action)} className="px-3 py-1 rounded-[0.5rem] bg-red-600 text-white text-[0.8rem] hover:bg-red-700">
                      Confirmar
                    </button>
                    <button onClick={() => setConfirmAction(null)} className="px-3 py-1 rounded-[0.5rem] border border-[var(--border)] text-[0.8rem] text-[var(--muted-foreground)]">
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmAction(tool.action)} className="px-3 py-1.5 rounded-[0.5rem] border border-red-200 text-red-600 text-[0.8rem] hover:bg-red-50 transition-colors">
                    Executar
                  </button>
                )
              ) : (
                <button onClick={() => handleToolAction(tool.action)} className="px-3 py-1.5 rounded-[0.5rem] border border-[var(--border)] text-[var(--muted-foreground)] text-[0.8rem] hover:border-[#253663] hover:text-[#253663] transition-colors">
                  Executar
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Supabase Metrics Summary */}
      <div className="bg-white rounded-[0.75rem] border border-[var(--border)] p-5">
        <h3 className="font-[500] text-[var(--foreground)] mb-4 flex items-center gap-2">
          <Database className="w-4 h-4 text-green-600" />
          Métricas Supabase
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="text-center p-3 rounded-[0.75rem] bg-[var(--background)]">
            <p className="text-[1.1rem] font-[500] text-[#253663]">2.4 GB</p>
            <p className="text-[0.7rem] text-[var(--muted-foreground)]">Storage Usado</p>
            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
              <div className="bg-[#253663] h-1.5 rounded-full" style={{ width: '48%' }} />
            </div>
            <p className="text-[0.65rem] text-[var(--muted-foreground)] mt-0.5">48% de 5 GB</p>
          </div>
          <div className="text-center p-3 rounded-[0.75rem] bg-[var(--background)]">
            <p className="text-[1.1rem] font-[500] text-green-600">34</p>
            <p className="text-[0.7rem] text-[var(--muted-foreground)]">Conexões Ativas</p>
            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
              <div className="bg-green-500 h-1.5 rounded-full" style={{ width: '34%' }} />
            </div>
            <p className="text-[0.65rem] text-[var(--muted-foreground)] mt-0.5">34% de 100</p>
          </div>
          <div className="text-center p-3 rounded-[0.75rem] bg-[var(--background)]">
            <p className="text-[1.1rem] font-[500] text-amber-500">2</p>
            <p className="text-[0.7rem] text-[var(--muted-foreground)]">Queries Lentas</p>
            <p className="text-[0.65rem] text-[var(--muted-foreground)] mt-2">&gt; 1000ms</p>
          </div>
          <div className="text-center p-3 rounded-[0.75rem] bg-[var(--background)]">
            <p className="text-[1.1rem] font-[500] text-blue-600">99.7%</p>
            <p className="text-[0.7rem] text-[var(--muted-foreground)]">Uptime (30d)</p>
            <p className="text-[0.65rem] text-green-600 mt-2">Saudável</p>
          </div>
        </div>
      </div>
    </div>
  );
}