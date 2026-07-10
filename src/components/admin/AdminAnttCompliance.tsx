/**
 * Painel Admin — Conformidade ANTT 2026
 * Verificação manual de RNTRC e seguros obrigatórios (enquanto não há webservice
 * ANTT integrado) + edição da tabela de coeficientes do piso mínimo.
 */

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Shield, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseClient } from '../../utils/supabase/client';
import { rntrcVerificationRepository, insurancePolicyRepository } from '../../utils/antt/repositories';
import { fetchPisoMinimoCoefficients } from '../../utils/antt/pisoMinimo';
import type { PisoMinimoCoefficient } from '../../utils/antt/types';

interface PendingRntrcOwner {
  ownerType: 'company' | 'driver';
  ownerId: string;
  name: string;
  rntrcNumber: string;
  rntrcExpiry: string | null;
}

interface PendingPolicy {
  id: string;
  ownerType: string;
  ownerId: string;
  ownerName: string;
  policyType: string;
  insurerName: string | null;
  policyNumber: string | null;
  validUntil: string;
}

export function AdminAnttCompliance() {
  const [loading, setLoading] = useState(true);
  const [pendingRntrc, setPendingRntrc] = useState<PendingRntrcOwner[]>([]);
  const [pendingPolicies, setPendingPolicies] = useState<PendingPolicy[]>([]);
  const [coefficients, setCoefficients] = useState<PisoMinimoCoefficient[]>([]);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseClient();

      const [{ data: companies }, { data: drivers }, { data: policies }, coeffs] = await Promise.all([
        supabase.from('companies').select('id, company_name, rntrc, rntrc_expiry, rntrc_status').eq('rntrc_status', 'pendente_verificacao').not('rntrc', 'is', null),
        supabase.from('drivers').select('id, name, rntrc, rntrc_expiry, rntrc_status').eq('rntrc_status', 'pendente_verificacao').not('rntrc', 'is', null),
        supabase.from('insurance_policies').select('*').eq('status', 'pending_verification'),
        fetchPisoMinimoCoefficients(true),
      ]);

      const rntrcList: PendingRntrcOwner[] = [
        ...(companies || []).map((c: any) => ({ ownerType: 'company' as const, ownerId: c.id, name: c.company_name, rntrcNumber: c.rntrc, rntrcExpiry: c.rntrc_expiry })),
        ...(drivers || []).map((d: any) => ({ ownerType: 'driver' as const, ownerId: d.id, name: d.name || 'Motorista', rntrcNumber: d.rntrc, rntrcExpiry: d.rntrc_expiry })),
      ];
      setPendingRntrc(rntrcList);

      // Resolver nomes dos donos das apólices pendentes
      const policyList: PendingPolicy[] = [];
      for (const p of policies || []) {
        let ownerName = 'Desconhecido';
        if (p.owner_type === 'company') {
          const { data } = await supabase.from('companies').select('company_name').eq('id', p.owner_id).maybeSingle();
          ownerName = data?.company_name || ownerName;
        } else {
          const { data } = await supabase.from('drivers').select('name').eq('id', p.owner_id).maybeSingle();
          ownerName = data?.name || ownerName;
        }
        policyList.push({
          id: p.id, ownerType: p.owner_type, ownerId: p.owner_id, ownerName,
          policyType: p.policy_type, insurerName: p.insurer_name, policyNumber: p.policy_number, validUntil: p.valid_until,
        });
      }
      setPendingPolicies(policyList);
      setCoefficients(coeffs);
    } catch (error) {
      console.error('❌ Erro ao carregar conformidade ANTT (admin):', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleVerifyRntrc = async (owner: PendingRntrcOwner, status: 'ativo' | 'suspenso' | 'cancelado') => {
    setSavingKey(`${owner.ownerType}-${owner.ownerId}`);
    try {
      const result = await rntrcVerificationRepository.recordManualVerification({
        ownerType: owner.ownerType,
        ownerId: owner.ownerId,
        rntrcNumber: owner.rntrcNumber,
        status,
        checkedBy: 'admin',
      });
      if (result.success) {
        toast.success(`RNTRC de ${owner.name} marcado como ${status}`);
        setPendingRntrc(prev => prev.filter(o => !(o.ownerType === owner.ownerType && o.ownerId === owner.ownerId)));
      } else {
        toast.error(result.error || 'Erro ao registrar verificação');
      }
    } finally {
      setSavingKey(null);
    }
  };

  const handleVerifyPolicy = async (policy: PendingPolicy, status: 'active' | 'rejected') => {
    setSavingKey(policy.id);
    try {
      const result = await insurancePolicyRepository.verify(policy.id, status, 'admin');
      if (result.success) {
        toast.success(`${policy.policyType} de ${policy.ownerName} ${status === 'active' ? 'aprovado' : 'rejeitado'}`);
        setPendingPolicies(prev => prev.filter(p => p.id !== policy.id));
      } else {
        toast.error(result.error || 'Erro ao verificar apólice');
      }
    } finally {
      setSavingKey(null);
    }
  };

  const handleUpdateCoefficient = async (coef: PisoMinimoCoefficient, field: 'ccd' | 'cc', value: string) => {
    const numeric = parseFloat(value.replace(',', '.'));
    if (isNaN(numeric)) return;
    try {
      const supabase = getSupabaseClient();
      await supabase
        .from('piso_minimo_coefficients')
        .update({ [field]: numeric, needs_verification: false, updated_at: new Date().toISOString() })
        .eq('id', coef.id);
      setCoefficients(prev => prev.map(c => c.id === coef.id ? { ...c, [field]: numeric, needsVerification: false } : c));
    } catch (error) {
      toast.error('Erro ao atualizar coeficiente');
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Carregando conformidade ANTT...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="w-5 h-5 text-[#253663]" />
        <h2 className="text-lg font-medium text-[#111827]">Conformidade ANTT 2026</h2>
      </div>

      <Tabs defaultValue="rntrc">
        <TabsList>
          <TabsTrigger value="rntrc">RNTRC pendentes ({pendingRntrc.length})</TabsTrigger>
          <TabsTrigger value="insurance">Seguros pendentes ({pendingPolicies.length})</TabsTrigger>
          <TabsTrigger value="piso">Piso mínimo (coeficientes)</TabsTrigger>
        </TabsList>

        <TabsContent value="rntrc" className="space-y-3 mt-4">
          {pendingRntrc.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma verificação de RNTRC pendente.</p>}
          {pendingRntrc.map((owner) => (
            <Card key={`${owner.ownerType}-${owner.ownerId}`}>
              <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="text-sm font-medium text-[#111827]">{owner.name}</p>
                  <p className="text-xs text-[#6b7280]">
                    {owner.ownerType === 'company' ? 'Transportadora' : 'Motorista'} · RNTRC {owner.rntrcNumber}
                    {owner.rntrcExpiry && ` · válido até ${new Date(owner.rntrcExpiry).toLocaleDateString('pt-BR')}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" disabled={savingKey === `${owner.ownerType}-${owner.ownerId}`} className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleVerifyRntrc(owner, 'ativo')}>
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Ativo
                  </Button>
                  <Button size="sm" variant="outline" disabled={savingKey === `${owner.ownerType}-${owner.ownerId}`} onClick={() => handleVerifyRntrc(owner, 'suspenso')}>
                    Suspenso
                  </Button>
                  <Button size="sm" variant="outline" className="text-red-600 border-red-300" disabled={savingKey === `${owner.ownerType}-${owner.ownerId}`} onClick={() => handleVerifyRntrc(owner, 'cancelado')}>
                    <XCircle className="w-3.5 h-3.5 mr-1" /> Cancelado
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="insurance" className="space-y-3 mt-4">
          {pendingPolicies.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma apólice pendente de verificação.</p>}
          {pendingPolicies.map((policy) => (
            <Card key={policy.id}>
              <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="text-sm font-medium text-[#111827]">{policy.ownerName} — {policy.policyType}</p>
                  <p className="text-xs text-[#6b7280]">
                    {policy.insurerName || 'Seguradora não informada'} · apólice {policy.policyNumber || 's/n'} · válida até {new Date(policy.validUntil).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" disabled={savingKey === policy.id} className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleVerifyPolicy(policy, 'active')}>
                    Aprovar
                  </Button>
                  <Button size="sm" variant="outline" className="text-red-600 border-red-300" disabled={savingKey === policy.id} onClick={() => handleVerifyPolicy(policy, 'rejected')}>
                    Rejeitar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="piso" className="mt-4">
          <div className="flex items-start gap-2 p-3 mb-4 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              Os coeficientes CCD/CC mudam por "gatilho do diesel" ao longo do ano. Confira os valores oficiais em
              calculadorafrete.antt.gov.br e atualize as linhas marcadas como "estimativa" abaixo.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[#6b7280] border-b border-[#e5e7eb]">
                  <th className="py-2 pr-4">Categoria</th>
                  <th className="py-2 pr-4">Tabela</th>
                  <th className="py-2 pr-4">Eixos</th>
                  <th className="py-2 pr-4">CCD (R$/km)</th>
                  <th className="py-2 pr-4">CC (R$)</th>
                  <th className="py-2 pr-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {coefficients.sort((a, b) => a.categoriaCarga.localeCompare(b.categoriaCarga) || a.eixos - b.eixos).map((coef) => (
                  <tr key={coef.id} className="border-b border-[#f3f4f6]">
                    <td className="py-2 pr-4">{coef.categoriaCarga}</td>
                    <td className="py-2 pr-4">{coef.tabela}</td>
                    <td className="py-2 pr-4">{coef.eixos}</td>
                    <td className="py-2 pr-4">
                      <Input
                        defaultValue={coef.ccd}
                        className="w-24 h-8 text-xs"
                        onBlur={(e) => handleUpdateCoefficient(coef, 'ccd', e.target.value)}
                      />
                    </td>
                    <td className="py-2 pr-4">
                      <Input
                        defaultValue={coef.cc}
                        className="w-24 h-8 text-xs"
                        onBlur={(e) => handleUpdateCoefficient(coef, 'cc', e.target.value)}
                      />
                    </td>
                    <td className="py-2 pr-4">
                      {coef.needsVerification
                        ? <Badge className="bg-amber-100 text-amber-700 border-amber-300">Estimativa</Badge>
                        : <Badge className="bg-green-100 text-green-700 border-green-300">Confirmado</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
