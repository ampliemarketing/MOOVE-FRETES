/**
 * Central de Conformidade ANTT — RNTRC, seguros obrigatórios (RCTR-C, RC-DC, RC-V)
 * e checklist de adequação à MP 1.343/2026 / Resoluções ANTT 6.076-6.078/2026.
 *
 * Renderizada como aba dentro do ProfileScreen para transportadoras, agenciadores
 * (pessoa física) e caminhoneiros — perfis sujeitos a RNTRC e seguros obrigatórios.
 */

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Shield, AlertCircle, CheckCircle2, Clock, FileWarning } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import type { User as AppUser } from './contexts/AppContext';
import { database } from '../utils/database';
import { insurancePolicyRepository } from '../utils/antt/repositories';
import { getInsuranceSummary, getRntrcSummary, type ItemStatus, type InsuranceSummary, type RntrcSummary } from '../utils/antt/compliance';
import { MANDATORY_INSURANCE_TYPES, type InsurancePolicyType, type OwnerType } from '../utils/antt/types';

interface AnttComplianceTabProps {
  user: AppUser;
}

const STATUS_LABEL: Record<ItemStatus, { label: string; className: string }> = {
  ok: { label: 'Em dia', className: 'bg-green-100 text-green-700 border-green-300' },
  expiring_soon: { label: 'Vence em breve', className: 'bg-amber-100 text-amber-700 border-amber-300' },
  expired: { label: 'Vencido', className: 'bg-red-100 text-red-700 border-red-300' },
  missing: { label: 'Não cadastrado', className: 'bg-gray-100 text-gray-600 border-gray-300' },
  pending_verification: { label: 'Aguardando verificação', className: 'bg-blue-100 text-blue-700 border-blue-300' },
  blocked: { label: 'Bloqueado/Rejeitado', className: 'bg-red-100 text-red-700 border-red-300' },
};

const INSURANCE_INFO: Record<InsurancePolicyType, { name: string; description: string }> = {
  'RCTR-C': { name: 'RCTR-C', description: 'Responsabilidade Civil do Transportador Rodoviário — Carga' },
  'RC-DC': { name: 'RC-DC', description: 'Responsabilidade Civil — Desaparecimento de Carga' },
  'RC-V': { name: 'RC-V', description: 'Responsabilidade Civil — Veículo' },
};

const CHECKLIST_ITEMS = [
  'Manter o RNTRC ativo e revalidado',
  'Contratar e manter vigentes RCTR-C, RC-DC e RC-V',
  'Gerar CIOT em toda operação remunerada, vinculado ao MDF-e',
  'Nunca fechar frete abaixo do piso mínimo ANTT (calculadorafrete.antt.gov.br)',
  'Usar vale-pedágio 100% eletrônico (TAG/OCR) — sem dinheiro ou cupom em papel',
  'Classificar corretamente a operação (TAC, TAC Agregado, ETC ou CTC)',
];

function StatusBadge({ status }: { status: ItemStatus }) {
  const info = STATUS_LABEL[status];
  return <Badge className={info.className}>{info.label}</Badge>;
}

export function AnttComplianceTab({ user }: AnttComplianceTabProps) {
  const [loading, setLoading] = useState(true);
  const [ownerType, setOwnerType] = useState<OwnerType | null>(null);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [rntrc, setRntrc] = useState<RntrcSummary | null>(null);
  const [insurance, setInsurance] = useState<InsuranceSummary | null>(null);

  const [showPolicyDialog, setShowPolicyDialog] = useState<InsurancePolicyType | null>(null);
  const [policyForm, setPolicyForm] = useState({ insurerName: '', policyNumber: '', validUntil: '' });
  const [savingPolicy, setSavingPolicy] = useState(false);

  const isRelevantProfile = user.userType === 'transportadora' || user.userType === 'caminhoneiro' || user.userType === 'agenciador';

  const loadData = async () => {
    setLoading(true);
    try {
      let resolvedOwnerType: OwnerType | null = null;
      let resolvedOwnerId: string | null = null;

      if (user.userType === 'caminhoneiro') {
        const result = await database.drivers.getByUserId(user.id);
        if (result.success && result.data) {
          resolvedOwnerType = 'driver';
          resolvedOwnerId = (result.data as any).id;
        }
      } else {
        const result = await database.companies.getByUserId(user.id);
        if (result.success && result.data) {
          resolvedOwnerType = 'company';
          resolvedOwnerId = (result.data as any).id;
        }
      }

      setOwnerType(resolvedOwnerType);
      setOwnerId(resolvedOwnerId);

      if (resolvedOwnerType && resolvedOwnerId) {
        const [rntrcSummary, insuranceSummary] = await Promise.all([
          getRntrcSummary(resolvedOwnerType, resolvedOwnerId),
          getInsuranceSummary(resolvedOwnerType, resolvedOwnerId),
        ]);
        setRntrc(rntrcSummary);
        setInsurance(insuranceSummary);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar conformidade ANTT:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isRelevantProfile) loadData();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  const handleSavePolicy = async () => {
    if (!ownerType || !ownerId || !showPolicyDialog) return;
    if (!policyForm.validUntil) {
      toast.error('Informe a data de validade da apólice');
      return;
    }
    setSavingPolicy(true);
    try {
      const result = await insurancePolicyRepository.upsert({
        ownerType,
        ownerId,
        policyType: showPolicyDialog,
        insurerName: policyForm.insurerName || null,
        policyNumber: policyForm.policyNumber || null,
        validUntil: policyForm.validUntil,
      });
      if (result.success) {
        toast.success(`${showPolicyDialog} registrado — aguardando verificação`);
        setShowPolicyDialog(null);
        setPolicyForm({ insurerName: '', policyNumber: '', validUntil: '' });
        await loadData();
      } else {
        toast.error(result.error || 'Erro ao salvar apólice');
      }
    } finally {
      setSavingPolicy(false);
    }
  };

  if (!isRelevantProfile) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        A conformidade ANTT (RNTRC, seguros obrigatórios) se aplica a transportadoras, agenciadores e caminhoneiros.
      </div>
    );
  }

  if (loading) {
    return <div className="text-center py-12 text-sm text-muted-foreground">Carregando conformidade ANTT...</div>;
  }

  if (!ownerId) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground">
        Complete seu cadastro de {user.userType === 'caminhoneiro' ? 'motorista' : 'empresa'} para acompanhar sua conformidade ANTT.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="w-5 h-5 text-[#253663]" />
        <div>
          <h3 className="text-base font-medium text-[#111827]">Conformidade ANTT 2026</h3>
          <p className="text-sm text-[#6b7280]">MP 1.343/2026 e Resoluções ANTT 6.076–6.078/2026</p>
        </div>
      </div>

      {/* RNTRC */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-[#111827]">RNTRC</p>
              <p className="text-xs text-[#6b7280]">{rntrc?.rntrcNumber || 'Não informado'}</p>
            </div>
            {rntrc && <StatusBadge status={rntrc.itemStatus} />}
          </div>
          {rntrc?.expiry && (
            <p className="text-xs text-[#6b7280]">Validade: {new Date(rntrc.expiry).toLocaleDateString('pt-BR')}</p>
          )}
          <p className="text-xs text-[#9ca3af] mt-2">
            O status "Em dia" é confirmado manualmente pela equipe MooveFretes até a verificação automática via webservice ANTT estar disponível.
          </p>
        </CardContent>
      </Card>

      {/* Seguros obrigatórios */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-[#111827]">Seguros obrigatórios</p>
            {insurance && <StatusBadge status={insurance.overallStatus} />}
          </div>
          <div className="space-y-3">
            {MANDATORY_INSURANCE_TYPES.map((policyType) => {
              const item = insurance?.items.find((i) => i.policyType === policyType);
              return (
                <div key={policyType} className="flex items-center justify-between border border-[#e5e7eb] rounded-lg p-3">
                  <div>
                    <p className="text-sm font-medium text-[#111827]">{INSURANCE_INFO[policyType].name}</p>
                    <p className="text-xs text-[#6b7280]">{INSURANCE_INFO[policyType].description}</p>
                    {item?.validUntil && (
                      <p className="text-xs text-[#9ca3af] mt-0.5">Válido até {new Date(item.validUntil).toLocaleDateString('pt-BR')}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {item && <StatusBadge status={item.itemStatus} />}
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7"
                      onClick={() => {
                        setPolicyForm({ insurerName: '', policyNumber: '', validUntil: '' });
                        setShowPolicyDialog(policyType);
                      }}
                    >
                      {item && item.itemStatus !== 'missing' ? 'Renovar' : 'Cadastrar'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Checklist */}
      <Card>
        <CardContent className="p-5">
          <p className="text-sm font-medium text-[#111827] mb-3">Checklist de adequação</p>
          <ul className="space-y-2">
            {CHECKLIST_ITEMS.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-[#374151]">
                <CheckCircle2 className="w-4 h-4 text-[#253663] mt-0.5 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Dialog open={!!showPolicyDialog} onOpenChange={(open) => !open && setShowPolicyDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cadastrar {showPolicyDialog}</DialogTitle>
            <DialogDescription>
              {showPolicyDialog && INSURANCE_INFO[showPolicyDialog].description}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Seguradora</Label>
              <Input
                value={policyForm.insurerName}
                onChange={(e) => setPolicyForm(prev => ({ ...prev, insurerName: e.target.value }))}
                placeholder="Nome da seguradora"
              />
            </div>
            <div className="space-y-2">
              <Label>Número da apólice</Label>
              <Input
                value={policyForm.policyNumber}
                onChange={(e) => setPolicyForm(prev => ({ ...prev, policyNumber: e.target.value }))}
                placeholder="Número da apólice"
              />
            </div>
            <div className="space-y-2">
              <Label>Válido até *</Label>
              <Input
                type="date"
                value={policyForm.validUntil}
                onChange={(e) => setPolicyForm(prev => ({ ...prev, validUntil: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPolicyDialog(null)} disabled={savingPolicy}>Cancelar</Button>
            <Button onClick={handleSavePolicy} disabled={savingPolicy} className="bg-[#253663] hover:bg-[#1a2847] text-white">
              {savingPolicy ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
