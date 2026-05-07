import React, { useState, useEffect } from 'react';
import { AlertCircle, Clock, Search, Navigation, Phone, ExternalLink, ShieldAlert, Activity } from 'lucide-react';
import { AdminDataTable } from './AdminDataTable';
import type { CriticalFreight } from './admin-mock-data';
import { toast } from 'sonner@2.0.3';

export function AdminCriticalFreights() {
  const [items, setItems] = useState<CriticalFreight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mocking critical freights
    const mockData: CriticalFreight[] = [
      {
        id: '1',
        freightCode: 'MV-8821',
        status: 'active',
        issue: 'sem_motorista',
        severity: 'high',
        shipper: 'Indústrias Matos',
        origin: 'São Paulo, SP',
        destination: 'Curitiba, PR',
        value: 1250,
        timeInStatus: '48h',
        lastAction: 'Tentativa de impulsionamento'
      },
      {
        id: '2',
        freightCode: 'MV-9012',
        status: 'in_transit',
        issue: 'atrasado',
        severity: 'critical',
        shipper: 'Comercial Silva',
        origin: 'Belo Horizonte, MG',
        destination: 'Vitória, ES',
        value: 850,
        timeInStatus: '6h atraso',
        lastAction: 'Motorista não responde'
      },
      {
        id: '3',
        freightCode: 'MV-7741',
        status: 'active',
        issue: 'suspeita_fraude',
        severity: 'critical',
        shipper: 'User-7812',
        origin: 'Rio de Janeiro, RJ',
        destination: 'Manaus, AM',
        value: 15000,
        timeInStatus: '2h',
        lastAction: 'Bloqueio preventivo'
      }
    ];
    setItems(mockData);
    setLoading(false);
  }, []);

  const severityColors = {
    medium: 'bg-amber-100 text-amber-700',
    high: 'bg-orange-100 text-orange-700',
    critical: 'bg-red-100 text-red-700 animate-pulse',
  };

  const issueLabels = {
    atrasado: 'Atraso em Trânsito',
    sem_motorista: 'Sem Candidatos',
    cancelamento_recente: 'Cancelado Após Aceite',
    suspeita_fraude: 'Suspeita de Fraude',
  };

  const columns = [
    {
      key: 'freightCode',
      label: 'Código',
      render: (f: CriticalFreight) => <span className="font-mono font-bold text-indigo-600">{f.freightCode}</span>
    },
    {
      key: 'issue',
      label: 'Problema Identificado',
      render: (f: CriticalFreight) => (
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-[0.7rem] font-[600] ${severityColors[f.severity]}`}>
            {issueLabels[f.issue]}
          </span>
        </div>
      )
    },
    {
      key: 'shipper',
      label: 'Embarcador',
      render: (f: CriticalFreight) => <span className="text-[0.85rem] font-[500]">{f.shipper}</span>
    },
    {
      key: 'route',
      label: 'Rota',
      render: (f: CriticalFreight) => (
        <div className="text-[0.75rem] text-slate-500">
          <p>{f.origin}</p>
          <p className="text-[0.65rem] opacity-50">⬇</p>
          <p>{f.destination}</p>
        </div>
      )
    },
    {
      key: 'timeInStatus',
      label: 'Tempo Crítico',
      render: (f: CriticalFreight) => (
        <span className="flex items-center gap-1.5 text-red-600 font-[500]">
          <Clock className="w-3.5 h-3.5" />
          {f.timeInStatus}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Ações',
      render: (f: CriticalFreight) => (
        <div className="flex items-center gap-2">
          <button className="p-1.5 rounded-md hover:bg-indigo-50 text-indigo-600" title="Ver Detalhes">
            <ExternalLink className="w-4 h-4" />
          </button>
          <button className="p-1.5 rounded-md hover:bg-green-50 text-green-600" title="Ligar para Shipper">
            <Phone className="w-4 h-4" />
          </button>
          <button className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400" title="Rastrear Agora">
            <Navigation className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  if (loading) return <div className="flex items-center justify-center py-20 text-slate-500">Analisando fretes...</div>;

  return (
    <div className="space-y-6">
      <div className="p-4 bg-red-50 border border-red-100 rounded-[1rem] flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center animate-pulse">
          <ShieldAlert className="w-6 h-6 text-red-600" />
        </div>
        <div>
          <h3 className="font-[600] text-red-900">Monitoramento de Alerta Máximo</h3>
          <p className="text-sm text-red-700">Existem {items.filter(i => i.severity === 'critical').length} fretes com severidade CRÍTICA exigindo intervenção imediata.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-[1rem] border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 rounded-lg bg-orange-100">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <span className="text-xs font-bold text-orange-600">MÉDIA 4.2h</span>
          </div>
          <p className="text-slate-500 text-sm">Tempo Médio Sem Motorista</p>
          <p className="text-2xl font-bold text-slate-900">8.5 horas</p>
          <div className="mt-4 flex items-center gap-1 text-[0.7rem] text-red-500 font-bold">
            <Activity className="w-3 h-3" /> +12% vs ontem
          </div>
        </div>

        <div className="bg-white p-5 rounded-[1rem] border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 rounded-lg bg-red-100">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <span className="text-xs font-bold text-red-600">CRÍTICO</span>
          </div>
          <p className="text-slate-500 text-sm">Taxa de Cancelamento</p>
          <p className="text-2xl font-bold text-slate-900">3.8%</p>
          <div className="mt-4 flex items-center gap-1 text-[0.7rem] text-green-500 font-bold">
            <Activity className="w-3 h-3" /> -0.5% vs ontem
          </div>
        </div>

        <div className="bg-white p-5 rounded-[1rem] border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 rounded-lg bg-blue-100">
              <Navigation className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-xs font-bold text-blue-600">NORMAL</span>
          </div>
          <p className="text-slate-500 text-sm">Fretes Monitorados</p>
          <p className="text-2xl font-bold text-slate-900">42</p>
          <div className="mt-4 flex items-center gap-1 text-[0.7rem] text-slate-400">
            <Activity className="w-3 h-3" /> Em tempo real
          </div>
        </div>
      </div>

      <AdminDataTable
        data={items}
        columns={columns}
        title="fretes-criticos"
        searchPlaceholder="Buscar por código, embarcador..."
        searchKeys={['freightCode', 'shipper']}
      />
    </div>
  );
}
