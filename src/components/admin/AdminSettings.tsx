import React, { useState } from 'react';
import { Save, Settings, Percent, Clock, Trophy, Mail, AlertTriangle, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface SystemConfig {
  platformFeePercent: number;
  minFreightValue: number;
  maxFreightValue: number;
  driverAvailabilityHours: number;
  xpPerFreightCompleted: number;
  xpPerRating: number;
  xpPerPost: number;
  levelThresholds: string;
  maintenanceMode: boolean;
  maintenanceBanner: string;
  featureChat: boolean;
  featureTracking: boolean;
  featureSocialFeed: boolean;
  featureGamification: boolean;
  featureScheduledFreights: boolean;
  featurePreferredRoutes: boolean;
}

export function AdminSettings() {
  const [config, setConfig] = useState<SystemConfig>({
    platformFeePercent: 5,
    minFreightValue: 200,
    maxFreightValue: 500000,
    driverAvailabilityHours: 24,
    xpPerFreightCompleted: 100,
    xpPerRating: 25,
    xpPerPost: 10,
    levelThresholds: '0, 500, 1500, 3500, 7000, 15000',
    maintenanceMode: false,
    maintenanceBanner: '',
    featureChat: true,
    featureTracking: true,
    featureSocialFeed: true,
    featureGamification: true,
    featureScheduledFreights: true,
    featurePreferredRoutes: true,
  });

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 800));
    setSaving(false);
    toast.success('Configurações salvas com sucesso');
  };

  const update = (key: keyof SystemConfig, value: any) => setConfig(prev => ({ ...prev, [key]: value }));

  const FeatureToggle = ({ label, configKey, description }: { label: string; configKey: keyof SystemConfig; description: string }) => (
    <div className="flex items-center justify-between py-3 border-b border-[var(--border-light)] last:border-0">
      <div>
        <p className="text-[0.9rem] font-[500] text-[var(--foreground)]">{label}</p>
        <p className="text-[0.75rem] text-[var(--muted-foreground)]">{description}</p>
      </div>
      <button onClick={() => update(configKey, !config[configKey])} className="text-2xl">
        {config[configKey] ? (
          <ToggleRight className="w-8 h-8 text-green-600" />
        ) : (
          <ToggleLeft className="w-8 h-8 text-gray-400" />
        )}
      </button>
    </div>
  );

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Platform Fees */}
      <div className="bg-white rounded-[0.75rem] border border-[var(--border)] p-5">
        <h3 className="font-[500] text-[var(--foreground)] mb-4 flex items-center gap-2">
          <Percent className="w-4 h-4 text-[#253663]" />
          Taxas e Valores
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[0.8rem] text-[var(--muted-foreground)] block mb-1">Taxa da Plataforma (%)</label>
            <input type="number" value={config.platformFeePercent} onChange={e => update('platformFeePercent', Number(e.target.value))} className="w-full px-3 py-2 rounded-[0.75rem] border border-[var(--border)] text-[0.9rem] outline-none focus:border-[#253663]" min={0} max={100} step={0.5} />
          </div>
          <div>
            <label className="text-[0.8rem] text-[var(--muted-foreground)] block mb-1">Valor Mínimo Frete (R$)</label>
            <input type="number" value={config.minFreightValue} onChange={e => update('minFreightValue', Number(e.target.value))} className="w-full px-3 py-2 rounded-[0.75rem] border border-[var(--border)] text-[0.9rem] outline-none focus:border-[#253663]" min={0} />
          </div>
          <div>
            <label className="text-[0.8rem] text-[var(--muted-foreground)] block mb-1">Valor Máximo Frete (R$)</label>
            <input type="number" value={config.maxFreightValue} onChange={e => update('maxFreightValue', Number(e.target.value))} className="w-full px-3 py-2 rounded-[0.75rem] border border-[var(--border)] text-[0.9rem] outline-none focus:border-[#253663]" min={0} />
          </div>
          <div>
            <label className="text-[0.8rem] text-[var(--muted-foreground)] block mb-1">Disponibilidade Motorista (horas)</label>
            <input type="number" value={config.driverAvailabilityHours} onChange={e => update('driverAvailabilityHours', Number(e.target.value))} className="w-full px-3 py-2 rounded-[0.75rem] border border-[var(--border)] text-[0.9rem] outline-none focus:border-[#253663]" min={1} max={168} />
          </div>
        </div>
      </div>

      {/* Gamification */}
      <div className="bg-white rounded-[0.75rem] border border-[var(--border)] p-5">
        <h3 className="font-[500] text-[var(--foreground)] mb-4 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500" />
          Gamificação
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-[0.8rem] text-[var(--muted-foreground)] block mb-1">XP por Frete Concluído</label>
            <input type="number" value={config.xpPerFreightCompleted} onChange={e => update('xpPerFreightCompleted', Number(e.target.value))} className="w-full px-3 py-2 rounded-[0.75rem] border border-[var(--border)] text-[0.9rem] outline-none focus:border-[#253663]" />
          </div>
          <div>
            <label className="text-[0.8rem] text-[var(--muted-foreground)] block mb-1">XP por Avaliação</label>
            <input type="number" value={config.xpPerRating} onChange={e => update('xpPerRating', Number(e.target.value))} className="w-full px-3 py-2 rounded-[0.75rem] border border-[var(--border)] text-[0.9rem] outline-none focus:border-[#253663]" />
          </div>
          <div>
            <label className="text-[0.8rem] text-[var(--muted-foreground)] block mb-1">XP por Post</label>
            <input type="number" value={config.xpPerPost} onChange={e => update('xpPerPost', Number(e.target.value))} className="w-full px-3 py-2 rounded-[0.75rem] border border-[var(--border)] text-[0.9rem] outline-none focus:border-[#253663]" />
          </div>
        </div>
        <div className="mt-4">
          <label className="text-[0.8rem] text-[var(--muted-foreground)] block mb-1">Thresholds de Nível (XP, separados por vírgula)</label>
          <input type="text" value={config.levelThresholds} onChange={e => update('levelThresholds', e.target.value)} className="w-full px-3 py-2 rounded-[0.75rem] border border-[var(--border)] text-[0.9rem] outline-none focus:border-[#253663]" />
        </div>
      </div>

      {/* Maintenance */}
      <div className="bg-white rounded-[0.75rem] border border-[var(--border)] p-5">
        <h3 className="font-[500] text-[var(--foreground)] mb-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          Manutenção
        </h3>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[0.9rem] font-[500]">Modo Manutenção</p>
            <p className="text-[0.75rem] text-[var(--muted-foreground)]">Ativa modo read-only global</p>
          </div>
          <button onClick={() => update('maintenanceMode', !config.maintenanceMode)}>
            {config.maintenanceMode ? (
              <ToggleRight className="w-8 h-8 text-red-600" />
            ) : (
              <ToggleLeft className="w-8 h-8 text-gray-400" />
            )}
          </button>
        </div>
        {config.maintenanceMode && (
          <div>
            <label className="text-[0.8rem] text-[var(--muted-foreground)] block mb-1">Banner de Aviso</label>
            <textarea
              value={config.maintenanceBanner}
              onChange={e => update('maintenanceBanner', e.target.value)}
              placeholder="Ex: Estamos em manutenção programada até 22h. Desculpe o transtorno."
              className="w-full px-3 py-2 rounded-[0.75rem] border border-[var(--border)] text-[0.9rem] outline-none focus:border-[#253663] resize-none h-20"
            />
          </div>
        )}
      </div>

      {/* Feature Flags */}
      <div className="bg-white rounded-[0.75rem] border border-[var(--border)] p-5">
        <h3 className="font-[500] text-[var(--foreground)] mb-4 flex items-center gap-2">
          <Settings className="w-4 h-4 text-[#253663]" />
          Feature Flags
        </h3>
        <FeatureToggle label="Chat" configKey="featureChat" description="Sistema de mensagens diretas entre usuários" />
        <FeatureToggle label="Rastreamento" configKey="featureTracking" description="Timeline de eventos do frete com upload de fotos" />
        <FeatureToggle label="Feed Social" configKey="featureSocialFeed" description="Rede social com posts, curtidas e comentários" />
        <FeatureToggle label="Gamificação" configKey="featureGamification" description="Sistema de XP, níveis e conquistas" />
        <FeatureToggle label="Fretes Agendados" configKey="featureScheduledFreights" description="Permite agendar fretes para datas futuras" />
        <FeatureToggle label="Rotas Preferidas" configKey="featurePreferredRoutes" description="Motoristas publicam suas rotas de interesse" />
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-[0.75rem] bg-[#253663] text-white hover:bg-[#253663]/90 disabled:opacity-50 transition-colors text-[0.9rem]"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </div>
    </div>
  );
}
