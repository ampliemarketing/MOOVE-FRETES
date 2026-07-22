import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Switch } from './ui/switch';
import { Progress } from './ui/progress';
import { Checkbox } from './ui/checkbox';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { 
  MapPin, 
  Package, 
  Truck, 
  Calendar, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Plus,
  ArrowRight,
  FileText,
  Shield,
  Zap,
  Settings,
  User,
  Phone,
  Star,
  Crown,
  ChevronDown,
  Info,
  ArrowLeft,
  Pencil,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner@2.0.3';
import type { User as AppUser } from './contexts/AppContext';
import { database } from '../utils/database';
import { logUserAction } from '../utils/collaborator-activity-logger';
import { savedContactRepository, freightContactRepository } from '../utils/database/repositories/saved-contact-repository';
import { brazilianStates, getCitiesByState } from '../utils/brazil-locations';
import { CityAutocomplete } from './CityAutocomplete';
import { calculatePisoMinimo, parseCurrencyToNumber } from '../utils/antt/pisoMinimo';
import { estimateRouteDistanceKm } from '../utils/antt/distance';
import { ciotRepository } from '../utils/antt/repositories';
import {
  OPERATION_TYPE_LABELS,
  VALE_PEDAGIO_PROVIDER_LABELS,
  type OperationType,
  type PisoMinimoResult,
  type ValePedagioProviderId,
} from '../utils/antt/types';

interface FreightRegistrationProps {
  user: AppUser;
  onComplete?: () => void;
  onCancel?: () => void;
  initialData?: Partial<any>;
  freightId?: string;
  isEditing?: boolean;
}

interface FreightData {
  // Dados de coleta e entrega
  freightLocation: 'nacional' | 'internacional';
  originCity: string;
  originState: string;
  originContactName: string;
  originContactPhone: string;
  
  destinationCity: string;
  destinationState: string;
  destinationContactName: string;
  destinationContactPhone: string;
  
  // Responsáveis pelo frete (contatos)
  responsibleCollaborators: Array<{
    id: string;
    name: string;
    email: string;
    phone: string;
    isMainContact: boolean;
    source: 'collaborator' | 'manual' | 'saved_contact';
  }>;
  
  // Dados da carga
  product: string;
  species: string;
  cargoType: string; // "Carga Geral", etc.
  totalWeight: string;
  occupancyType: 'completa' | 'complemento'; // Renamed from cargoType
  volumes: string;
  volumeUnit: string;
  needsCover: boolean;
  needsTracker: boolean;
  isInsured: boolean;
  deliveryDate: string;
  
  // Mais detalhes da carga (opcionais)
  cubicWeight: string;
  totalCubicMeters: string;
  length: string;
  width: string;
  height: string;
  
  // Mais detalhes da carga (opcionais)
  hasAdditionalCargo: boolean;
  additionalCargoDetails: string;
  
  // Veículos selecionados - organizados por categoria
  selectedLightVehicles: string[];
  selectedMediumVehicles: string[];
  selectedHeavyVehicles: string[];
  
  // Carretas selecionadas - organizados por categoria  
  selectedClosedTrailers: string[];
  selectedOpenTrailers: string[];
  selectedSpecialTrailers: string[];
  
  // Informações de valor e pagamento
  freightValueType: 'known' | 'negotiable';
  freightValue: string;
  valueCalculation: string;
  tollPayment: 'included' | 'separate';
  paymentMethod: string;
  advancePayment: string;
  schedulingDate: string;

  // ✅ ANTT 2026 — CIOT universal, piso mínimo e classificação da operação
  operationType: OperationType;
  distanceKm: string;
  valePedagioProvider: ValePedagioProviderId;
  valePedagioTagNumber: string;
  paymentAccountType: 'propria' | 'terceiro_autorizado';

  // Urgência e data
  urgencyType: 'normal' | 'urgent' | 'scheduled';
  scheduledDate: string;
  
  // Observações
  observations: string;
  
  // Tipo do frete
  freightType: 'simple' | 'plus' | 'highlight';
  
  // Nível de exposição
  exposureLevel?: 'Alta exposição' | 'Média exposição' | 'Baixa exposição';
}

export function FreightRegistration({ 
  user, 
  onComplete, 
  onCancel,
  initialData,
  freightId,
  isEditing = false
}: FreightRegistrationProps) {
  // Removido sistema de etapas - formulário em etapa única
  
  // Preencher dados iniciais se fornecidos (para edição ou duplicação)
  const getInitialFreightData = (): FreightData => {
    const defaultData: FreightData = {
      freightLocation: 'nacional',
      originCity: '',
      originState: '',
      originContactName: '',
      originContactPhone: '',
      destinationCity: '',
      destinationState: '',
      destinationContactName: '',
      destinationContactPhone: '',
      responsibleCollaborators: [],
      product: '',
      species: '',
      cargoType: '',
      totalWeight: '',
      occupancyType: 'completa',
      volumes: '',
      volumeUnit: 'Por toneladas',
      needsCover: true,
      needsTracker: false,
      isInsured: true,
      deliveryDate: '',
      cubicWeight: '',
      totalCubicMeters: '',
      length: '',
      width: '',
      height: '',
      hasAdditionalCargo: false,
      additionalCargoDetails: '',
      selectedLightVehicles: [],
      selectedMediumVehicles: [],
      selectedHeavyVehicles: [],
      selectedClosedTrailers: [],
      selectedOpenTrailers: [],
      selectedSpecialTrailers: [],
      freightValueType: 'known',
      freightValue: '',
      valueCalculation: '',
      tollPayment: 'separate',
      paymentMethod: '',
      advancePayment: '',
      schedulingDate: '',
      urgencyType: 'normal',
      scheduledDate: '',
      observations: '',
      freightType: 'plus',
      operationType: user.userType === 'transportadora' ? 'ETC_FROTA_PROPRIA' : 'TAC',
      distanceKm: '',
      valePedagioProvider: 'pending_integration',
      valePedagioTagNumber: '',
      paymentAccountType: 'propria',
    };

    if (initialData) {
      return {
        ...defaultData,
        ...initialData,
        originCity: initialData.origin?.city || initialData.originCity || '',
        originState: initialData.origin?.state || initialData.originState || '',
        destinationCity: initialData.destination?.city || initialData.destinationCity || '',
        destinationState: initialData.destination?.state || initialData.destinationState || '',
        product: typeof initialData.cargo === 'string' ? initialData.cargo : (initialData.cargo?.type || initialData.product || ''),
        totalWeight: initialData.totalWeight || (initialData.cargo?.weight ? String(initialData.cargo.weight) : ''),
        deliveryDate: initialData.deliveryDate || initialData.pickupDate || '',
        scheduledDate: initialData.scheduledDate || initialData.pickupDate || '',
        observations: initialData.observations || '',
        freightValue: initialData.freightValue || (initialData.price && typeof initialData.price === 'string' ? initialData.price.replace('R$ ', '').replace('.', '').replace(',', '.') : ''),
        freightValueType: initialData.freightValueType || (initialData.price === 'A combinar' ? 'negotiable' : 'known'),
        tollPayment: initialData.tollPayment || (initialData.paymentIncluded ? 'included' : 'separate'),
        species: initialData.species || '',
        cargoType: initialData.cargoType || '',
        occupancyType: initialData.occupancyType || 'completa',
        volumes: initialData.volumes ? String(initialData.volumes) : '',
        volumeUnit: initialData.volumeUnit || 'Por toneladas',
        needsCover: initialData.needsCover !== undefined ? initialData.needsCover : true,
        needsTracker: initialData.needsTracker !== undefined ? initialData.needsTracker : false,
        isInsured: initialData.isInsured !== undefined ? initialData.isInsured : true,
        selectedLightVehicles: initialData.selectedLightVehicles || [],
        selectedMediumVehicles: initialData.selectedMediumVehicles || [],
        selectedHeavyVehicles: initialData.selectedHeavyVehicles || [],
        selectedClosedTrailers: initialData.selectedClosedTrailers || [],
        selectedOpenTrailers: initialData.selectedOpenTrailers || [],
        selectedSpecialTrailers: initialData.selectedSpecialTrailers || [],
        responsibleCollaborators: initialData.responsibleCollaborators || initialData.responsibleContacts || [],
        operationType: initialData.operationType || defaultData.operationType,
        distanceKm: initialData.distanceKm ? String(initialData.distanceKm) : '',
        valePedagioProvider: initialData.valePedagioProvider || 'pending_integration',
        valePedagioTagNumber: initialData.valePedagioTagNumber || '',
        paymentAccountType: initialData.paymentAccountType || 'propria',
      };
    }

    return defaultData;
  };
  
  const [freightData, setFreightData] = useState<FreightData>(getInitialFreightData());

  // ✅ ANTT 2026 — piso mínimo e distância estimada da rota
  const [pisoMinimo, setPisoMinimo] = useState<PisoMinimoResult | null>(null);
  const [isEstimatingDistance, setIsEstimatingDistance] = useState(false);

  // Estima automaticamente a distância da rota (origem → destino) via Mapbox
  // quando ambas as cidades estão preenchidas e a distância ainda não foi informada manualmente.
  useEffect(() => {
    let cancelled = false;
    const { originCity, originState, destinationCity, destinationState, distanceKm } = freightData;
    if (!originCity || !originState || !destinationCity || !destinationState || distanceKm) return;

    setIsEstimatingDistance(true);
    estimateRouteDistanceKm(originCity, originState, destinationCity, destinationState)
      .then((km) => {
        if (!cancelled && km) {
          setFreightData(prev => (prev.distanceKm ? prev : { ...prev, distanceKm: String(km) }));
        }
      })
      .finally(() => {
        if (!cancelled) setIsEstimatingDistance(false);
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freightData.originCity, freightData.originState, freightData.destinationCity, freightData.destinationState]);

  // Recalcula o piso mínimo ANTT sempre que carga, veículo ou distância mudarem
  useEffect(() => {
    let cancelled = false;
    const distance = parseFloat(freightData.distanceKm);
    if (!distance || distance <= 0 || !freightData.cargoType) {
      setPisoMinimo(null);
      return;
    }

    const vehicleLabels = [
      ...freightData.selectedLightVehicles,
      ...freightData.selectedMediumVehicles,
      ...freightData.selectedHeavyVehicles,
      ...freightData.selectedClosedTrailers,
      ...freightData.selectedOpenTrailers,
      ...freightData.selectedSpecialTrailers,
    ];

    calculatePisoMinimo({ cargoTypeLabel: freightData.cargoType, vehicleLabels, distanceKm: distance })
      .then((result) => { if (!cancelled) setPisoMinimo(result); });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    freightData.distanceKm,
    freightData.cargoType,
    freightData.selectedLightVehicles,
    freightData.selectedMediumVehicles,
    freightData.selectedHeavyVehicles,
    freightData.selectedClosedTrailers,
    freightData.selectedOpenTrailers,
    freightData.selectedSpecialTrailers,
  ]);

  const freightValueNumber = freightData.freightValueType === 'known' ? parseCurrencyToNumber(freightData.freightValue) : 0;
  const isBelowPisoMinimo = !!(pisoMinimo && freightData.freightValueType === 'known' && freightValueNumber > 0 && freightValueNumber < pisoMinimo.valor);
  const isTacOperation = freightData.operationType === 'TAC' || freightData.operationType === 'TAC_AGREGADO';
  const advancePaymentNumber = parseFloat(freightData.advancePayment) || 0;
  const advancePaymentBelowMinimum = isTacOperation && freightData.advancePayment !== '' && advancePaymentNumber < 70;
  const hasAllFreightData = !!(
    freightData.originCity &&
    freightData.destinationCity &&
    freightData.product &&
    freightData.cargoType &&
    freightData.totalWeight &&
    (
      freightData.selectedLightVehicles.length > 0 ||
      freightData.selectedMediumVehicles.length > 0 ||
      freightData.selectedHeavyVehicles.length > 0 ||
      freightData.selectedClosedTrailers.length > 0 ||
      freightData.selectedOpenTrailers.length > 0 ||
      freightData.selectedSpecialTrailers.length > 0
    ) &&
    freightData.distanceKm
  );

  // Estados de conformidade em tempo real para painel informativo
  let pisoMinimoStatus: 'pending' | 'success' | 'error' = 'pending';
  let pisoMinimoMessage = 'Aguardando preenchimento de rota, carga e veículos.';
  if (pisoMinimo) {
    if (freightData.freightValueType === 'negotiable') {
      pisoMinimoStatus = 'success';
      pisoMinimoMessage = `Valor a combinar. Piso mínimo calculado é R$ ${pisoMinimo.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`;
    } else {
      if (freightValueNumber === 0) {
        pisoMinimoStatus = 'pending';
        pisoMinimoMessage = `Piso mínimo calculado é R$ ${pisoMinimo.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Digite o valor do frete.`;
      } else if (isBelowPisoMinimo) {
        pisoMinimoStatus = 'error';
        const diff = pisoMinimo.valor - freightValueNumber;
        pisoMinimoMessage = `Abaixo do Piso ANTT por R$ ${diff.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (Mínimo: R$ ${pisoMinimo.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}).`;
      } else {
        pisoMinimoStatus = 'success';
        pisoMinimoMessage = `Valor atende ao piso mínimo de R$ ${pisoMinimo.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`;
      }
    }
  }

  let adiantamentoStatus: 'pending' | 'success' | 'error' | 'neutral' = 'neutral';
  let adiantamentoMessage = 'Não aplicável para esta modalidade.';
  if (isTacOperation) {
    if (freightData.advancePayment === '') {
      adiantamentoStatus = 'pending';
      adiantamentoMessage = 'Aguardando definição do percentual de adiantamento (mínimo 70%).';
    } else if (advancePaymentBelowMinimum) {
      adiantamentoStatus = 'error';
      adiantamentoMessage = `Adiantamento de ${freightData.advancePayment}% está abaixo do mínimo regulamentar de 70%.`;
    } else {
      adiantamentoStatus = 'success';
      adiantamentoMessage = `Adiantamento de ${freightData.advancePayment}% atende ao mínimo legal de 70%.`;
    }
  }

  const isFormCompliant = 
    (pisoMinimoStatus === 'success') && 
    (adiantamentoStatus === 'success' || adiantamentoStatus === 'neutral');

  // Estados para diálogo de contato manual
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [manualContact, setManualContact] = useState({
    name: '',
    email: '',
    phone: '',
  });

  // Verificar se o usuário pode criar fretes
  const canCreateFreight = user.userType !== 'caminhoneiro';
  
  // ✅ Resolver companyId: se for colaborador, usar o companyId da empresa vinculada
  const resolvedOwnerId = user?.collaborator?.companyId || user.id;
  const resolvedOwnerName = user?.collaborator?.companyName || user.name;

  // Estado para colaboradores reais da empresa
  const [realCollaborators, setRealCollaborators] = useState<any[]>([]);
  // Estado para contatos salvos da empresa
  const [savedContacts, setSavedContacts] = useState<any[]>([]);
  const [loadingCollaborators, setLoadingCollaborators] = useState(true);
  // ID da empresa do usuário (para salvar contatos)
  const [companyId, setCompanyId] = useState<string | null>(null);
  // Estado para edição/exclusão de contatos salvos
  const [editingSavedContact, setEditingSavedContact] = useState<any | null>(null);
  const [editContactForm, setEditContactForm] = useState({ name: '', email: '', phone: '' });
  const [savingEditContact, setSavingEditContact] = useState(false);
  const [deletingContactId, setDeletingContactId] = useState<string | null>(null);

  // Carregar colaboradores reais e contatos salvos da empresa
  useEffect(() => {
    const loadContactSources = async () => {
      try {
        setLoadingCollaborators(true);

        // 1. Buscar company_id do usuário
        let resolvedCompanyId: string | null = null;
        try {
          const companyResult = await database.companies.getByUserId(resolvedOwnerId);
          if (companyResult.success && companyResult.data) {
            resolvedCompanyId = (companyResult.data as any).id || null;
            setCompanyId(resolvedCompanyId);
          }
        } catch (e) {
          console.error('Erro ao buscar empresa:', e);
        }

        // 2. Carregar colaboradores da empresa
        const collabResponse = await database.collaborators.getByCompany(resolvedOwnerId);
        if (collabResponse.success && collabResponse.data) {
          const mapped = (collabResponse.data as any[]).map((collab: any) => ({
            id: collab.id,
            name: collab.name,
            email: collab.email,
            phone: collab.phone || '',
            isMainContact: false,
            source: 'collaborator' as const
          }));
          setRealCollaborators(mapped);
        }

        // 3. Carregar contatos salvos (manual) da empresa
        if (resolvedCompanyId) {
          const savedResult = await savedContactRepository.getByCompany(resolvedCompanyId);
          if (savedResult.success && savedResult.data) {
            const mapped = savedResult.data.map((sc: any) => ({
              id: `saved_${sc.id}`,
              savedContactId: sc.id,
              name: sc.name,
              email: sc.email || '',
              phone: sc.phone,
              isMainContact: false,
              source: 'saved_contact' as const
            }));
            setSavedContacts(mapped);
          }
        }
      } catch (error) {
        console.error('❌ Erro ao carregar contatos:', error);
      } finally {
        setLoadingCollaborators(false);
      }
    };

    loadContactSources();
  }, [resolvedOwnerId]);

  // Handlers para editar/excluir contatos salvos
  const handleEditSavedContact = (contact: any) => {
    setEditingSavedContact(contact);
    setEditContactForm({
      name: contact.name,
      email: contact.email || '',
      phone: contact.phone,
    });
  };

  const handleSaveEditContact = async () => {
    if (!editingSavedContact?.savedContactId) return;
    if (!editContactForm.name.trim() || !editContactForm.phone.trim()) {
      toast.error('Nome e telefone são obrigatórios');
      return;
    }
    setSavingEditContact(true);
    try {
      const result = await savedContactRepository.update(editingSavedContact.savedContactId, {
        name: editContactForm.name.trim(),
        email: editContactForm.email.trim() || null,
        phone: editContactForm.phone.trim(),
      });
      if (result.success) {
        // Atualizar lista local
        setSavedContacts(prev => prev.map(sc =>
          sc.savedContactId === editingSavedContact.savedContactId
            ? { ...sc, name: editContactForm.name.trim(), email: editContactForm.email.trim(), phone: editContactForm.phone.trim() }
            : sc
        ));
        // Atualizar também nos responsibleCollaborators se estiver selecionado
        setFreightData(prev => ({
          ...prev,
          responsibleCollaborators: prev.responsibleCollaborators.map(c =>
            c.id === editingSavedContact.id
              ? { ...c, name: editContactForm.name.trim(), email: editContactForm.email.trim(), phone: editContactForm.phone.trim() }
              : c
          )
        }));
        toast.success('Contato atualizado');
        setEditingSavedContact(null);
      } else {
        toast.error('Erro ao atualizar contato');
      }
    } catch (error) {
      console.error('Erro ao atualizar contato salvo:', error);
      toast.error('Erro ao atualizar contato');
    } finally {
      setSavingEditContact(false);
    }
  };

  const handleDeleteSavedContact = async (contact: any) => {
    if (!contact.savedContactId) return;
    setDeletingContactId(contact.savedContactId);
    try {
      const result = await savedContactRepository.deactivate(contact.savedContactId);
      if (result.success) {
        // Remover da lista local
        setSavedContacts(prev => prev.filter(sc => sc.savedContactId !== contact.savedContactId));
        // Remover dos responsibleCollaborators se estiver selecionado
        setFreightData(prev => ({
          ...prev,
          responsibleCollaborators: prev.responsibleCollaborators.filter(c => c.id !== contact.id)
        }));
        toast.success('Contato excluído');
      } else {
        toast.error('Erro ao excluir contato');
      }
    } catch (error) {
      console.error('Erro ao excluir contato salvo:', error);
      toast.error('Erro ao excluir contato');
    } finally {
      setDeletingContactId(null);
    }
  };

  if (!canCreateFreight) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-card">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-6 bg-yellow-50 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-yellow-500" />
            </div>
            <h3 className="mb-4">Acesso Restrito</h3>
            <p className="text-muted-foreground mb-6">
              Caminhoneiros não podem publicar fretes. Esta funcionalidade está disponível apenas para embarcadores e transportadoras.
            </p>
            <Button onClick={onComplete} variant="outline" className="w-full">
              Voltar ao Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const updateFreightData = (field: keyof FreightData, value: any) => {
    setFreightData(prev => ({ ...prev, [field]: value }));
  };

  // Funções para manipular colaboradores
  const handleAddManualContact = async () => {
    if (!manualContact.name.trim()) {
      toast.error('Preencha o nome do contato');
      return;
    }
    if (!manualContact.phone.trim()) {
      toast.error('Preencha o telefone do contato');
      return;
    }

    if (freightData.responsibleCollaborators.length >= 3) {
      toast.error('Você pode adicionar no máximo 3 contatos responsáveis');
      return;
    }

    // Salvar no company_saved_contacts para reutilização futura
    let savedId: string | null = null;
    if (companyId) {
      try {
        const result = await savedContactRepository.getOrCreate({
          company_id: companyId,
          name: manualContact.name.trim(),
          email: manualContact.email.trim() || null,
          phone: manualContact.phone.trim(),
          created_by: user.id,
        });
        if (result.success && result.data) {
          savedId = result.data.id;
          // Atualizar lista de contatos salvos se é novo
          const alreadyInList = savedContacts.some(sc => sc.savedContactId === savedId);
          if (!alreadyInList) {
            setSavedContacts(prev => [...prev, {
              id: `saved_${savedId}`,
              savedContactId: savedId,
              name: manualContact.name.trim(),
              email: manualContact.email.trim(),
              phone: manualContact.phone.trim(),
              isMainContact: false,
              source: 'saved_contact' as const
            }]);
          }
        }
      } catch (e) {
      }
    }

    const contact = {
      id: savedId ? `saved_${savedId}` : `manual_${Date.now()}`,
      savedContactId: savedId || undefined,
      name: manualContact.name.trim(),
      email: manualContact.email.trim(),
      phone: manualContact.phone.trim(),
      isMainContact: freightData.responsibleCollaborators.length === 0,
      source: (savedId ? 'saved_contact' : 'manual') as 'saved_contact' | 'manual'
    };

    setFreightData(prev => ({
      ...prev,
      responsibleCollaborators: [...prev.responsibleCollaborators, contact]
    }));

    setManualContact({ name: '', email: '', phone: '' });
    setIsContactDialogOpen(false);
    toast.success('Contato adicionado com sucesso');
  };

  const handleToggleCollaborator = (collaboratorId: string) => {
    setFreightData(prev => {
      const collaborators = prev.responsibleCollaborators;
      const isSelected = collaborators.some(c => c.id === collaboratorId);
      
      if (isSelected) {
        return {
          ...prev,
          responsibleCollaborators: collaborators.filter(c => c.id !== collaboratorId)
        };
      } else {
        if (collaborators.length >= 3) {
          toast.error('Você pode adicionar no máximo 3 contatos responsáveis');
          return prev;
        }
        const allCollaborators = [...realCollaborators, ...collaborators];
        const collaborator = allCollaborators.find(c => c.id === collaboratorId);
        if (collaborator) {
          return {
            ...prev,
            responsibleCollaborators: [...collaborators, collaborator]
          };
        }
      }
      return prev;
    });
  };

  const handleSetMainContact = (collaboratorId: string) => {
    setFreightData(prev => ({
      ...prev,
      responsibleCollaborators: prev.responsibleCollaborators.map(c => ({
        ...c,
        isMainContact: c.id === collaboratorId
      }))
    }));
    toast.success('Contato principal alterado');
  };

  const handleSubmit = async () => {
    try {
      // ✅ ANTT 2026 — Removido bloqueio de publicação por valor abaixo do piso minimo.
      // O usuário pode prosseguir mesmo abaixo do piso, mas com avisos/recomendações.
      if (advancePaymentBelowMinimum) {
        toast.error('Para operações com Transportador Autônomo (TAC), o adiantamento mínimo obrigatório é de 70% do valor do frete.');
        return;
      }

      // Determinar tipo de veículo baseado nas seleções
      const allVehicles = [
        ...freightData.selectedLightVehicles,
        ...freightData.selectedMediumVehicles,
        ...freightData.selectedHeavyVehicles
      ];
      
      const allTrailers = [
        ...freightData.selectedClosedTrailers,
        ...freightData.selectedOpenTrailers,
        ...freightData.selectedSpecialTrailers
      ];
      
      // Pegar primeiro veículo/carreta selecionado como principal
      const truckType = allVehicles[0] || allTrailers[0] || 'Não especificado';
      const category = allTrailers[0] || 'Carga Geral';
      
      
      // Determinar nível de exposição baseado no tipo de frete
      const exposureLevel = 
        freightData.freightType === 'highlight' ? 'Alta exposição' :
        freightData.freightType === 'plus' ? 'Média exposição' :
        'Baixa exposição';
      
      
      const freightPayload = {
        customerId: resolvedOwnerId,
        customerName: resolvedOwnerName,
        type: freightData.freightType === 'highlight' ? 'plus' : 'regular',
        exposureLevel: exposureLevel as any,
        origin: {
          city: freightData.originCity,
          state: freightData.originState,
          contactName: freightData.originContactName,
          contactPhone: freightData.originContactPhone,
        },
        destination: {
          city: freightData.destinationCity,
          state: freightData.destinationState,
          contactName: freightData.destinationContactName,
          contactPhone: freightData.destinationContactPhone,
        },
        cargo: freightData.product,
        cargoType: freightData.cargoType || 'Não informado',
        weight: freightData.totalWeight,
        truckType,
        category,
        status: 'active',
        price: freightData.freightValueType === 'known' 
          ? `R$ ${freightData.freightValue}` 
          : 'A combinar',
        observations: freightData.observations,
        
        // Campos adicionais completos
        product: freightData.product,
        species: freightData.species,
        occupancyType: freightData.occupancyType,
        volumes: freightData.volumes,
        volumeUnit: freightData.volumeUnit,
        needsCover: freightData.needsCover,
        needsTracker: freightData.needsTracker,
        isInsured: freightData.isInsured,
        pickupDate: freightData.scheduledDate || '', // ✅ Data de coleta
        deliveryDate: freightData.deliveryDate || '', // ✅ Data de entrega
        cubicWeight: freightData.cubicWeight,
        totalCubicMeters: freightData.totalCubicMeters,
        length: freightData.length,
        width: freightData.width,
        height: freightData.height,
        selectedLightVehicles: freightData.selectedLightVehicles,
        selectedMediumVehicles: freightData.selectedMediumVehicles,
        selectedHeavyVehicles: freightData.selectedHeavyVehicles,
        selectedClosedTrailers: freightData.selectedClosedTrailers,
        selectedOpenTrailers: freightData.selectedOpenTrailers,
        selectedSpecialTrailers: freightData.selectedSpecialTrailers,
        freightValueType: freightData.freightValueType,
        valueCalculation: freightData.valueCalculation,
        paymentIncluded: freightData.tollPayment,
        paymentMethod: freightData.paymentMethod,
        advancePayment: freightData.advancePayment,
        urgencyType: freightData.urgencyType,
        scheduledDate: freightData.scheduledDate,
        responsibleContacts: freightData.responsibleCollaborators.map(c => ({
          id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          isMainContact: c.isMainContact,
          source: c.source,
        })),
        hasAdditionalCargo: !!freightData.additionalCargoDetails,
        additionalCargoDetails: freightData.additionalCargoDetails,

        // ✅ ANTT 2026
        operationType: freightData.operationType,
        loadClassification: freightData.occupancyType === 'completa' ? 'lotacao' : 'fracionada',
        pisoMinimoValor: pisoMinimo?.valor,
        abaixoDoPiso: isBelowPisoMinimo,
        ciotStatus: isBelowPisoMinimo ? 'blocked_below_piso' : 'manual_pending',
        valePedagioStatus: freightData.valePedagioProvider === 'pending_integration' ? 'pending' : 'registered',
        paymentAccountType: freightData.paymentAccountType,
        advancePaymentPercent: advancePaymentNumber || undefined,
        distanceKm: freightData.distanceKm ? parseFloat(freightData.distanceKm) : undefined,
      };


      let result;
      if (isEditing && freightId) {
        // Atualizar frete existente
        result = await database.freights.update(freightId, freightPayload);
      } else {
        // Criar novo frete
        result = await database.freights.create(freightPayload);
      }
      
      
      if (result.success) {
        // Salvar contatos responsáveis na tabela freight_responsible_contacts
        const createdFreightId = result.data?.id || freightId;

        // ✅ ANTT 2026 — abre o registro de CIOT do frete (gate obrigatório antes do início da viagem).
        // Sem integração automática contratada, o CIOT fica "manual_pending" até alguém inserir o
        // número obtido fora da plataforma (ver Central de Conformidade do frete).
        if (createdFreightId) {
          try {
            await ciotRepository.createOrUpdate({
              freightId: createdFreightId,
              status: isBelowPisoMinimo ? 'blocked_below_piso' : 'manual_pending',
              provider: 'pending_integration',
              operationType: freightData.operationType,
              valorOperacao: freightValueNumber || null,
              pisoMinimoAplicavel: pisoMinimo?.valor ?? null,
              blockedReason: isBelowPisoMinimo ? 'Valor do frete abaixo do piso mínimo ANTT calculado para a rota/carga.' : null,
              generatedBy: user.id,
            });
          } catch (ciotError) {
            console.error('⚠️ Erro ao registrar operação de CIOT:', ciotError);
          }
        }

        if (createdFreightId && freightData.responsibleCollaborators.length > 0) {
          try {
            await freightContactRepository.setForFreight(
              createdFreightId,
              freightData.responsibleCollaborators.map(c => ({
                name: c.name,
                email: c.email || null,
                phone: c.phone,
                isMainContact: c.isMainContact,
                source: (c as any).source === 'saved_contact' ? 'saved_contact' as const
                  : (c as any).source === 'collaborator' ? 'collaborator' as const
                  : 'manual' as const,
                sourceId: (c as any).savedContactId || (c.source === 'collaborator' ? c.id : null),
              }))
            );
          } catch (contactError) {
            console.error('⚠️ Erro ao salvar contatos responsáveis:', contactError);
            // Não falhar a criação do frete por isso
          }
        }
        
        toast.success(isEditing ? 'Frete atualizado com sucesso!' : 'Frete publicado com sucesso!');
        
        // 📝 Registrar ação no activity_logs (com contexto de colaborador se aplicável)
        logUserAction(user, {
          action: isEditing ? 'freight_updated' : 'freight_created',
          entityType: 'freight',
          entityId: createdFreightId || undefined,
          description: `${isEditing ? 'Atualizou' : 'Publicou'} frete: ${freightData.originCity}/${freightData.originState} → ${freightData.destinationCity}/${freightData.destinationState}`,
          category: 'freight',
          extraMetadata: {
            origin: `${freightData.originCity}/${freightData.originState}`,
            destination: `${freightData.destinationCity}/${freightData.destinationState}`,
            cargo: freightData.product,
          }
        });
        
        // Criar notificação para o dono da empresa (ou o próprio usuário)
        await database.notifications.create({
          userId: resolvedOwnerId,
          type: 'freight',
          title: isEditing ? 'Frete atualizado' : 'Frete publicado',
          message: `Seu frete de ${freightData.originCity} para ${freightData.destinationCity} foi ${isEditing ? 'atualizado' : 'publicado'} com sucesso!`,
          read: false,
        });
        
        
        onComplete?.();
      } else {
        console.error(`❌ Erro ao ${isEditing ? 'atualizar' : 'criar'} frete:`, result.error);
        toast.error(result.error || `Erro ao ${isEditing ? 'atualizar' : 'publicar'} frete`);
      }
    } catch (error) {
      console.error(`❌ Error ${isEditing ? 'updating' : 'creating'} freight:`, error);
      toast.error(`Erro ao ${isEditing ? 'atualizar' : 'publicar'} frete`);
    }
  };

  const handleSchedule = async () => {
    try {

      // Validar data de agendamento
      if (!freightData.scheduledDate) {
        toast.error('Por favor, selecione uma data de agendamento');
        return;
      }

      // ✅ ANTT 2026 — Removido bloqueio de agendamento por valor abaixo do piso minimo.
      if (advancePaymentBelowMinimum) {
        toast.error('Para operações com Transportador Autônomo (TAC), o adiantamento mínimo obrigatório é de 70% do valor do frete.');
        return;
      }

      // Determinar tipo de veículo baseado nas seleções
      const allVehicles = [
        ...freightData.selectedLightVehicles,
        ...freightData.selectedMediumVehicles,
        ...freightData.selectedHeavyVehicles
      ];
      
      const allTrailers = [
        ...freightData.selectedClosedTrailers,
        ...freightData.selectedOpenTrailers,
        ...freightData.selectedSpecialTrailers
      ];
      
      const truckType = allVehicles[0] || allTrailers[0] || 'Não especificado';
      const category = allTrailers[0] || 'Carga Geral';
      
      const exposureLevel = 
        freightData.freightType === 'highlight' ? 'Alta exposição' :
        freightData.freightType === 'plus' ? 'Média exposição' :
        'Baixa exposição';
      
      const freightPayload = {
        customerId: resolvedOwnerId,
        customerName: resolvedOwnerName,
        type: freightData.freightType === 'highlight' ? 'plus' : 'regular',
        exposureLevel: exposureLevel as any,
        origin: {
          city: freightData.originCity,
          state: freightData.originState,
          contactName: freightData.originContactName,
          contactPhone: freightData.originContactPhone,
        },
        destination: {
          city: freightData.destinationCity,
          state: freightData.destinationState,
          contactName: freightData.destinationContactName,
          contactPhone: freightData.destinationContactPhone,
        },
        cargo: freightData.product,
        cargoType: freightData.cargoType || 'Não informado',
        weight: freightData.totalWeight,
        truckType,
        category,
        status: 'scheduled',
        price: freightData.freightValueType === 'known' 
          ? `R$ ${freightData.freightValue}` 
          : 'A combinar',
        observations: freightData.observations,
        product: freightData.product,
        species: freightData.species,
        occupancyType: freightData.occupancyType,
        volumes: freightData.volumes,
        volumeUnit: freightData.volumeUnit,
        needsCover: freightData.needsCover,
        needsTracker: freightData.needsTracker,
        isInsured: freightData.isInsured,
        pickupDate: freightData.scheduledDate, // ✅ CORRIGIDO: usar scheduledDate como pickupDate
        deliveryDate: freightData.deliveryDate,
        cubicWeight: freightData.cubicWeight,
        totalCubicMeters: freightData.totalCubicMeters,
        length: freightData.length,
        width: freightData.width,
        height: freightData.height,
        selectedLightVehicles: freightData.selectedLightVehicles,
        selectedMediumVehicles: freightData.selectedMediumVehicles,
        selectedHeavyVehicles: freightData.selectedHeavyVehicles,
        selectedClosedTrailers: freightData.selectedClosedTrailers,
        selectedOpenTrailers: freightData.selectedOpenTrailers,
        selectedSpecialTrailers: freightData.selectedSpecialTrailers,
        freightValueType: freightData.freightValueType,
        valueCalculation: freightData.valueCalculation,
        paymentIncluded: freightData.tollPayment,
        paymentMethod: freightData.paymentMethod,
        advancePayment: freightData.advancePayment,
        urgencyType: 'scheduled',
        scheduledDate: freightData.scheduledDate,
        responsibleContacts: freightData.responsibleCollaborators.map(c => ({
          id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          isMainContact: c.isMainContact,
          source: c.source,
        })),
        hasAdditionalCargo: !!freightData.additionalCargoDetails,
        additionalCargoDetails: freightData.additionalCargoDetails,

        // ✅ ANTT 2026
        operationType: freightData.operationType,
        loadClassification: freightData.occupancyType === 'completa' ? 'lotacao' : 'fracionada',
        pisoMinimoValor: pisoMinimo?.valor,
        abaixoDoPiso: isBelowPisoMinimo,
        ciotStatus: isBelowPisoMinimo ? 'blocked_below_piso' : 'manual_pending',
        valePedagioStatus: freightData.valePedagioProvider === 'pending_integration' ? 'pending' : 'registered',
        paymentAccountType: freightData.paymentAccountType,
        advancePaymentPercent: advancePaymentNumber || undefined,
        distanceKm: freightData.distanceKm ? parseFloat(freightData.distanceKm) : undefined,
      };

      const result = await database.freights.create(freightPayload);

      if (result.success) {
        // Salvar contatos responsáveis na tabela freight_responsible_contacts
        const scheduledFreightId = result.data?.id;

        if (scheduledFreightId) {
          try {
            await ciotRepository.createOrUpdate({
              freightId: scheduledFreightId,
              status: isBelowPisoMinimo ? 'blocked_below_piso' : 'manual_pending',
              provider: 'pending_integration',
              operationType: freightData.operationType,
              valorOperacao: freightValueNumber || null,
              pisoMinimoAplicavel: pisoMinimo?.valor ?? null,
              blockedReason: isBelowPisoMinimo ? 'Valor do frete abaixo do piso mínimo ANTT calculado para a rota/carga.' : null,
              generatedBy: user.id,
            });
          } catch (ciotError) {
            console.error('⚠️ Erro ao registrar operação de CIOT:', ciotError);
          }
        }

        if (scheduledFreightId && freightData.responsibleCollaborators.length > 0) {
          try {
            await freightContactRepository.setForFreight(
              scheduledFreightId,
              freightData.responsibleCollaborators.map(c => ({
                name: c.name,
                email: c.email || null,
                phone: c.phone,
                isMainContact: c.isMainContact,
                source: (c as any).source === 'saved_contact' ? 'saved_contact' as const
                  : (c as any).source === 'collaborator' ? 'collaborator' as const
                  : 'manual' as const,
                sourceId: (c as any).savedContactId || (c.source === 'collaborator' ? c.id : null),
              }))
            );
          } catch (contactError) {
            console.error('⚠️ Erro ao salvar contatos responsáveis (agendado):', contactError);
          }
        }
        
        toast.success('Frete agendado com sucesso!');
        
        await database.notifications.create({
          userId: resolvedOwnerId,
          type: 'freight',
          title: 'Frete agendado',
          message: `Seu frete de ${freightData.originCity} para ${freightData.destinationCity} foi agendado para ${new Date(freightData.scheduledDate).toLocaleDateString('pt-BR')}!`,
          read: false,
        });
        
        onComplete?.();
      } else {
        toast.error(result.error || 'Erro ao agendar frete');
      }
    } catch (error) {
      console.error('❌ Error scheduling freight:', error);
      toast.error('Erro ao agendar frete');
    }
  };

  // Definições de veículos por categoria
  const lightVehicles = [
    'Todos os leves',
    '3/4',
    'Fiorino',
    'Toco',
    'VLC'
  ];

  const mediumVehicles = [
    'Todos os médios',
    'Bitruck',
    'Truck'
  ];

  const heavyVehicles = [
    'Todos os pesados',
    'Bitrem',
    'Carreta',
    'Carreta LS',
    'Rodotrem',
    'Vanderléia'
  ];

  // Definições de carretas por categoria
  const closedTrailers = [
    'Baú',
    'Baú Frigorífico',
    'Baú Refrigerado',
    'Sider'
  ];

  const openTrailers = [
    'Caçamba',
    'Grade Baixa',
    'Graneleiro',
    'Plataforma',
    'Prancha'
  ];

  const specialTrailers = [
    'Apenas Cavalo',
    'Bug Porta Container',
    'Cavaqueira',
    'Cegonheiro',
    'Gaiola',
    'Hopper',
    'Munck',
    'Silo',
    'Tanque'
  ];

  const volumeUnits = [
    'Por toneladas',
    'Por quilos'
  ];

  const speciesOptions = [
    'Animais',
    'Big Bag',
    'Bobina',
    'Caixas',
    'Container',
    'Diversos',
    'Fardos',
    'Fracionada',
    'Granel',
    'Metro Cubico',
    'Milheiro',
    'Mudança',
    'Paletes',
    'Passageiro',
    'Sacos',
    'Tambor',
    'Unidades'
  ];

  const cargoTypeOptions = [
    'Carga Geral',
    'Granel sólido',
    'Granel líquido',
    'Granel pressurizada',
    'Conteiner',
    'Frigorificada ou Aquecida',
    'Neogranel',
    'Perigosa (Carga Geral)',
    'Perigosa (Granel sólido)',
    'Perigosa (Granel liquido)',
    'Perigosa (Container)',
    'Perigosa (Frigorificada ou Aquecida)'
  ];

  const valueCalculationOptions = [
    'Por toneladas',
    'Por quilos',
    'Total'
  ];

  const paymentMethodOptions = [
    'À Vista',
    'Cartão de Crédito',
    'Cartão de Débito',
    'PIX',
    'Boleto Bancário',
    'Transferência',
    'Dinheiro'
  ];

  const getAllSelectedVehicles = () => {
    return [
      ...freightData.selectedLightVehicles,
      ...freightData.selectedMediumVehicles,
      ...freightData.selectedHeavyVehicles
    ];
  };

  const getAllSelectedTrailers = () => {
    return [
      ...freightData.selectedClosedTrailers,
      ...freightData.selectedOpenTrailers,
      ...freightData.selectedSpecialTrailers
    ];
  };

  const handleVehicleSelection = (vehicle: string, category: 'light' | 'medium' | 'heavy') => {
    const fieldMap = {
      light: 'selectedLightVehicles',
      medium: 'selectedMediumVehicles',
      heavy: 'selectedHeavyVehicles'
    };
    
    const field = fieldMap[category] as keyof FreightData;
    const currentSelection = freightData[field] as string[];
    
    if (currentSelection.includes(vehicle)) {
      updateFreightData(field, currentSelection.filter(v => v !== vehicle));
    } else {
      updateFreightData(field, [...currentSelection, vehicle]);
    }
  };

  const handleTrailerSelection = (trailer: string, category: 'closed' | 'open' | 'special') => {
    const fieldMap = {
      closed: 'selectedClosedTrailers',
      open: 'selectedOpenTrailers',
      special: 'selectedSpecialTrailers'
    };
    
    const field = fieldMap[category] as keyof FreightData;
    const currentSelection = freightData[field] as string[];
    
    if (currentSelection.includes(trailer)) {
      updateFreightData(field, currentSelection.filter(t => t !== trailer));
    } else {
      updateFreightData(field, [...currentSelection, trailer]);
    }
  };

  // Estilo customizado para checkboxes "sem cor interna" (outline style)
  const checkboxStyle = "bg-transparent border-gray-300 data-[state=checked]:bg-transparent data-[state=checked]:text-primary data-[state=checked]:border-primary";

  const renderAllContent = () => {
    // Construir valores para os autocompletes
    const originCityLabel = freightData.originCity && freightData.originState 
      ? `${freightData.originCity} - ${freightData.originState}` 
      : '';
    const destinationCityLabel = freightData.destinationCity && freightData.destinationState 
      ? `${freightData.destinationCity} - ${freightData.destinationState}` 
      : '';

    return (
      <div className="space-y-6">
            {/* Origem e Destino - Unificado */}
            <div className="bg-white border border-[#e5e7eb] rounded-lg">
              <div className="border-b border-[#e5e7eb] px-6 py-4">
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-[#253663]" />
                  <div>
                    <h2 className="text-base font-medium text-[#111827]">Origem e Destino</h2>
                    <p className="text-sm text-[#6b7280] mt-0.5">
                      {isEditing
                        ? 'Origem, destino e datas não podem ser alterados após a publicação'
                        : 'Informe os dados de coleta e entrega da mercadoria'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-6">
                {/* Cidades de Coleta e Entrega */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <CityAutocomplete
                    label="Cidade de coleta"
                    value={originCityLabel}
                    onValueChange={(city, stateCode) => {
                      updateFreightData('originCity', city);
                      updateFreightData('originState', stateCode);
                    }}
                    placeholder="Digite o nome da cidade"
                    disabled={isEditing}
                  />

                  <div className="space-y-2">
                    <Label>Data de coleta (opcional)</Label>
                    <Input
                      type="date"
                      value={freightData.scheduledDate}
                      onChange={(e) => updateFreightData('scheduledDate', e.target.value)}
                      className="bg-input-background border-input-border"
                      placeholder="DD/MM/AAAA"
                      min={new Date().toISOString().split('T')[0]}
                      disabled={isEditing}
                    />
                    {!isEditing && (
                      <p className="text-xs text-muted-foreground">
                        Necessário para agendar o frete
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <CityAutocomplete
                    label="Cidade de entrega"
                    value={destinationCityLabel}
                    onValueChange={(city, stateCode) => {
                      updateFreightData('destinationCity', city);
                      updateFreightData('destinationState', stateCode);
                    }}
                    placeholder="Digite o nome da cidade"
                    disabled={isEditing}
                  />

                  <div className="space-y-2">
                    <Label>Data de entrega (opcional)</Label>
                    <Input
                      type="date"
                      value={freightData.deliveryDate}
                      onChange={(e) => updateFreightData('deliveryDate', e.target.value)}
                      className="bg-input-background border-input-border"
                      placeholder="DD/MM/AAAA"
                      disabled={isEditing}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Responsável pelo frete */}
            <div className="bg-white border border-[#e5e7eb] rounded-lg">
              <div className="border-b border-[#e5e7eb] px-6 py-4">
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-[#253663]" />
                  <div>
                    <h2 className="text-base font-medium text-[#111827]">Responsável pelo frete</h2>
                    <p className="text-sm text-[#6b7280] mt-0.5">
                      Pessoa que receberá ligações, mensagens e propostas sobre este frete.
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-6">
                {/* Alerta se nenhum contato selecionado */}
                {freightData.responsibleCollaborators.length === 0 && (
                  <div className="flex items-center gap-3 p-4 bg-[#fafafa] border border-[#e5e7eb] rounded-lg">
                    <div className="flex-shrink-0 w-10 h-10 bg-[#253663]/10 rounded-full flex items-center justify-center">
                      <Info className="w-5 h-5 text-[#253663]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[#111827]">Adicione um contato responsável</p>
                      <p className="text-xs text-[#6b7280] mt-0.5">
                        Selecione um colaborador da empresa ou adicione os dados de contato manualmente.
                      </p>
                    </div>
                  </div>
                )}

                {/* Alerta de contato principal */}
                {freightData.responsibleCollaborators.length > 1 && !freightData.responsibleCollaborators.some(c => c.isMainContact) && (
                  <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <p className="text-xs text-amber-700">
                      Clique na estrela ★ para definir o contato principal.
                    </p>
                  </div>
                )}

                {/* Colaboradores da empresa */}
                {loadingCollaborators ? (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    Carregando colaboradores da empresa...
                  </div>
                ) : realCollaborators.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-[#374151]">Colaboradores da empresa</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {realCollaborators.slice(0, 6).map((collaborator) => {
                        const isSelected = freightData.responsibleCollaborators.some(c => c.id === collaborator.id);
                        const isMain = freightData.responsibleCollaborators.find(c => c.id === collaborator.id)?.isMainContact;
                        
                        return (
                          <div
                            key={collaborator.id}
                            className={`relative p-4 border-2 rounded-lg cursor-pointer transition-all ${
                              isSelected 
                                ? 'border-[#253663] bg-[#f8f9ff]' 
                                : 'border-[#e5e7eb] bg-white hover:border-[#d1d5db]'
                            }`}
                            onClick={() => handleToggleCollaborator(collaborator.id)}
                          >
                            <div className="flex items-start gap-3">
                              <Checkbox
                                checked={isSelected}
                                className={`mt-1 ${checkboxStyle}`}
                                onCheckedChange={() => handleToggleCollaborator(collaborator.id)}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-[#111827] truncate">{collaborator.name}</p>
                                <p className="text-xs text-[#6b7280] mt-0.5">{collaborator.email}</p>
                                <p className="text-xs text-[#6b7280]">{collaborator.phone}</p>
                              </div>
                              {isSelected && freightData.responsibleCollaborators.length > 1 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSetMainContact(collaborator.id);
                                  }}
                                  className={`flex-shrink-0 p-1 rounded transition-colors ${
                                    isMain ? 'text-[#ea742a]' : 'text-[#9ca3af] hover:text-[#ea742a]'
                                  }`}
                                  title={isMain ? 'Contato principal' : 'Definir como contato principal'}
                                >
                                  <Star className={`w-4 h-4 ${isMain ? 'fill-current' : ''}`} />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Contatos salvos da empresa */}
                {!loadingCollaborators && savedContacts.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-[#374151]">Contatos salvos</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {savedContacts
                        .filter(sc => !realCollaborators.some(rc => rc.phone === sc.phone))
                        .slice(0, 6)
                        .map((contact) => {
                        const isSelected = freightData.responsibleCollaborators.some(c => c.id === contact.id);
                        const isMain = freightData.responsibleCollaborators.find(c => c.id === contact.id)?.isMainContact;
                        
                        return (
                          <div
                            key={contact.id}
                            className={`relative p-4 border-2 rounded-lg cursor-pointer transition-all ${
                              isSelected 
                                ? 'border-[#253663] bg-[#f8f9ff]' 
                                : 'border-[#e5e7eb] bg-white hover:border-[#d1d5db]'
                            }`}
                            onClick={() => {
                              if (isSelected) {
                                setFreightData(prev => ({
                                  ...prev,
                                  responsibleCollaborators: prev.responsibleCollaborators.filter(c => c.id !== contact.id)
                                }));
                              } else {
                                if (freightData.responsibleCollaborators.length >= 3) {
                                  toast.error('Máximo de 3 contatos');
                                  return;
                                }
                                setFreightData(prev => ({
                                  ...prev,
                                  responsibleCollaborators: [...prev.responsibleCollaborators, {
                                    ...contact,
                                    isMainContact: prev.responsibleCollaborators.length === 0,
                                  }]
                                }));
                              }
                            }}
                          >
                            {/* Botões editar/excluir */}
                            <div className="absolute top-2 right-2 flex items-center gap-1">
                              {isSelected && freightData.responsibleCollaborators.length > 1 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSetMainContact(contact.id);
                                  }}
                                  className={`p-1 rounded transition-colors ${
                                    isMain ? 'text-[#ea742a]' : 'text-[#9ca3af] hover:text-[#ea742a]'
                                  }`}
                                  title={isMain ? 'Contato principal' : 'Definir como contato principal'}
                                >
                                  <Star className={`w-3.5 h-3.5 ${isMain ? 'fill-current' : ''}`} />
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditSavedContact(contact);
                                }}
                                className="p-1 rounded text-[#9ca3af] hover:text-[#253663] hover:bg-[#f3f4f6] transition-colors"
                                title="Editar contato"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (window.confirm(`Excluir o contato "${contact.name}"?`)) {
                                    handleDeleteSavedContact(contact);
                                  }
                                }}
                                disabled={deletingContactId === contact.savedContactId}
                                className="p-1 rounded text-[#9ca3af] hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                                title="Excluir contato"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="flex items-start gap-3 pr-16">
                              <Checkbox
                                checked={isSelected}
                                className={`mt-1 ${checkboxStyle}`}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-[#111827] truncate">{contact.name}</p>
                                {contact.email && <p className="text-xs text-[#6b7280] mt-0.5">{contact.email}</p>}
                                <p className="text-xs text-[#6b7280]">{contact.phone}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Modal de edição de contato salvo */}
                <Dialog open={!!editingSavedContact} onOpenChange={(open) => { if (!open) setEditingSavedContact(null); }}>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Editar contato</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <Label htmlFor="edit-contact-name">Nome *</Label>
                        <Input
                          id="edit-contact-name"
                          value={editContactForm.name}
                          onChange={(e) => setEditContactForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Nome do contato"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-contact-phone">Telefone *</Label>
                        <Input
                          id="edit-contact-phone"
                          value={editContactForm.phone}
                          onChange={(e) => setEditContactForm(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="(00) 00000-0000"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-contact-email">E-mail (opcional)</Label>
                        <Input
                          id="edit-contact-email"
                          type="email"
                          value={editContactForm.email}
                          onChange={(e) => setEditContactForm(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="email@exemplo.com"
                        />
                      </div>
                      <div className="flex gap-3 pt-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => setEditingSavedContact(null)}
                          disabled={savingEditContact}
                        >
                          Cancelar
                        </Button>
                        <Button
                          className="flex-1 bg-[#253663] hover:bg-[#1e2d52] text-white"
                          onClick={handleSaveEditContact}
                          disabled={savingEditContact || !editContactForm.name.trim() || !editContactForm.phone.trim()}
                        >
                          {savingEditContact ? 'Salvando...' : 'Salvar'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Contatos manuais já adicionados (que não são saved_contacts) */}
                {freightData.responsibleCollaborators.filter(c => c.source === 'manual').length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-[#374151]">Contatos adicionados manualmente</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {freightData.responsibleCollaborators.filter(c => c.source === 'manual').map((contact) => {
                        const isMain = contact.isMainContact;
                        return (
                          <div
                            key={contact.id}
                            className="relative p-4 border-2 border-[#253663] bg-[#f8f9ff] rounded-lg"
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-[#111827] truncate">{contact.name}</p>
                                {contact.email && <p className="text-xs text-[#6b7280] mt-0.5">{contact.email}</p>}
                                <p className="text-xs text-[#6b7280]">{contact.phone}</p>
                              </div>
                              <div className="flex items-center gap-1">
                                {freightData.responsibleCollaborators.length > 1 && (
                                  <button
                                    onClick={() => handleSetMainContact(contact.id)}
                                    className={`flex-shrink-0 p-1 rounded transition-colors ${
                                      isMain ? 'text-[#ea742a]' : 'text-[#9ca3af] hover:text-[#ea742a]'
                                    }`}
                                    title={isMain ? 'Contato principal' : 'Definir como contato principal'}
                                  >
                                    <Star className={`w-4 h-4 ${isMain ? 'fill-current' : ''}`} />
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    setFreightData(prev => ({
                                      ...prev,
                                      responsibleCollaborators: prev.responsibleCollaborators.filter(c => c.id !== contact.id)
                                    }));
                                    toast.success('Contato removido');
                                  }}
                                  className="flex-shrink-0 p-1 rounded text-[#9ca3af] hover:text-red-500 transition-colors"
                                  title="Remover contato"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Botão adicionar contato manualmente */}
                {freightData.responsibleCollaborators.length < 3 && (
                  <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="border-2 border-dashed border-[#e5e7eb] hover:border-[#253663] bg-white hover:bg-[#fafafa] text-[#253663] hover:text-[#253663]"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar contato manualmente
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[420px]">
                      <DialogHeader>
                        <DialogTitle className="text-base">Adicionar contato responsável</DialogTitle>
                      </DialogHeader>
                      <p className="text-sm text-[#6b7280] -mt-2">
                        Informe os dados de quem receberá contato sobre este frete.
                      </p>
                      
                      <div className="space-y-3 py-2">
                        <div className="space-y-1.5">
                          <Label>Nome*</Label>
                          <Input
                            value={manualContact.name}
                            onChange={(e) => setManualContact({...manualContact, name: e.target.value})}
                            placeholder="Nome da pessoa responsável"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label>Telefone / WhatsApp*</Label>
                          <Input
                            value={manualContact.phone}
                            onChange={(e) => setManualContact({...manualContact, phone: e.target.value})}
                            placeholder="(11) 98765-4321"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label>E-mail <span className="text-[#9ca3af]">(opcional)</span></Label>
                          <Input
                            type="email"
                            value={manualContact.email}
                            onChange={(e) => setManualContact({...manualContact, email: e.target.value})}
                            placeholder="email@exemplo.com"
                          />
                        </div>

                        <div className="flex gap-2 pt-4">
                          <Button 
                            variant="outline" 
                            onClick={() => setIsContactDialogOpen(false)}
                            className="flex-1"
                          >
                            Cancelar
                          </Button>
                          <Button 
                            onClick={handleAddManualContact}
                            className="flex-1 bg-primary hover:bg-primary/90"
                          >
                            Adicionar
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}

                {/* Contador de contatos */}
                {freightData.responsibleCollaborators.length > 0 && (
                  <p className="text-xs text-[#9ca3af]">
                    {freightData.responsibleCollaborators.length}/3 contatos selecionados
                  </p>
                )}
              </div>
            </div>

            {/* Dados da carga */}
            <div className="bg-white border border-[#e5e7eb] rounded-lg">
              <div className="border-b border-[#e5e7eb] px-6 py-4">
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-[#253663]" />
                  <div>
                    <h2 className="text-base font-medium text-[#111827]">Dados da carga</h2>
                    <p className="text-sm text-[#6b7280] mt-0.5">
                      Quanto mais informações você fornecer, menos ligações desnecessárias você receberá.
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-6">
                {/* Produto */}
                <div className="space-y-2">
                  <Label>Produto</Label>
                  <Input
                    value={freightData.product}
                    onChange={(e) => updateFreightData('product', e.target.value)}
                    placeholder="Qual produto será transportado? (Ex: Milho, Soja...)"
                    className="bg-input-background border-input-border"
                  />
                </div>

                {/* Tipo de carga */}
                <div className="space-y-2">
                  <Label>Tipo de Carga</Label>
                  <Select value={freightData.cargoType} onValueChange={(value) => updateFreightData('cargoType', value)}>
                    <SelectTrigger className="bg-input-background border-input-border">
                      <SelectValue placeholder="Selecione o tipo de carga" />
                    </SelectTrigger>
                    <SelectContent>
                      {cargoTypeOptions.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Espécie e Peso total */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Espécie</Label>
                    <Select value={freightData.species} onValueChange={(value) => updateFreightData('species', value)}>
                      <SelectTrigger className="bg-input-background border-input-border">
                        <SelectValue placeholder="Selecione a espécie da carga" />
                      </SelectTrigger>
                      <SelectContent>
                        {speciesOptions.map((species) => (
                          <SelectItem key={species} value={species}>{species}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Peso total da carga</Label>
                    <Input
                      value={freightData.totalWeight}
                      onChange={(e) => updateFreightData('totalWeight', e.target.value)}
                      placeholder="Digite o peso total da carga"
                      type="number"
                      className="bg-input-background border-input-border"
                    />
                  </div>
                </div>

                {/* Volumes e Unidade de medida */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Volumes (opcional)</Label>
                    <Input
                      value={freightData.volumes}
                      onChange={(e) => updateFreightData('volumes', e.target.value)}
                      placeholder="Unidades"
                      type="number"
                      className="bg-input-background border-input-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Unidade de medida</Label>
                    <Select value={freightData.volumeUnit} onValueChange={(value) => updateFreightData('volumeUnit', value)}>
                      <SelectTrigger className="bg-input-background border-input-border">
                        <SelectValue placeholder="Selecionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {volumeUnits.map((unit) => (
                          <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Tipo do frete */}
                <div className="space-y-3">
                  <Label>Tipo do frete</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div 
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        freightData.occupancyType === 'completa' ? 'border-[#253663] bg-[#253663]/5 ring-1 ring-[#253663]' : 'border-[#e5e7eb] hover:bg-[#fafafa]'
                      }`}
                      onClick={() => updateFreightData('occupancyType', 'completa')}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          freightData.occupancyType === 'completa' ? 'border-[#253663]' : 'border-[#d1d5db]'
                        }`}>
                          {freightData.occupancyType === 'completa' && (
                            <div className="w-2 h-2 rounded-full bg-[#253663]"></div>
                          )}
                        </div>
                        <div>
                          <Label className="cursor-pointer font-medium text-[#111827]">Completa</Label>
                          <p className="text-xs text-[#6b7280]">Carga ocupa todo o veículo</p>
                        </div>
                      </div>
                    </div>
                    <div 
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        freightData.occupancyType === 'complemento' ? 'border-[#253663] bg-[#253663]/5 ring-1 ring-[#253663]' : 'border-[#e5e7eb] hover:bg-[#fafafa]'
                      }`}
                      onClick={() => updateFreightData('occupancyType', 'complemento')}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          freightData.occupancyType === 'complemento' ? 'border-[#253663]' : 'border-[#d1d5db]'
                        }`}>
                          {freightData.occupancyType === 'complemento' && (
                            <div className="w-2 h-2 rounded-full bg-[#253663]"></div>
                          )}
                        </div>
                        <div>
                          <Label className="cursor-pointer font-medium text-[#111827]">Complemento</Label>
                          <p className="text-xs text-[#6b7280]">Carga compartilha o veículo</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Perguntas específicas aprimoradas */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-[#111827] text-center block">Precisa de lona?</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        type="button"
                        className={`p-3 border rounded-lg cursor-pointer transition-all text-center ${
                          freightData.needsCover ? 'border-[#253663] bg-[#253663]/5 text-[#253663]' : 'border-[#e5e7eb] hover:bg-[#fafafa] text-[#6b7280]'
                        }`}
                        onClick={() => updateFreightData('needsCover', true)}
                      >
                        <span className="text-sm font-medium">Sim</span>
                      </button>
                      <button 
                        type="button"
                        className={`p-3 border rounded-lg cursor-pointer transition-all text-center ${
                          !freightData.needsCover ? 'border-[#253663] bg-[#253663]/5 text-[#253663]' : 'border-[#e5e7eb] hover:bg-[#fafafa] text-[#6b7280]'
                        }`}
                        onClick={() => updateFreightData('needsCover', false)}
                      >
                        <span className="text-sm font-medium">Não</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-[#111827] text-center block">Precisa de rastreador?</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        type="button"
                        className={`p-3 border rounded-lg cursor-pointer transition-all text-center ${
                          freightData.needsTracker ? 'border-[#253663] bg-[#253663]/5 text-[#253663]' : 'border-[#e5e7eb] hover:bg-[#fafafa] text-[#6b7280]'
                        }`}
                        onClick={() => updateFreightData('needsTracker', true)}
                      >
                        <span className="text-sm font-medium">Sim</span>
                      </button>
                      <button 
                        type="button"
                        className={`p-3 border rounded-lg cursor-pointer transition-all text-center ${
                          !freightData.needsTracker ? 'border-[#253663] bg-[#253663]/5 text-[#253663]' : 'border-[#e5e7eb] hover:bg-[#fafafa] text-[#6b7280]'
                        }`}
                        onClick={() => updateFreightData('needsTracker', false)}
                      >
                        <span className="text-sm font-medium">Não</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-[#111827] text-center block">Terá seguro?</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        type="button"
                        className={`p-3 border rounded-lg cursor-pointer transition-all text-center ${
                          freightData.isInsured ? 'border-[#253663] bg-[#253663]/5 text-[#253663]' : 'border-[#e5e7eb] hover:bg-[#fafafa] text-[#6b7280]'
                        }`}
                        onClick={() => updateFreightData('isInsured', true)}
                      >
                        <span className="text-sm font-medium">Sim</span>
                      </button>
                      <button 
                        type="button"
                        className={`p-3 border rounded-lg cursor-pointer transition-all text-center ${
                          !freightData.isInsured ? 'border-[#253663] bg-[#253663]/5 text-[#253663]' : 'border-[#e5e7eb] hover:bg-[#fafafa] text-[#6b7280]'
                        }`}
                        onClick={() => updateFreightData('isInsured', false)}
                      >
                        <span className="text-sm font-medium">Não</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mais detalhes da carga (opcional) */}
            <Collapsible>
              <div className="bg-white border border-[#e5e7eb] rounded-lg">
                <CollapsibleTrigger className="w-full">
                  <div className="border-b border-[#e5e7eb] px-6 py-4 hover:bg-[#fafafa] transition-colors cursor-pointer">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        <ChevronDown className="w-5 h-5 text-[#6b7280]" />
                        <div className="text-left">
                          <h2 className="text-base font-medium text-[#111827]">Mais detalhes da carga (opcional)</h2>
                          <p className="text-sm text-[#6b7280] mt-0.5">
                            Informações adicionais para melhor precisão
                          </p>
                        </div>
                      </div>
                      <ChevronDown className="w-5 h-5 text-[#6b7280]" />
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-6 pb-6 space-y-6">
                    {/* Peso Cubado e Metragem cúbica */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label>Peso Cubado</Label>
                        <Input
                          value={freightData.cubicWeight}
                          onChange={(e) => updateFreightData('cubicWeight', e.target.value)}
                          placeholder="Digite o peso cubado"
                          type="number"
                          className="bg-input-background border-input-border"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Metragem cúbica total (m³)</Label>
                        <Input
                          value={freightData.totalCubicMeters}
                          onChange={(e) => updateFreightData('totalCubicMeters', e.target.value)}
                          placeholder="Digite a m³ total"
                          type="number"
                          step="0.01"
                          className="bg-input-background border-input-border"
                        />
                      </div>
                    </div>

                    {/* Dimensões */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Comprimento</Label>
                        <Input
                          value={freightData.length}
                          onChange={(e) => updateFreightData('length', e.target.value)}
                          placeholder="Metros"
                          type="number"
                          step="0.01"
                          className="bg-input-background border-input-border"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Largura</Label>
                        <Input
                          value={freightData.width}
                          onChange={(e) => updateFreightData('width', e.target.value)}
                          placeholder="Metros"
                          type="number"
                          step="0.01"
                          className="bg-input-background border-input-border"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Altura</Label>
                        <Input
                          value={freightData.height}
                          onChange={(e) => updateFreightData('height', e.target.value)}
                          placeholder="Metros"
                          type="number"
                          step="0.01"
                          className="bg-input-background border-input-border"
                        />
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
            {/* Escolha de veículos */}
            <div className="bg-white border border-[#e5e7eb] rounded-lg">
              <div className="border-b border-[#e5e7eb] px-6 py-4">
                <div className="flex items-center gap-3">
                  <Truck className="w-5 h-5 text-[#253663]" />
                  <div className="flex-1">
                    <h2 className="text-base font-medium text-[#111827]">Escolha quantos veículos quiser</h2>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-8">
                {/* Veículos Leves */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-[#111827] uppercase tracking-wide">Leves</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    {lightVehicles.map((vehicle) => (
                      <div key={vehicle} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`light-${vehicle}`}
                          checked={freightData.selectedLightVehicles.includes(vehicle)}
                          onCheckedChange={() => handleVehicleSelection(vehicle, 'light')}
                          className={checkboxStyle}
                        />
                        <Label htmlFor={`light-${vehicle}`} className="text-sm cursor-pointer">
                          {vehicle}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Veículos Médios */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-[#111827] uppercase tracking-wide">Médios</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    {mediumVehicles.map((vehicle) => (
                      <div key={vehicle} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`medium-${vehicle}`}
                          checked={freightData.selectedMediumVehicles.includes(vehicle)}
                          onCheckedChange={() => handleVehicleSelection(vehicle, 'medium')}
                          className={checkboxStyle}
                        />
                        <Label htmlFor={`medium-${vehicle}`} className="text-sm cursor-pointer">
                          {vehicle}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Veículos Pesados */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-[#111827] uppercase tracking-wide">Pesados</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    {heavyVehicles.map((vehicle) => (
                      <div key={vehicle} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`heavy-${vehicle}`}
                          checked={freightData.selectedHeavyVehicles.includes(vehicle)}
                          onCheckedChange={() => handleVehicleSelection(vehicle, 'heavy')}
                          className={checkboxStyle}
                        />
                        <Label htmlFor={`heavy-${vehicle}`} className="text-sm cursor-pointer">
                          {vehicle}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Resumo de seleção */}
                {getAllSelectedVehicles().length > 0 && (
                  <div className="bg-[#f9fafb] border border-[#e5e7eb] p-4 rounded-lg">
                    <h5 className="text-sm font-medium text-[#111827] mb-2">Veículos Selecionados:</h5>
                    <div className="flex flex-wrap gap-2">
                      {getAllSelectedVehicles().map((vehicle) => (
                        <Badge key={vehicle} variant="secondary" className="text-xs">
                          {vehicle}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Escolha de carrocerias */}
            <div className="bg-white border border-[#e5e7eb] rounded-lg">
              <div className="border-b border-[#e5e7eb] px-6 py-4">
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-[#253663]" />
                  <div className="flex-1">
                    <h2 className="text-base font-medium text-[#111827]">Escolha quantas carrocerias quiser</h2>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-8">
                {/* Carroceria Fechada */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-[#111827] uppercase tracking-wide">Fechada</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {closedTrailers.map((trailer) => (
                      <div key={trailer} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`closed-${trailer}`}
                          checked={freightData.selectedClosedTrailers.includes(trailer)}
                          onCheckedChange={() => handleTrailerSelection(trailer, 'closed')}
                          className={checkboxStyle}
                        />
                        <Label htmlFor={`closed-${trailer}`} className="text-sm cursor-pointer">
                          {trailer}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Carroceria Aberta */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-[#111827] uppercase tracking-wide">Aberta</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {openTrailers.map((trailer) => (
                      <div key={trailer} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`open-${trailer}`}
                          checked={freightData.selectedOpenTrailers.includes(trailer)}
                          onCheckedChange={() => handleTrailerSelection(trailer, 'open')}
                          className={checkboxStyle}
                        />
                        <Label htmlFor={`open-${trailer}`} className="text-sm cursor-pointer">
                          {trailer}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Carroceria Especial */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-[#111827] uppercase tracking-wide">Especial</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {specialTrailers.map((trailer) => (
                      <div key={trailer} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`special-${trailer}`}
                          checked={freightData.selectedSpecialTrailers.includes(trailer)}
                          onCheckedChange={() => handleTrailerSelection(trailer, 'special')}
                          className={checkboxStyle}
                        />
                        <Label htmlFor={`special-${trailer}`} className="text-sm cursor-pointer">
                          {trailer}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Resumo de seleção */}
                {getAllSelectedTrailers().length > 0 && (
                  <div className="bg-[#f9fafb] border border-[#e5e7eb] p-4 rounded-lg">
                    <h5 className="text-sm font-medium text-[#111827] mb-2">Carrocerias Selecionadas:</h5>
                    <div className="flex flex-wrap gap-2">
                      {getAllSelectedTrailers().map((trailer) => (
                        <Badge key={trailer} variant="secondary" className="text-xs">
                          {trailer}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Conformidade ANTT 2026 — CIOT, piso mínimo e classificação da operação */}
            <div className="bg-white border border-[#e5e7eb] rounded-lg">
              <div className="border-b border-[#e5e7eb] px-6 py-4">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-[#253663]" />
                  <div>
                    <h2 className="text-base font-medium text-[#111827]">Conformidade ANTT</h2>
                    <p className="text-sm text-[#6b7280] mt-0.5">
                      CIOT obrigatório e piso mínimo do frete (MP 1.343/2026)
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-6">
                {/* Painel de Status de Conformidade em Tempo Real */}
                <div className={`p-4 rounded-lg border flex flex-col gap-3 transition-all ${
                  isFormCompliant 
                    ? 'bg-green-50/70 border-green-200 text-green-800' 
                    : (pisoMinimoStatus === 'error' || adiantamentoStatus === 'error')
                      ? 'bg-red-50/70 border-red-200 text-red-800'
                      : 'bg-amber-50/70 border-amber-200 text-amber-800'
                }`}>
                  <div className="flex items-center gap-2 font-bold text-sm">
                    {isFormCompliant ? (
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    ) : (pisoMinimoStatus === 'error' || adiantamentoStatus === 'error') ? (
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    ) : (
                      <Clock className="w-5 h-5 text-amber-500 flex-shrink-0" />
                    )}
                    <span>
                      {isFormCompliant 
                        ? 'Frete em Conformidade ANTT' 
                        : (pisoMinimoStatus === 'error' || adiantamentoStatus === 'error')
                          ? 'Frete Não Conforme (Ajustes Necessários)'
                          : 'Aguardando Dados de Conformidade'}
                    </span>
                  </div>

                  <div className="text-xs space-y-2 font-medium">
                    {/* Linha Piso Mínimo */}
                    <div className="flex items-start gap-2">
                      <span className={`inline-block w-2.5 h-2.5 rounded-full mt-0.5 ${
                        pisoMinimoStatus === 'success' ? 'bg-green-500' : pisoMinimoStatus === 'error' ? 'bg-red-500' : 'bg-amber-400'
                      }`} />
                      <div>
                        <span className="font-semibold text-gray-900 block">Piso Mínimo ANTT:</span>
                        <span className="text-gray-600">{pisoMinimoMessage}</span>
                      </div>
                    </div>

                    {/* Linha Adiantamento TAC */}
                    <div className="flex items-start gap-2">
                      <span className={`inline-block w-2.5 h-2.5 rounded-full mt-0.5 ${
                        adiantamentoStatus === 'success' ? 'bg-green-500' : adiantamentoStatus === 'error' ? 'bg-red-500' : adiantamentoStatus === 'neutral' ? 'bg-gray-300' : 'bg-amber-400'
                      }`} />
                      <div>
                        <span className="font-semibold text-gray-900 block">Adiantamento Obrigatório (TAC):</span>
                        <span className="text-gray-600">{adiantamentoMessage}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Modalidade da operação</Label>
                  <Select
                    value={freightData.operationType}
                    onValueChange={(value: OperationType) => updateFreightData('operationType', value)}
                  >
                    <SelectTrigger className="bg-input-background border-input-border">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(OPERATION_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-[#6b7280]">
                    Define quem é responsável por emitir o CIOT desta operação e se o adiantamento mínimo de 70% ao TAC é obrigatório.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Distância estimada da rota (km)</Label>
                    <Input
                      value={freightData.distanceKm}
                      onChange={(e) => updateFreightData('distanceKm', e.target.value)}
                      placeholder={isEstimatingDistance ? 'Calculando automaticamente...' : '0'}
                      type="number"
                      className="bg-input-background border-input-border"
                    />
                    <p className="text-xs text-[#6b7280]">
                      {isEstimatingDistance
                        ? 'Estimando via rota rodoviária...'
                        : 'Preenchida automaticamente quando possível. Necessária para calcular o piso mínimo ANTT.'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Piso mínimo ANTT calculado</Label>
                    <div className={`px-3 py-2.5 rounded-lg border text-sm font-medium ${
                      isBelowPisoMinimo
                        ? 'border-red-300 bg-red-50 text-red-700'
                        : pisoMinimo
                          ? 'border-green-300 bg-green-50 text-green-700'
                          : 'border-[#e5e7eb] bg-[#fafafa] text-[#6b7280]'
                    }`}>
                      {pisoMinimo
                        ? `R$ ${pisoMinimo.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                        : 'Informe distância e tipo de carga'}
                    </div>
                    {pisoMinimo && (
                      <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-lg text-xs text-[#1e40af] space-y-2">
                        <p className="font-semibold flex items-center gap-1.5 text-[#1e3a8a]">
                          <Info className="w-3.5 h-3.5" /> Memória de Cálculo (ANTT 2026)
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[#4b5563]">
                          <div><span className="font-medium text-[#374151]">Fórmula:</span> (Distância × CCD) + CC</div>
                          <div><span className="font-medium text-[#374151]">Distância:</span> {pisoMinimo.distanciaKm} km</div>
                          <div><span className="font-medium text-[#374151]">Veículo estimado:</span> {pisoMinimo.eixosConsiderados} eixos</div>
                          <div><span className="font-medium text-[#374151]">Categoria ANTT:</span> {
                            pisoMinimo.categoriaCarga === 'carga_geral' ? 'Carga Geral' :
                            pisoMinimo.categoriaCarga === 'granel_solido' ? 'Granel Sólido' :
                            pisoMinimo.categoriaCarga === 'granel_liquido' ? 'Granel Líquido' :
                            pisoMinimo.categoriaCarga === 'granel_pressurizada' ? 'Granel Pressurizada' :
                            pisoMinimo.categoriaCarga === 'conteinerizada' ? 'Conteinerizada' :
                            pisoMinimo.categoriaCarga === 'frigorificada' ? 'Frigorificada' :
                            pisoMinimo.categoriaCarga === 'neogranel' ? 'Neogranel' :
                            pisoMinimo.categoriaCarga.replace(/_/g, ' ')
                          }</div>
                          <div><span className="font-medium text-[#374151]">Coeficiente CCD:</span> R$ {pisoMinimo.ccdUsado.toFixed(4)}/km</div>
                          <div><span className="font-medium text-[#374151]">Coeficiente CC:</span> R$ {pisoMinimo.ccUsado.toFixed(2)}</div>
                        </div>
                        <div className="pt-1.5 border-t border-blue-100/70 text-[#1e3a8a] font-mono text-[11px] flex justify-between items-center">
                          <span>({pisoMinimo.distanciaKm} km × R$ {pisoMinimo.ccdUsado.toFixed(4)}) + R$ {pisoMinimo.ccUsado.toFixed(2)}</span>
                          <span className="font-bold">Total: R$ {pisoMinimo.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    )}
                    {pisoMinimo?.needsVerification && (
                      <p className="text-xs text-amber-600">
                        Coeficiente estimado — confira o valor oficial em calculadorafrete.antt.gov.br antes de fechar o frete.
                      </p>
                    )}
                  </div>
                </div>

                {isBelowPisoMinimo && pisoMinimo && (
                  <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-700">Valor abaixo do piso mínimo do frete</p>
                      <p className="text-xs text-red-600 mt-0.5">
                        O CIOT não poderá ser gerado automaticamente com o frete abaixo do piso. Para conformidade total da ANTT, recomendamos ajustar o valor para pelo menos R$ {pisoMinimo.valor.toFixed(2)}.
                      </p>
                    </div>
                  </div>
                )}

                <Separator />

                <div className="space-y-2">
                  <Label>Vale-pedágio eletrônico (FVPO)</Label>
                  <Select
                    value={freightData.valePedagioProvider}
                    onValueChange={(value: ValePedagioProviderId) => updateFreightData('valePedagioProvider', value)}
                  >
                    <SelectTrigger className="bg-input-background border-input-border">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(VALE_PEDAGIO_PROVIDER_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-[#6b7280]">
                    O vale-pedágio é 100% eletrônico (TAG/OCR) — dinheiro e cupom em papel não são mais aceitos.
                  </p>
                </div>

                {isTacOperation && (
                  <div className="space-y-2">
                    <Label>Pagamento do frete será feito para</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        className={`p-3 border rounded-lg cursor-pointer transition-all text-left ${
                          freightData.paymentAccountType === 'propria' ? 'border-[#253663] bg-[#253663]/5 text-[#253663]' : 'border-[#e5e7eb] hover:bg-[#fafafa] text-[#6b7280]'
                        }`}
                        onClick={() => updateFreightData('paymentAccountType', 'propria')}
                      >
                        <span className="text-sm font-medium">Conta própria do TAC</span>
                      </button>
                      <button
                        type="button"
                        className={`p-3 border rounded-lg cursor-pointer transition-all text-left ${
                          freightData.paymentAccountType === 'terceiro_autorizado' ? 'border-[#253663] bg-[#253663]/5 text-[#253663]' : 'border-[#e5e7eb] hover:bg-[#fafafa] text-[#6b7280]'
                        }`}
                        onClick={() => updateFreightData('paymentAccountType', 'terceiro_autorizado')}
                      >
                        <span className="text-sm font-medium">Terceiro indicado pelo TAC</span>
                      </button>
                    </div>
                    <p className="text-xs text-[#6b7280]">
                      A conta de recebimento não pode ser imposta pelo contratante — apenas própria do motorista ou de terceiro por ele indicado.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Valor e Pagamento - Seção Unificada */}
            <div className="bg-white border border-[#e5e7eb] rounded-lg">
              <div className="border-b border-[#e5e7eb] px-6 py-4">
                <div className="flex items-center gap-3">
                  <DollarSign className="w-5 h-5 text-[#253663]" />
                  <div>
                    <h2 className="text-base font-medium text-[#111827]">Valor e Pagamento</h2>
                    <p className="text-sm text-[#6b7280] mt-0.5">
                      Defina o valor, forma de pagamento e condições do frete
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-6">
                <div className="space-y-4">
                  <Label className="text-sm font-medium text-[#111827]">Valor do frete</Label>
                  <RadioGroup 
                    value={freightData.freightValueType} 
                    onValueChange={(value: 'known' | 'negotiable') => updateFreightData('freightValueType', value)}
                    className="grid grid-cols-2 gap-3"
                  >
                    <div 
                      className={`flex items-center justify-center py-2.5 px-4 border-2 rounded-lg cursor-pointer transition-all ${
                        freightData.freightValueType === 'known' 
                          ? 'border-[#253663] bg-white' 
                          : 'border-[#e5e7eb] bg-white hover:border-[#d1d5db]'
                      }`}
                      onClick={() => updateFreightData('freightValueType', 'known')}
                    >
                      <Label htmlFor="known" className={`cursor-pointer text-sm ${
                        freightData.freightValueType === 'known' ? 'text-[#253663]' : 'text-[#9ca3af]'
                      }`}>Já sei o valor</Label>
                      <RadioGroupItem value="known" id="known" className="hidden" />
                    </div>
                    <div 
                      className={`flex items-center justify-center py-2.5 px-4 border-2 rounded-lg cursor-pointer transition-all ${
                        freightData.freightValueType === 'negotiable' 
                          ? 'border-[#253663] bg-white' 
                          : 'border-[#e5e7eb] bg-white hover:border-[#d1d5db]'
                      }`}
                      onClick={() => updateFreightData('freightValueType', 'negotiable')}
                    >
                      <Label htmlFor="negotiable" className={`cursor-pointer text-sm ${
                        freightData.freightValueType === 'negotiable' ? 'text-[#253663]' : 'text-[#9ca3af]'
                      }`}>A combinar</Label>
                      <RadioGroupItem value="negotiable" id="negotiable" className="hidden" />
                    </div>
                  </RadioGroup>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {freightData.freightValueType === 'known' && (
                    <div className="space-y-2">
                      <Label>Valor do Frete</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                        <Input
                          value={freightData.freightValue}
                          onChange={(e) => updateFreightData('freightValue', e.target.value)}
                          placeholder="0,00"
                          type="number"
                          step="0.01"
                          className={`bg-input-background border-input-border pl-10 ${
                            isBelowPisoMinimo ? 'border-red-300 focus-visible:ring-red-500 focus-visible:border-red-500' : ''
                          }`}
                        />
                      </div>
                      {isBelowPisoMinimo && pisoMinimo && (
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-xs">
                          <span className="text-red-600 font-medium flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                            Abaixo do piso mínimo ANTT (Mínimo: R$ {pisoMinimo.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                          </span>
                          <button
                            type="button"
                            onClick={() => updateFreightData('freightValue', pisoMinimo.valor.toFixed(2))}
                            className="text-[#253663] hover:underline font-semibold cursor-pointer underline text-[11px]"
                          >
                            Ajustar para o valor correto
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label>Cálculo do valor</Label>
                    <Select value={freightData.valueCalculation} onValueChange={(value) => updateFreightData('valueCalculation', value)}>
                      <SelectTrigger className="bg-input-background border-input-border">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {valueCalculationOptions.map((option) => (
                          <SelectItem key={option} value={option.toLowerCase()}>{option}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {hasAllFreightData && pisoMinimo && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3 mt-4">
                    <Zap className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-blue-800">Recomendação de Valor para Publicação</p>
                      <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                        Com base nos dados fornecidos para a rota de <strong>{freightData.distanceKm} km</strong>, o piso mínimo ANTT calculado é de <strong>R$ {pisoMinimo.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>.
                      </p>
                      <p className="text-xs text-blue-700 mt-1">
                        Sugerimos publicar o frete a partir de <strong>R$ {(pisoMinimo.valor * 1.1).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> (piso + 10%) para atrair mais motoristas rapidamente.
                      </p>
                      <div className="flex gap-2 mt-3">
                        <button
                          type="button"
                          onClick={() => updateFreightData('freightValue', pisoMinimo.valor.toFixed(2))}
                          className="text-xs bg-white text-blue-800 border border-blue-300 hover:bg-blue-50 px-3 py-1.5 rounded font-medium transition-colors cursor-pointer"
                        >
                          Usar Piso Mínimo (R$ {pisoMinimo.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                        </button>
                        <button
                          type="button"
                          onClick={() => updateFreightData('freightValue', (pisoMinimo.valor * 1.1).toFixed(2))}
                          className="text-xs bg-[#253663] hover:bg-[#1e2d52] text-white px-3 py-1.5 rounded font-medium transition-colors cursor-pointer"
                        >
                          Usar Sugerido (R$ {(pisoMinimo.valor * 1.1).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Forma de pagamento (opcional)</Label>
                  <Select value={freightData.paymentMethod} onValueChange={(value) => updateFreightData('paymentMethod', value)}>
                    <SelectTrigger className="bg-input-background border-input-border">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethodOptions.map((option) => (
                        <SelectItem key={option} value={option.toLowerCase()}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />
                {/* Pedágio */}
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-1.5">
                  <div className="flex items-center gap-2 text-amber-800 font-semibold text-sm">
                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span>Vale-Pedágio Obrigatório (Lei nº 10.209/2001)</span>
                  </div>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    O valor do pedágio <strong>sempre deve ser pago à parte</strong> e antecipadamente ao motorista. É expressamente proibido por lei descontar o pedágio do valor do frete ou embuti-lo no frete líquido.
                  </p>
                </div>

                {/* Adiantamento */}
                <div className="space-y-2">
                  <Label>Adiantamento (opcional)</Label>
                  <div className="relative max-w-xs">
                    <Input
                      value={freightData.advancePayment}
                      onChange={(e) => updateFreightData('advancePayment', e.target.value)}
                      placeholder="0"
                      type="number"
                      min="0"
                      max="100"
                      className={`bg-input-background border-input-border pr-8 ${
                        advancePaymentBelowMinimum ? 'border-red-300 focus-visible:ring-red-500 focus-visible:border-red-500' : ''
                      }`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                  </div>
                  {advancePaymentBelowMinimum && (
                    <p className="text-xs text-red-600 font-medium flex items-center gap-1.5 mt-1">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      Para TAC/TAC-Agregado, a lei exige adiantamento mínimo de 70% do frete.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Observações */}
            <div className="bg-white border border-[#e5e7eb] rounded-lg">
              <div className="border-b border-[#e5e7eb] px-6 py-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-medium text-[#111827]">Observações (opcional)</h2>
                  <span className="text-sm text-[#6b7280]">
                    {freightData.observations.length}/500
                  </span>
                </div>
              </div>
              <div className="p-6 space-y-3">
                <Textarea
                  value={freightData.observations}
                  onChange={(e) => {
                    if (e.target.value.length <= 500) {
                      updateFreightData('observations', e.target.value);
                    }
                  }}
                  placeholder="Preencha somente com informações extras importantes para conhecimento dos motoristas."
                  className="bg-input-background border-input-border min-h-24"
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground">
                  Observações que contenham telefones não aparecerão na listagem de fretes, para escolher ou adicionar contatos vá para a sessão Responsáveis pelo frete.
                </p>
              </div>
            </div>

            {/* Tipos de frete - OCULTO */}
            {false && (
            <div className="bg-white border border-[#e5e7eb] rounded-lg">
              <div className="border-b border-[#e5e7eb] px-6 py-4">
                <h2 className="text-base font-medium text-[#111827]">Tipos de Publicação</h2>
                <p className="text-sm text-[#6b7280] mt-0.5">
                  Escolha o tipo de publicação que melhor atende suas necessidades
                </p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Frete Simples */}
                  <div 
                    className={`cursor-pointer transition-all border rounded-lg p-6 text-center ${
                      freightData.freightType === 'simple' ? 'border-[#253663] bg-[#253663]/5 ring-2 ring-[#253663]' : 'border-[#e5e7eb] hover:border-[#9ca3af]'
                    }`}
                    onClick={() => updateFreightData('freightType', 'simple')}
                  >
                    <FileText className="w-8 h-8 mx-auto mb-3 text-[#6b7280]" />
                    <h4 className="text-base font-medium text-[#111827] mb-2">Frete Simples</h4>
                    <Badge variant="secondary" className="mb-3">Grátis</Badge>
                    <p className="text-sm text-[#6b7280]">
                      Publicação básica com alcance limitado
                    </p>
                  </div>

                  {/* Frete Plus */}
                  <div 
                    className={`cursor-pointer transition-all border rounded-lg p-6 text-center ${
                      freightData.freightType === 'plus' ? 'border-[#253663] bg-[#253663]/5 ring-2 ring-[#253663]' : 'border-[#e5e7eb] hover:border-[#9ca3af]'
                    }`}
                    onClick={() => updateFreightData('freightType', 'plus')}
                  >
                    <Zap className="w-8 h-8 mx-auto mb-3 text-[#253663]" />
                    <h4 className="text-base font-medium text-[#111827] mb-2">Frete Plus</h4>
                    <Badge className="mb-3 bg-[#253663]">R$ 9,90</Badge>
                    <p className="text-sm text-[#6b7280]">
                      Maior visibilidade e prioridade
                    </p>
                  </div>

                  {/* Frete Destaque */}
                  <div 
                    className={`cursor-pointer transition-all border rounded-lg p-6 text-center ${
                      freightData.freightType === 'highlight' ? 'border-[#253663] bg-[#253663]/5 ring-2 ring-[#253663]' : 'border-[#e5e7eb] hover:border-[#9ca3af]'
                    }`}
                    onClick={() => updateFreightData('freightType', 'highlight')}
                  >
                    <Crown className="w-8 h-8 mx-auto mb-3 text-[#253663]" />
                    <h4 className="text-base font-medium text-[#111827] mb-2">Frete Destaque</h4>
                    <Badge className="bg-[#253663] hover:bg-[#1a2847] mb-3">R$ 19,90</Badge>
                    <p className="text-sm text-[#6b7280]">
                      Máxima exposição e destaque
                    </p>
                  </div>
                </div>
              </div>
            </div>
            )}

      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#fafafa] overflow-y-auto">
      <div className="max-w-6xl mx-auto p-6 lg:p-8">
        {/* Header - Simplificado e minimalista */}
        <div className="mb-10">
          <div className="flex items-center gap-4 mb-4">
            {onCancel && (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={onCancel}
                className="h-10 w-10 rounded-full hover:bg-gray-100"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <div>
              <h1 className="text-2xl font-medium text-[#111827] mb-2">
                {isEditing ? 'Editar Frete' : 'Criar Novo Frete'}
              </h1>
              <p className="text-sm text-[#6b7280]">
                {isEditing 
                  ? 'Atualize as informações do frete' 
                  : 'Preencha os dados do seu frete para encontrar o transportador ideal'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Content - Formulário em etapa única */}
        <div className="mb-6">
          {renderAllContent()}
        </div>

        {/* Actions - Simplificado */}
        <div className="bg-white border border-[#e5e7eb] rounded-lg p-5">
          <div className="flex items-center justify-between gap-4">
            {/* Botão Salvar como modelo */}
            <Button 
              variant="outline"
              onClick={() => {
                toast.info('Funcionalidade de modelos em breve.');
              }}
              className="flex items-center gap-2 text-[#6b7280] border-[#d1d5db] hover:bg-[#f9fafb] hover:text-[#111827] hover:border-[#9ca3af]"
            >
              <FileText className="w-4 h-4" />
              Salvar como modelo
            </Button>

            <div className="flex items-center gap-3">
              {/* Botão Agendar frete */}
              <Button 
                variant="outline"
                onClick={() => {
                  handleSchedule();
                }} 
                className="flex items-center gap-2 text-[#6b7280] border-[#d1d5db] hover:bg-[#f9fafb] hover:text-[#111827] hover:border-[#9ca3af]"
              >
                <Calendar className="w-4 h-4" />
                Agendar frete
              </Button>
              
              {/* Botão Publicar Frete */}
              <Button 
                onClick={() => {
                  handleSubmit();
                }} 
                className="flex items-center gap-2 bg-[#253663] hover:bg-[#1a2847] text-white px-6 h-10"
              >
                {isEditing ? 'Atualizar Frete' : 'Publicar Frete'}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}