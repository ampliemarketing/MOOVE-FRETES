/**
 * Tela para adicionar nova rota de interesse
 * Segue o mesmo padrão visual do FreightRegistration com design minimalista
 */

import React, { useState } from 'react';
import { 
  ArrowLeft,
  MapPin, 
  Navigation,
  AlertCircle,
  Loader2,
  CheckCircle,
  Send
} from 'lucide-react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { CityAutocomplete } from './CityAutocomplete';
import { toast } from 'sonner@2.0.3';
import { database } from '../utils/database';
import { useApp } from './contexts/AppContext';

interface AddPreferredRouteProps {
  onBack: () => void;
  onSuccess?: () => void;
}

export function AddPreferredRoute({ onBack, onSuccess }: AddPreferredRouteProps) {
  const { state } = useApp();
  const user = state.user;
  
  // ✅ Resolver companyId: se for colaborador, usar o companyId da empresa vinculada
  const resolvedCompanyId = user?.collaborator?.companyId || user?.id || '';
  
  const [originCityLabel, setOriginCityLabel] = useState('');
  const [destinationCityLabel, setDestinationCityLabel] = useState('');
  const [routeForm, setRouteForm] = useState({
    originCity: '',
    originState: '',
    destinationCity: '',
    destinationState: '',
    notes: ''
  });
  const [saving, setSaving] = useState(false);

  const updateRouteData = (field: keyof typeof routeForm, value: any) => {
    setRouteForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveRoute = async () => {
    const { originCity, originState, destinationCity, destinationState, notes } = routeForm;
    
    // Validação
    if (!originCity || !originState || !destinationCity || !destinationState) {
      toast.error('Preencha origem e destino');
      return;
    }
    
    // ✅ Validar se usuário está logado
    if (!user || !user.id) {
      toast.error('Você precisa estar logado para cadastrar uma rota');
      onBack();
      return;
    }
    
    setSaving(true);
    
    try {
      const result = await database.preferredRoutes.create({
        driverId: resolvedCompanyId,
        origin: { city: originCity, state: originState },
        destination: { city: destinationCity, state: destinationState },
        notes,
        isActive: true,
      });
      
      if (result.success) {
        toast.success('Rota cadastrada com sucesso! Empresas poderão ver sua disponibilidade.');
        
        // Chamar callback de sucesso
        if (onSuccess) {
          onSuccess();
        }
        
        // Voltar para tela anterior
        onBack();
      } else {
        toast.error(result.error || 'Erro ao cadastrar rota');
      }
    } catch (error) {
      console.error('Erro ao cadastrar rota:', error);
      toast.error('Erro ao cadastrar rota');
    } finally {
      setSaving(false);
    }
  };

  const isFormValid = routeForm.originCity && routeForm.originState && 
                      routeForm.destinationCity && routeForm.destinationState;

  return (
    <div className="min-h-screen bg-[#fafafa] overflow-y-auto">
      {/* Header fixo - minimalista */}
      <div className="bg-white border-b border-[#e5e7eb] sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="h-10 w-10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-[#111827]">Para onde você quer ir?</h1>
              <p className="text-sm text-[#6b7280]">
                Cadastre sua rota de interesse
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-6">
          {/* Info Card - minimalista */}
          <div className="bg-white border border-[#e5e7eb] rounded-lg p-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-[#f0f0f0] flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-[#6b7280]" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-[#111827] leading-relaxed">
                  Transportadoras e embarcadores poderão ver onde você quer ir e entrar em contato para oferecer fretes compatíveis com sua rota.
                </p>
              </div>
            </div>
          </div>

          {/* Origem e Destino */}
          <div className="bg-white border border-[#e5e7eb] rounded-lg">
            <div className="border-b border-[#e5e7eb] px-6 py-4">
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-[#253663]" />
                <div>
                  <h2 className="text-base font-medium text-[#111827]">Origem e Destino</h2>
                  <p className="text-sm text-[#6b7280] mt-0.5">
                    Informe de onde você está saindo e para onde deseja ir
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* Cidades */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <Label className="text-sm font-medium text-[#111827]">Cidade de origem *</Label>
                  </div>
                  <CityAutocomplete
                    label=""
                    value={originCityLabel}
                    onValueChange={(city, stateCode) => {
                      setOriginCityLabel(`${city} - ${stateCode}`);
                      updateRouteData('originCity', city);
                      updateRouteData('originState', stateCode);
                    }}
                    placeholder="Digite o nome da cidade"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <Label className="text-sm font-medium text-[#111827]">Cidade de destino *</Label>
                  </div>
                  <CityAutocomplete
                    label=""
                    value={destinationCityLabel}
                    onValueChange={(city, stateCode) => {
                      setDestinationCityLabel(`${city} - ${stateCode}`);
                      updateRouteData('destinationCity', city);
                      updateRouteData('destinationState', stateCode);
                    }}
                    placeholder="Digite o nome da cidade"
                  />
                </div>
              </div>

              {/* Preview da rota - minimalista */}
              {isFormValid && (
                <div className="p-4 bg-[#fafafa] border border-[#e5e7eb] rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-[#6b7280]" />
                    <p className="text-sm text-[#111827]">
                      {routeForm.originCity} ({routeForm.originState}) → {routeForm.destinationCity} ({routeForm.destinationState})
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Observações */}
          <div className="bg-white border border-[#e5e7eb] rounded-lg">
            <div className="border-b border-[#e5e7eb] px-6 py-4">
              <div className="flex items-center gap-3">
                <Navigation className="w-5 h-5 text-[#253663]" />
                <div>
                  <h2 className="text-base font-medium text-[#111827]">Observações (Opcional)</h2>
                  <p className="text-sm text-[#6b7280] mt-0.5">
                    Adicione informações sobre suas preferências ou requisitos
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-3">
              <Textarea
                placeholder="Ex: Prefiro cargas de eletrônicos, disponível a partir de segunda-feira, aceito cargas refrigeradas..."
                value={routeForm.notes}
                onChange={(e) => updateRouteData('notes', e.target.value)}
                rows={5}
                className="resize-none bg-input-background border-input-border"
              />
              <p className="text-xs text-[#6b7280]">
                Informações adicionais para melhor precisão
              </p>
            </div>
          </div>

          {/* Botões de ação no final */}
          <div className="bg-white border border-[#e5e7eb] rounded-lg p-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                onClick={onBack}
                className="flex-1 sm:flex-none sm:w-auto"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveRoute}
                disabled={saving || !isFormValid}
                className="flex-1 sm:flex-none sm:w-auto bg-[#253663] hover:bg-[#1e2b4f] text-white"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Enviar Rota
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}