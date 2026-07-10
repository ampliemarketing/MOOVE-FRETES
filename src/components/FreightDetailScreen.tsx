import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { formatLocationSlash } from '../utils/location-helpers';
import {
  ArrowLeft,
  MapPin,
  Package,
  Truck,
  Calendar,
  DollarSign,
  User,
  Phone,
  Star,
  Clock,
  Weight,
  Edit,
  Share,
  Trash2,
  Play,
  Pause,
  CheckCircle,
  Building2,
  AlertCircle,
  FileText,
  Navigation,
  Send,
  Shield,
  Ruler,
  Box,
  CreditCard,
  ChevronDown,
  MessageCircle,
  Receipt,
  Layers,
  Container,
  Maximize,
  CircleDollarSign,
  Users,
  Copy
} from 'lucide-react';
import { FaWhatsapp } from "react-icons/fa";
import { MdOutlineEdit, MdOutlineCancel } from "react-icons/md";
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { Separator } from './ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { toast } from 'sonner@2.0.3';
import { ImageWithFallback } from './ImageWithFallback';
import { database } from '../utils/database';
import type { User as AppUser } from './contexts/AppContext';
import { UnifiedUserProfileSheet } from './UnifiedUserProfileSheet';
import { fetchCompleteUserProfile } from '../utils/user-profile-helper';
import { RatingDialog } from './RatingDialog';
import { getAvatarUrl } from '../utils/storage-helper'; // ✅ IMPORTAR HELPER
import { generateDeepLinkUrl } from '../utils/deep-link';
import { ciotRepository, mdfeRepository, valePedagioRepository } from '../utils/antt/repositories';
import { CIOT_PROVIDER_LABELS, VALE_PEDAGIO_PROVIDER_LABELS, type CiotOperationRecord, type MdfeRecord, type ValePedagioRecord } from '../utils/antt/types';

interface Freight {
  id: string;
  freight_code?: string; // Código único no padrão placa brasileira (AAA0A00)
  type: 'plus' | 'regular';
  exposureLevel: 'Alta exposição' | 'Média exposição' | 'Baixa exposição';
  origin: {
    city: string;
    state: string;
    contactName?: string;
    contactPhone?: string;
  };
  destination: {
    city: string;
    state: string;
    contactName?: string;
    contactPhone?: string;
  };
  cargo: string;
  weight: string;
  truckType: string;
  category: string;
  status: 'draft' | 'active' | 'scheduled' | 'inactive' | 'completed' | 'in-transit' | 'contracted' | 'cancelled';
  price: 'A combinar' | string;
  createdAt: string;
  updatedAt?: string;
  customerId: string;
  customerName?: string;
  companyLogo?: string;
  acceptedDriverId?: string;
  acceptedDriverName?: string;
  driver?: {
    id: string;
    name: string;
    phone: string;
    rating: number;
  };
  value?: number;
  deadline?: string;
  pickupDate?: string;
  observations?: string;
  priority: 'low' | 'medium' | 'high';
  
  // Campos adicionais do cadastro
  product?: string;
  species?: string;
  cargoType?: string;
  occupancyType?: 'completa' | 'complemento';
  volumes?: string;
  volumeUnit?: string;
  needsCover?: boolean;
  needsTracker?: boolean;
  isInsured?: boolean;
  deliveryDate?: string;
  cubicWeight?: string;
  totalCubicMeters?: string;
  length?: string;
  width?: string;
  height?: string;
  responsibleContacts?: Array<{
    id: string;
    name: string;
    email?: string;
    phone: string;
    isMainContact: boolean;
    source: 'collaborator' | 'manual';
  }>;
  hasAdditionalCargo?: boolean;
  additionalCargoDetails?: string;
  selectedLightVehicles?: string[];
  selectedMediumVehicles?: string[];
  selectedHeavyVehicles?: string[];
  selectedClosedTrailers?: string[];
  selectedOpenTrailers?: string[];
  selectedSpecialTrailers?: string[];
  freightValueType?: 'known' | 'negotiable';
  valueCalculation?: string;
  paymentIncluded?: 'included' | 'separate';
  paymentMethod?: string;
  advancePayment?: string;
  schedulingDate?: string;
  urgencyType?: 'normal' | 'urgent' | 'scheduled';
  scheduledDate?: string;

  // ✅ ANTT 2026 — CIOT universal e piso mínimo
  operationType?: string;
  pisoMinimoValor?: number;
  abaixoDoPiso?: boolean;
  ciotStatus?: string;
  valePedagioStatus?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'admin' | 'user' | 'driver';
}

interface FreightDetailScreenProps {
  freight: Freight;
  user?: User;
  onBack: () => void;
  onEdit?: (freight: Freight) => void;
  onDelete?: (freightId: string) => void;
  onToggleStatus?: (freightId: string, newStatus: Freight['status']) => void;
  onUpdate?: () => void | Promise<void>;
  isOwnFreight?: boolean;
  onChat?: (freightId: string, freightData?: Freight) => void;
}

// Função para gerar código de frete no padrão de placa brasileira Mercosul (AAA0A00)
const generateFreightCode = (id: string): string => {
  const chars = id.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  
  // Extrai caracteres para formar o padrão AAA0A00
  const letters = chars.replace(/[0-9]/g, ''); // Apenas letras
  const numbers = chars.replace(/[A-Z]/g, '');  // Apenas números
  
  // Garante que temos caracteres suficientes
  const l1 = letters[0] || 'A';
  const l2 = letters[1] || 'B';
  const l3 = letters[2] || 'C';
  const n1 = numbers[0] || '1';
  const l4 = letters[3] || 'D';
  const n2 = numbers[1] || '2';
  const n3 = numbers[2] || '3';
  
  return `#${l1}${l2}${l3}${n1}${l4}${n2}${n3}`;
};

export function FreightDetailScreen({
  freight,
  user,
  onBack,
  onEdit,
  onDelete,
  onToggleStatus,
  onUpdate,
  isOwnFreight = false,
  onChat
}: FreightDetailScreenProps) {
  // ✅ Resolver companyId: se for colaborador, usar o companyId da empresa vinculada
  const resolvedCompanyId = user?.collaborator?.companyId || user?.id || '';
  const displayName = user?.collaborator ? (user?.collaborator?.companyName || user?.name || '') : (user?.name || '');
  
  // ✅ CONVERTER companyLogo PATH → URL dinamicamente
  const companyLogoUrl = useMemo(() => getAvatarUrl(freight.companyLogo), [freight.companyLogo]);
  
  const [isContactsOpen, setIsContactsOpen] = useState(false);
  const [isDimensionsOpen, setIsDimensionsOpen] = useState(false);
  const [isVehiclesOpen, setIsVehiclesOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [showCompanyProfile, setShowCompanyProfile] = useState(false);
  const [companyProfile, setCompanyProfile] = useState<any | null>(null);
  const [loadingCompanyProfile, setLoadingCompanyProfile] = useState(false);
  
  // Estado para contatos responsáveis carregados do banco
  const [loadedContacts, setLoadedContacts] = useState<any[]>([]);

  // Carregar contatos responsáveis do banco de dados
  useEffect(() => {
    const loadContacts = async () => {
      try {
        const { freightContactRepository } = await import('../utils/database/repositories/saved-contact-repository');
        const result = await freightContactRepository.getByFreight(freight.id);
        if (result.success && result.data && result.data.length > 0) {
          setLoadedContacts(result.data.map((c: any) => ({
            id: c.id,
            name: c.contact_name,
            email: c.contact_email,
            phone: c.contact_phone,
            isMainContact: c.is_main_contact,
            source: c.source,
          })));
        }
      } catch (e) {
      }
    };
    if (freight.id) loadContacts();
  }, [freight.id]);

  // Usar contatos do banco OU os que vieram no objeto freight (fallback)
  const responsibleContacts = loadedContacts.length > 0
    ? loadedContacts
    : (freight.responsibleContacts || []);

  // ✅ ANTT 2026 — CIOT, MDF-e e vale-pedágio deste frete
  const [ciotRecord, setCiotRecord] = useState<CiotOperationRecord | null>(null);
  const [mdfeRecord, setMdfeRecord] = useState<MdfeRecord | null>(null);
  const [valePedagioRecord, setValePedagioRecord] = useState<ValePedagioRecord | null>(null);
  const [showCiotDialog, setShowCiotDialog] = useState(false);
  const [showMdfeDialog, setShowMdfeDialog] = useState(false);
  const [ciotNumberInput, setCiotNumberInput] = useState('');
  const [mdfeNumberInput, setMdfeNumberInput] = useState('');
  const [savingCompliance, setSavingCompliance] = useState(false);

  const loadComplianceRecords = async () => {
    const [ciotRes, mdfeRes, valePedagioRes] = await Promise.all([
      ciotRepository.getByFreight(freight.id),
      mdfeRepository.getByFreight(freight.id),
      valePedagioRepository.getByFreight(freight.id),
    ]);
    if (ciotRes.success) setCiotRecord(ciotRes.data || null);
    if (mdfeRes.success) setMdfeRecord(mdfeRes.data || null);
    if (valePedagioRes.success) setValePedagioRecord(valePedagioRes.data || null);
  };

  useEffect(() => {
    if (freight.id) loadComplianceRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freight.id]);

  const handleConfirmCiotNumber = async () => {
    if (!ciotNumberInput.trim()) {
      toast.error('Informe o número do CIOT');
      return;
    }
    setSavingCompliance(true);
    try {
      const result = await ciotRepository.createOrUpdate({
        freightId: freight.id,
        status: 'generated',
        provider: ciotRecord?.provider || 'manual',
        operationType: (freight.operationType as any) || ciotRecord?.operationType || null,
        valorOperacao: ciotRecord?.valorOperacao ?? null,
        pisoMinimoAplicavel: ciotRecord?.pisoMinimoAplicavel ?? null,
        ciotNumber: ciotNumberInput.trim(),
        generatedBy: user?.id,
      });
      if (result.success) {
        toast.success('CIOT registrado para este frete');
        setShowCiotDialog(false);
        setCiotNumberInput('');
        await loadComplianceRecords();
      } else {
        toast.error(result.error || 'Erro ao registrar CIOT');
      }
    } finally {
      setSavingCompliance(false);
    }
  };

  const handleConfirmMdfeNumber = async () => {
    if (!mdfeNumberInput.trim()) {
      toast.error('Informe o número do MDF-e');
      return;
    }
    if (!user?.id) return;
    setSavingCompliance(true);
    try {
      const result = await mdfeRepository.registerManualMdfe({
        freightId: freight.id,
        numeroMdfe: mdfeNumberInput.trim(),
        ciotOperationId: ciotRecord?.id || null,
        issuedBy: user.id,
      });
      if (result.success) {
        toast.success('MDF-e registrado para este frete');
        setShowMdfeDialog(false);
        setMdfeNumberInput('');
        await loadComplianceRecords();
      } else {
        toast.error(result.error || 'Erro ao registrar MDF-e');
      }
    } finally {
      setSavingCompliance(false);
    }
  };

  // Estados para avaliação
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [ratingTarget, setRatingTarget] = useState<{
    targetId: string;
    targetName: string;
    targetType: 'embarcador' | 'transportadora' | 'caminhoneiro' | 'agenciador';
  } | null>(null);
  const [canRate, setCanRate] = useState(false);
  const [hasAlreadyRated, setHasAlreadyRated] = useState(false);

  // 🔍 Debug: Verificar se observações estão chegando
  useEffect(() => {
  }, [freight]);

  // Verificar se pode avaliar quando o frete está concluído
  useEffect(() => {
    const checkRatingEligibility = async () => {
      if (!user || !freight || freight.status !== 'completed') {
        setCanRate(false);
        return;
      }

      // Determinar quem deve ser avaliado
      let targetId: string | null = null;
      let targetName: string | null = null;
      let targetType: 'embarcador' | 'transportadora' | 'caminhoneiro' | 'agenciador' | null = null;

      if (isOwnFreight && freight.acceptedDriverId) {
        // Dono do frete avalia o motorista
        targetId = freight.acceptedDriverId;
        targetName = freight.acceptedDriverName || 'Motorista';
        targetType = 'caminhoneiro';
      } else if (freight.acceptedDriverId === resolvedCompanyId) {
        // Motorista avalia a empresa
        targetId = freight.customerId;
        targetName = freight.customerName || 'Empresa';
        
        // Buscar tipo da empresa
        const userResult = await database.users.getById(freight.customerId);
        if (userResult.success && userResult.data) {
          targetType = userResult.data.userType as any;
        }
      }

      if (targetId && targetName && targetType) {
        // Verificar se já avaliou
        const hasRated = await database.ratings.hasEvaluated(freight.id, resolvedCompanyId, targetId);
        setHasAlreadyRated(hasRated);
        setCanRate(!hasRated);
        
        if (!hasRated) {
          setRatingTarget({ targetId, targetName, targetType });
        }
      }
    };

    checkRatingEligibility();
  }, [freight, user, isOwnFreight]);

  // Função para abrir dialog de avaliação
  const handleOpenRatingDialog = () => {
    if (!canRate || !ratingTarget) {
      toast.error('Não é possível avaliar este usuário no momento');
      return;
    }
    setShowRatingDialog(true);
  };

  // Função para buscar perfil da empresa
  const handleViewCompanyProfile = async () => {
    if (loadingCompanyProfile) return;
    
    try {
      setLoadingCompanyProfile(true);
      
      // Usar fetchCompleteUserProfile ao invés de database.users.getById
      const profile = await fetchCompleteUserProfile(freight.customerId);
      
      // [REVISAR] console.log('📦 [FreightDetailScreen] Perfil completo retornado:', {
      // hasProfile: !!profile,
      // id: profile?.id,
      // name: profile?.name,
      // userType: profile?.userType,
      // hasAvatar: !!(profile as any)?.avatar,
      // hasAvatarUrl: !!(profile as any)?.avatarUrl,
      // avatar: (profile as any)?.avatar?.substring(0, 100),
      // avatarUrl: (profile as any)?.avatarUrl?.substring(0, 100),
      // allFields: profile ? Object.keys(profile) : []
      // });
      
      if (profile) {
        setCompanyProfile(profile);
        setShowCompanyProfile(true);
      } else {
        toast.error('Não foi possível carregar o perfil da empresa');
      }
    } catch (error) {
      console.error('Erro ao carregar perfil da empresa:', error);
      toast.error('Erro ao carregar perfil da empresa');
    } finally {
      setLoadingCompanyProfile(false);
    }
  };

  const getStatusColor = (status: Freight['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'contracted':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'completed':
        return 'bg-gray-50 text-gray-700 border-gray-200';
      case 'inactive':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'scheduled':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'draft':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'in-transit':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'cancelled':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStatusText = (status: Freight['status']) => {
    switch (status) {
      case 'active':
        return 'Ativo';
      case 'contracted':
        return 'Contratado';
      case 'completed':
        return 'Concluído';
      case 'inactive':
        return 'Inativo';
      case 'scheduled':
        return freight.pickupDate 
          ? `Agendado ${new Date(freight.pickupDate + 'T00:00:00').toLocaleDateString('pt-BR')}`
          : 'Agendado';
      case 'draft':
        return 'Rascunho';
      case 'in-transit':
        return 'Em Trânsito';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  };

  const getPriorityColor = (priority: Freight['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'medium':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'low':
        return 'bg-green-50 text-green-700 border-green-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getPriorityText = (priority: Freight['priority']) => {
    switch (priority) {
      case 'high':
        return 'Alta';
      case 'medium':
        return 'Média';
      case 'low':
        return 'Baixa';
      default:
        return priority;
    }
  };

  const getUrgencyText = (urgency?: string) => {
    switch (urgency) {
      case 'urgent':
        return 'Urgente';
      case 'scheduled':
        return 'Agendado';
      case 'normal':
      default:
        return 'Normal';
    }
  };

  const handleChatClick = () => {
    if (onChat) {
      onChat(freight.id, freight);
    } else {
      toast.info('Função de chat em breve!');
    }
  };

  const handleShareWhatsApp = () => {
    const today = new Date().toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
    
    const origin = formatLocationSlash(freight.origin);
    const destination = formatLocationSlash(freight.destination);
    const vehicleType = freight.truckType || 'Não especificado';
    const trailerTypes = [
      ...(freight.selectedClosedTrailers || []),
      ...(freight.selectedOpenTrailers || []),
      ...(freight.selectedSpecialTrailers || [])
    ].join(', ') || 'Não especificado';
    const product = freight.product || 'Não especificado';
    const freightCode = freight.freight_code || generateFreightCode(freight.id);
    const price = freight.price !== 'A combinar' ? `R$ ${freight.price}` : 'A combinar';
    
    const message = `🚚 *Frete ${freightCode} disponível*

📦 ${origin} → ${destination}

🔗 *Link do frete:*
${generateDeepLinkUrl('freight', freight.id)}

🏢 Empresa: ${freight.customerName || 'Empresa'}`;
    
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  // ✅ COMPARTILHAR INTERESSE NO FRETE (Motorista)
  const handleDriverShare = async () => {
    if (!user) return;
    
    try {
      const today = new Date().toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
      
      // Gerar saudação baseada na hora do dia
      const hour = new Date().getHours();
      let greeting = 'Bom dia';
      if (hour >= 12 && hour < 18) {
        greeting = 'Boa tarde';
      } else if (hour >= 18) {
        greeting = 'Boa noite';
      }
      
      // Buscar o perfil da empresa/transportadora
      const companyResult = await database.users.getById(freight.customerId);
      
      if (!companyResult.success || !companyResult.data) {
        toast.error('Não foi possível obter os dados da transportadora');
        return;
      }
      
      const companyPhone = companyResult.data.phone;
      
      if (!companyPhone) {
        toast.error('Transportadora não possui telefone cadastrado');
        return;
      }
      
      // Formatar número de telefone (remover caracteres especiais)
      const phoneNumber = companyPhone.replace(/\D/g, '');
      
      const origin = formatLocationSlash(freight.origin);
      const destination = formatLocationSlash(freight.destination);
      const cargoType = freight.cargo || 'Não especificado';
      const driverName = user.name || 'Motorista';
      const freightCode = freight.freight_code || generateFreightCode(freight.id);
      const price = freight.price !== 'A combinar' ? `R$ ${freight.price}` : 'A combinar';
      const vehicleType = freight.truckType || 'Não especificado';
      const companyName = companyResult.data.name || 'Empresa';
      const companyId = freight.customerId;
      
      // Buscar rating do motorista (se disponível)
      const driverProfile = await database.drivers?.getByUserId?.(user.id);
      const driverRating = driverProfile?.success ? driverProfile.data?.rating || 'N/A' : 'N/A';
      
      const message = buildDriverInterestMessage({
        freightCode,
        freightId: freight.id,
        origin,
        destination,
        cargoType: typeof cargoType === 'string' ? cargoType : 'Não especificado',
        product: freight.product || 'Não especificado',
        price,
        driverName,
        driverRating: String(driverRating),
        vehicleType,
        driverId: user.id,
        companyName,
        companyId,
        greeting,
      });
      
      // Enviar para o número específico da transportadora
      const whatsappUrl = `https://api.whatsapp.com/send?phone=55${phoneNumber}&text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
    } catch (error) {
      console.error('Erro ao buscar dados da transportadora:', error);
      toast.error('Erro ao abrir WhatsApp');
    }
  };

  // Gerar mensagem padrão de interesse no frete (reutilizada para contatos responsáveis)
  const buildDriverInterestMessage = (params: {
    freightCode: string;
    freightId: string;
    origin: string;
    destination: string;
    cargoType: string;
    product: string;
    price: string;
    driverName: string;
    driverRating: string;
    vehicleType: string;
    driverId: string;
    companyName: string;
    companyId: string;
    greeting: string;
  }) => {
    return `*Olá, sou ${params.driverName} e estou disponível para transportar o frete ${params.freightCode}.*

📦 *Frete ${params.freightCode}:*
${params.origin} → ${params.destination}
Produto: ${params.product}

🔗 *Link do frete:*
${generateDeepLinkUrl('freight', params.freightId)}

🚛 *Meu perfil:*
${generateDeepLinkUrl('profile', params.driverId)}

*A carga ainda está disponível?* 🚚`;
  };

  // Enviar WhatsApp para contato responsável pelo frete
  const handleContactWhatsApp = async (contactPhone: string) => {
    if (!user) {
      toast.error('Você precisa estar logado para enviar mensagem');
      return;
    }

    const phoneNumber = contactPhone.replace(/\D/g, '');
    if (!phoneNumber) {
      toast.error('Número de telefone inválido');
      return;
    }

    const hour = new Date().getHours();
    let greeting = 'Bom dia';
    if (hour >= 12 && hour < 18) greeting = 'Boa tarde';
    else if (hour >= 18) greeting = 'Boa noite';

    const origin = formatLocationSlash(freight.origin);
    const destination = formatLocationSlash(freight.destination);
    const cargoType = typeof freight.cargo === 'string' ? freight.cargo : 'Não especificado';
    const freightCode = freight.freight_code || generateFreightCode(freight.id);
    const price = freight.price !== 'A combinar' ? `R$ ${freight.price}` : 'A combinar';
    const vehicleType = freight.truckType || 'Não especificado';

    try {
      const companyResult = await database.users.getById(freight.customerId);
      const companyName = companyResult?.data?.name || freight.customerName || 'Empresa';
      
      const driverProfile = await database.drivers?.getByUserId?.(user.id);
      const driverRating = driverProfile?.success ? String(driverProfile.data?.rating || 'N/A') : 'N/A';

      const message = buildDriverInterestMessage({
        freightCode,
        freightId: freight.id,
        origin,
        destination,
        cargoType,
        product: freight.product || 'Não especificado',
        price,
        driverName: user.name || 'Motorista',
        driverRating,
        vehicleType,
        driverId: user.id,
        companyName,
        companyId: freight.customerId,
        greeting,
      });

      const whatsappUrl = `https://api.whatsapp.com/send?phone=55${phoneNumber}&text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
    } catch (error) {
      console.error('Erro ao montar mensagem WhatsApp:', error);
      toast.error('Erro ao abrir WhatsApp');
    }
  };

  // Copiar número de telefone para a área de transferência
  const handleCopyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone).then(() => {
      toast.success('Número copiado!');
    }).catch(() => {
      toast.error('Não foi possível copiar');
    });
  };

  return (
    <div className="min-h-screen bg-background overflow-y-auto">
      {/* Header */}
      <div className="bg-card border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Button>
              <div className="h-6 w-px bg-border" />
              <div>
                <div className="text-xs text-gray-500">Código do Frete</div>
                <h1 className="text-gray-900 font-medium">
                  {freight.freight_code || generateFreightCode(freight.id)}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-end">
              {/* Botões disponíveis para não-donos do frete */}
              {!isOwnFreight && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDriverShare}
                    className="flex items-center gap-2 border-green-600 text-green-600 hover:bg-green-50 px-6"
                  >
                    <FaWhatsapp className="w-4 h-4" />
                    Enviar Mensagem
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleChatClick}
                    className="flex items-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Chat
                  </Button>
                </>
              )}
              
              {/* Botão Compartilhar disponível para todos */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleShareWhatsApp}
                className="flex items-center gap-2"
              >
                <FaWhatsapp className="w-4 h-4" />
                Compartilhar Frete
              </Button>
              
              {/* Botões exclusivos do dono */}
              {isOwnFreight && (
                <>
                {onEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(freight)}
                    className="flex items-center gap-2"
                  >
                    <MdOutlineEdit className="w-4 h-4" />
                    Editar
                  </Button>
                )}
                {onToggleStatus && freight.status !== 'inactive' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onToggleStatus(freight.id, 'inactive')}
                    className="flex items-center gap-2"
                  >
                    <MdOutlineCancel className="w-4 h-4" />
                    Desativar Frete
                  </Button>
                )}
                {onToggleStatus && freight.status === 'inactive' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onToggleStatus(freight.id, 'active')}
                    className="flex items-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Reativar Frete
                  </Button>
                )}
                {onToggleStatus && freight.status !== 'completed' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (ciotRecord?.status !== 'generated') {
                        const proceed = window.confirm(
                          'Este frete ainda não tem um CIOT registrado (obrigatório pela MP 1.343/2026). ' +
                          'Deseja concluir mesmo assim? Recomendamos registrar o CIOT antes de finalizar.'
                        );
                        if (!proceed) return;
                      }
                      onToggleStatus(freight.id, 'completed');
                    }}
                    className="flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Marcar como Concluído
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDelete(freight.id)}
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Excluir Frete
                  </Button>
                )}
                </>
              )}

              {/* Botões de avaliação para frete concluído */}
              {freight.status === 'completed' && canRate && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleOpenRatingDialog}
                  className="bg-[#253663] hover:bg-[#1a2847] text-white flex items-center gap-2"
                >
                  <Star className="w-4 h-4" />
                  Avaliar {ratingTarget?.targetType === 'caminhoneiro' ? 'Motorista' : 'Empresa'}
                </Button>
              )}
              {freight.status === 'completed' && hasAlreadyRated && (
                <Badge className="bg-green-100 text-green-700 border-green-300 px-3 py-1.5">
                  <Star className="w-3 h-3 mr-1 fill-current" />
                  Avaliação enviada
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="col-span-full space-y-6">

            {/* ✅ ANTT 2026 — Conformidade: CIOT, MDF-e, vale-pedágio e piso mínimo */}
            {(isOwnFreight || freight.acceptedDriverId === user?.id) && freight.status !== 'draft' && freight.status !== 'cancelled' && (
              <Card className="border-[#e5e7eb]">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="w-4 h-4 text-[#253663]" />
                    <h3 className="text-sm font-medium text-[#111827]">Conformidade ANTT</h3>
                  </div>

                  {freight.abaixoDoPiso && (
                    <div className="flex items-start gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg">
                      <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-red-700">
                        Valor abaixo do piso mínimo ANTT{freight.pisoMinimoValor ? ` (R$ ${freight.pisoMinimoValor.toFixed(2)})` : ''} — o CIOT não pode ser emitido enquanto o valor não for ajustado.
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* CIOT */}
                    <div className="border border-[#e5e7eb] rounded-lg p-3">
                      <p className="text-xs text-[#6b7280] mb-1">CIOT</p>
                      {ciotRecord?.status === 'generated' ? (
                        <>
                          <Badge className="bg-green-100 text-green-700 border-green-300 mb-1">Emitido</Badge>
                          <p className="text-xs text-[#111827] font-mono">{ciotRecord.ciotNumber}</p>
                        </>
                      ) : ciotRecord?.status === 'blocked_below_piso' ? (
                        <Badge className="bg-red-100 text-red-700 border-red-300">Bloqueado (abaixo do piso)</Badge>
                      ) : (
                        <>
                          <Badge variant="secondary" className="mb-2">Pendente</Badge>
                          {isOwnFreight && (
                            <Button size="sm" variant="outline" className="w-full text-xs h-7" onClick={() => setShowCiotDialog(true)}>
                              Registrar número do CIOT
                            </Button>
                          )}
                        </>
                      )}
                    </div>

                    {/* MDF-e */}
                    <div className="border border-[#e5e7eb] rounded-lg p-3">
                      <p className="text-xs text-[#6b7280] mb-1">MDF-e</p>
                      {mdfeRecord?.status === 'issued' ? (
                        <>
                          <Badge className="bg-green-100 text-green-700 border-green-300 mb-1">Emitido</Badge>
                          <p className="text-xs text-[#111827] font-mono">{mdfeRecord.numeroMdfe}</p>
                        </>
                      ) : (
                        <>
                          <Badge variant="secondary" className="mb-2">Não emitido</Badge>
                          {isOwnFreight && (
                            <Button size="sm" variant="outline" className="w-full text-xs h-7" onClick={() => setShowMdfeDialog(true)}>
                              Registrar número do MDF-e
                            </Button>
                          )}
                        </>
                      )}
                    </div>

                    {/* Vale-pedágio */}
                    <div className="border border-[#e5e7eb] rounded-lg p-3">
                      <p className="text-xs text-[#6b7280] mb-1">Vale-pedágio (FVPO)</p>
                      <Badge variant={valePedagioRecord?.status === 'registered' ? 'default' : 'secondary'} className={valePedagioRecord?.status === 'registered' ? 'bg-green-100 text-green-700 border-green-300' : ''}>
                        {valePedagioRecord ? VALE_PEDAGIO_PROVIDER_LABELS[valePedagioRecord.provider] : 'Pendente'}
                      </Badge>
                    </div>
                  </div>

                  <p className="text-xs text-[#9ca3af] mt-3">
                    Sem integração automática de CIOT/MDF-e contratada — registre aqui o número obtido junto ao provedor (Roadcard, TruckPad, FreteBras...) até a plataforma integrar diretamente.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Status and Type */}
            <div className="border-b border-gray-200 pb-8 mb-8">
              <div className="flex items-start justify-between mb-6 pb-6 border-b">
                <div className="space-y-3">
                  {/* Publicado por */}
                  {freight.customerName && (
                    <div>
                      <div className="text-xs text-muted-foreground">Publicado por</div>
                      <div className="text-sm font-medium text-foreground">{freight.customerName}</div>
                    </div>
                  )}

                    <div>
                      <div className="text-xs text-muted-foreground">Publicado em</div>
                      <div className="text-sm font-medium text-foreground">
                        {new Date(freight.createdAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </div>
                    </div>
                  </div>

                  {companyLogoUrl ? (
                    <div 
                      className="w-16 h-16 rounded-lg overflow-hidden bg-surface-100 border cursor-pointer hover:ring-2 hover:ring-primary transition-all self-center"
                      onClick={handleViewCompanyProfile}
                    >
                      <ImageWithFallback
                        src={companyLogoUrl}
                        alt={freight.customerName || 'Logo da empresa'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div 
                      className="w-16 h-16 rounded-lg bg-gradient-to-br from-primary to-primary/80 border flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-primary transition-all self-center"
                      onClick={handleViewCompanyProfile}
                    >
                      <span className="text-white font-bold text-2xl">
                        {(freight.customerName || 'E').charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Route Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-[#253663]" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-muted-foreground mb-1">Origem (Coleta)</div>
                      <div className="font-medium text-foreground">
                        {freight.origin.city && freight.origin.state 
                          ? `${freight.origin.city}, ${freight.origin.state}`
                          : freight.origin.city || freight.origin.state || 'Não informado'}
                      </div>
                      {freight.pickupDate && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-primary">
                          <Calendar className="w-4 h-4" />
                          <span>
                            Data: {new Date(freight.pickupDate).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                      )}
                      {(freight.origin.contactName || freight.origin.contactPhone) && (
                        <div className="mt-2 pt-2 border-t text-sm space-y-1">
                          <div className="text-xs text-muted-foreground mb-1">Contato para Coleta</div>
                          {freight.origin.contactName && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <User className="w-3 h-3" />
                              {freight.origin.contactName}
                            </div>
                          )}
                          {freight.origin.contactPhone && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Phone className="w-3 h-3" />
                              {freight.origin.contactPhone}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Navigation className="w-5 h-5 text-[#253663]" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-muted-foreground mb-1">Destino (Entrega)</div>
                      <div className="font-medium text-foreground">
                        {freight.destination.city && freight.destination.state 
                          ? `${freight.destination.city}, ${freight.destination.state}`
                          : freight.destination.city || freight.destination.state || 'Não informado'}
                      </div>
                      {(freight.deliveryDate || freight.deadline) && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-accent">
                          <Calendar className="w-4 h-4 text-[#253663]" />
                          <span className="text-[#253663]">
                            {freight.deliveryDate ? 'Data' : 'Prazo'}: {new Date(freight.deliveryDate || freight.deadline || '').toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                      )}
                      {(freight.destination.contactName || freight.destination.contactPhone) && (
                        <div className="mt-2 pt-2 border-t text-sm space-y-1">
                          <div className="text-xs text-muted-foreground mb-1">Contato para Entrega</div>
                          {freight.destination.contactName && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <User className="w-3 h-3" />
                              {freight.destination.contactName}
                            </div>
                          )}
                          {freight.destination.contactPhone && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Phone className="w-3 h-3" />
                              {freight.destination.contactPhone}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

            {/* Informações da Carga */}
            <div className="space-y-6">
              
              {/* 1️⃣ Valor e Pagamento */}
              <Card className="border border-gray-200 shadow-sm">
                <CardContent className="p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-5 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-[#253663]" />
                    Informações de Valor e Pagamento
                  </h2>
                  <div className="space-y-5">
                    <div className="bg-gradient-to-r from-[#253663] to-[#1a2847] p-5 rounded-lg text-white">
                      <div className="text-xs opacity-90 mb-2">Valor do Frete</div>
                      <div className="text-2xl font-bold">
                      {freight.price === 'A combinar' || !freight.price ? 'A combinar' : (() => {
                        const value = String(freight.price);
                        const cleanValue = value.replace(/R\$\s?/g, '').trim();
                        const numericValue = cleanValue.replace(/\./g, '').replace(',', '.');
                        const numValue = parseFloat(numericValue);
                        return !isNaN(numValue) ? numValue.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        }) : freight.price;
                      })()}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-3 rounded">
                        <div className="text-xs text-gray-500 mb-1">Tipo de Valor</div>
                        <div className="text-sm font-medium text-gray-900">
                          {freight.freightValueType ? 
                            (freight.freightValueType === 'known' ? 'Valor Informado' : 'A Negociar')
                            : 'Não informado'}
                        </div>
                      </div>
                      <div className="bg-gray-50 p-3 rounded">
                        <div className="text-xs text-gray-500 mb-1">Como Calcular o Frete</div>
                        <div className="text-sm font-medium text-gray-900">{freight.valueCalculation || 'Não informado'}</div>
                      </div>
                      <div className="bg-gray-50 p-3 rounded">
                        <div className="text-xs text-gray-500 mb-1">Forma de Pagamento</div>
                        <div className="text-sm font-medium text-gray-900">
                          {freight.paymentMethod || 'Não informado'}
                        </div>
                      </div>
                      <div className="bg-gray-50 p-3 rounded">
                        <div className="text-xs text-gray-500 mb-1">Pagamento Antecipado</div>
                        <div className="text-sm font-medium text-gray-900">
                          {freight.advancePayment || 'Não informado'}
                        </div>
                      </div>
                      <div className="col-span-full bg-gray-50 p-3 rounded">
                        <div className="text-xs text-gray-500 mb-1">Incluído no Pagamento</div>
                        <div className="text-sm font-medium text-gray-900">
                          {freight.paymentIncluded ? (
                            Array.isArray(freight.paymentIncluded) ? (
                              freight.paymentIncluded.length > 0 ? (
                                (() => {
                                  const items = freight.paymentIncluded.map((item: string) => {
                                    switch (item) {
                                      case 'fuel': return 'Combustível';
                                      case 'tolls': return 'Pedágios';
                                      case 'taxes': return 'Impostos';
                                      case 'insurance': return 'Seguro';
                                      default: return item;
                                    }
                                  });
                                  return items.join(', ');
                                })()
                              ) : 'Pagamento Separado'
                            ) : (
                              freight.paymentIncluded === 'included' ? 'Pedágio incluso' : 'Pagamento Separado'
                            )
                          ) : 'Não informado'}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* 2️⃣ Veículos e Carrocerias */}
              <Card className="border border-gray-200 shadow-sm">
                <CardContent className="p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-5 flex items-center gap-2">
                    <Truck className="w-5 h-5 text-[#253663]" />
                    Tipos de Veículos e Carrocerias Aceitos
                  </h2>
                  <div className="space-y-4">
                    {freight.truckType && (
                      <div className="bg-blue-50 border border-blue-200 p-4 rounded">
                        <div className="text-xs text-blue-600 font-medium mb-1">
                          Tipo de Veículo Principal
                        </div>
                        <div className="text-sm font-semibold text-blue-900">{freight.truckType}</div>
                      </div>
                    )}
                    {freight.selectedLightVehicles && freight.selectedLightVehicles.length > 0 && (
                      <div className="bg-gray-50 p-4 rounded">
                        <div className="text-xs text-gray-600 font-medium mb-2">
                          Veículos Leves Aceitos
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {freight.selectedLightVehicles.map((vehicle, idx) => (
                            <Badge key={idx} variant="outline" className="bg-white">
                              {vehicle}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {freight.selectedMediumVehicles && freight.selectedMediumVehicles.length > 0 && (
                      <div className="bg-gray-50 p-4 rounded">
                        <div className="text-xs text-gray-600 font-medium mb-2">
                          Veículos Médios Aceitos
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {freight.selectedMediumVehicles.map((vehicle, idx) => (
                            <Badge key={idx} variant="outline" className="bg-white">
                              {vehicle}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {freight.selectedHeavyVehicles && freight.selectedHeavyVehicles.length > 0 && (
                      <div className="bg-gray-50 p-4 rounded">
                        <div className="text-xs text-gray-600 font-medium mb-2">
                          Veículos Pesados Aceitos
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {freight.selectedHeavyVehicles.map((vehicle, idx) => (
                            <Badge key={idx} variant="outline" className="bg-white">
                              {vehicle}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {((freight.selectedLightVehicles?.length || freight.selectedMediumVehicles?.length || freight.selectedHeavyVehicles?.length) && 
                      (freight.selectedClosedTrailers?.length || freight.selectedOpenTrailers?.length || freight.selectedSpecialTrailers?.length)) && (
                      <div className="border-t border-gray-200"></div>
                    )}

                    {freight.selectedClosedTrailers && freight.selectedClosedTrailers.length > 0 && (
                      <div className="bg-gray-50 p-4 rounded">
                        <div className="text-xs text-gray-600 font-medium mb-2">
                          Carrocerias Fechadas Aceitas
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {freight.selectedClosedTrailers.map((trailer, idx) => (
                            <Badge key={idx} variant="outline" className="bg-white">
                              {trailer}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {freight.selectedOpenTrailers && freight.selectedOpenTrailers.length > 0 && (
                      <div className="bg-gray-50 p-4 rounded">
                        <div className="text-xs text-gray-600 font-medium mb-2">
                          Carrocerias Abertas Aceitas
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {freight.selectedOpenTrailers.map((trailer, idx) => (
                            <Badge key={idx} variant="outline" className="bg-white">
                              {trailer}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {freight.selectedSpecialTrailers && freight.selectedSpecialTrailers.length > 0 && (
                      <div className="bg-gray-50 p-4 rounded">
                        <div className="text-xs text-gray-600 font-medium mb-2">
                          Carrocerias Especiais Aceitas
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {freight.selectedSpecialTrailers.map((trailer, idx) => (
                            <Badge key={idx} variant="outline" className="bg-white">
                              {trailer}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              {/* 3️⃣ Dados da Carga */}
              <Card className="border border-gray-200 shadow-sm">
                <CardContent className="p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-5 flex items-center gap-2">
                    <Package className="w-5 h-5 text-[#253663]" />
                    Dados da Carga
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {freight.product && (
                      <div className="bg-gray-50 p-3 rounded">
                        <div className="text-xs text-gray-500 mb-1">Produto Transportado</div>
                        <div className="text-sm font-medium text-gray-900">{freight.product}</div>
                      </div>
                    )}

                    {freight.species && (
                      <div className="bg-gray-50 p-3 rounded">
                        <div className="text-xs text-gray-500 mb-1">Espécie da Carga</div>
                        <div className="text-sm font-medium text-gray-900">{freight.species}</div>
                      </div>
                    )}

                    <div className="bg-gray-50 p-3 rounded">
                      <div className="text-xs text-gray-500 mb-1">Tipo de Carga</div>
                      <div className="text-sm font-medium text-gray-900">
                        {typeof freight.cargo === 'string' ? freight.cargo : freight.cargo.type}
                      </div>
                    </div>

                    {freight.occupancyType && (
                      <div className="bg-gray-50 p-3 rounded">
                        <div className="text-xs text-gray-500 mb-1">Ocupação do Veículo</div>
                        <div className="text-sm font-medium text-gray-900">
                          {freight.occupancyType === 'completa' ? 'Carga Completa' : 'Carga Complemento'}
                        </div>
                      </div>
                    )}

                    <div className="bg-gray-50 p-3 rounded">
                      <div className="text-xs text-gray-500 mb-1">Peso Total</div>
                      <div className="text-sm font-medium text-gray-900">
                        {freight.weight}
                      </div>
                    </div>

                    {freight.volumes && (
                      <div className="bg-gray-50 p-3 rounded">
                        <div className="text-xs text-gray-500 mb-1">Volumes</div>
                        <div className="text-sm font-medium text-gray-900">
                          {freight.volumes} {freight.volumeUnit || 'unidades'}
                        </div>
                      </div>
                    )}

                    <div className="bg-gray-50 p-3 rounded">
                      <div className="text-xs text-gray-500 mb-1">Categoria</div>
                      <div className="text-sm font-medium text-gray-900">{freight.category}</div>
                    </div>

                    {freight.urgencyType && (
                      <div className="bg-gray-50 p-3 rounded">
                        <div className="text-xs text-gray-500 mb-1">Urgência</div>
                        <div className="text-sm font-medium text-gray-900">
                          <span className={freight.urgencyType === 'urgent' ? 'text-red-600 font-semibold' : ''}>
                            {getUrgencyText(freight.urgencyType)}
                          </span>
                        </div>
                      </div>
                    )}

                    {freight.urgencyType === 'scheduled' && freight.scheduledDate && (
                      <div className="bg-gray-50 p-3 rounded">
                        <div className="text-xs text-gray-500 mb-1">Data Agendada</div>
                        <div className="text-sm font-medium text-gray-900">
                          {new Date(freight.scheduledDate).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Requirements/Features */}
                  {(freight.needsCover !== undefined || freight.needsTracker !== undefined || freight.isInsured !== undefined) && (
                    <div className="mt-5 pt-5 border-t border-gray-100">
                      <div className="text-sm font-medium text-gray-700 mb-3">
                        Requisitos da Carga
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {freight.needsCover && (
                          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                            Necessita Lona
                          </Badge>
                        )}
                        {freight.needsTracker && (
                          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                            Requer Rastreador
                          </Badge>
                        )}
                        {freight.isInsured && (
                          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                            Carga Segurada
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {freight.hasAdditionalCargo && freight.additionalCargoDetails && (
                    <div className="mt-5 pt-5 border-t border-gray-100">
                      <div className="text-sm font-medium text-gray-700 mb-2">
                        Carga Adicional
                      </div>
                      <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                        {freight.additionalCargoDetails}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {freight.observations && (
                <Card className="border border-gray-200 shadow-sm">
                  <CardContent className="p-6">
                    <h3 className="text-base font-medium text-gray-900 mb-3">
                      Observações sobre a Carga
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {freight.observations}
                    </p>
                  </CardContent>
                </Card>
              )}

              {responsibleContacts && responsibleContacts.length > 0 && (
                <Card className="border border-gray-200 shadow-sm">
                  <CardContent className="p-6">
                    <h3 className="text-base font-medium text-gray-900 mb-4 flex items-center gap-2">
                      <Phone className="w-5 h-5 text-[#253663]" />
                      Contato responsável pelo frete
                    </h3>
                    <div className="space-y-3">
                      {responsibleContacts.map((contact: any, idx: number) => (
                        <div key={contact.id || idx} className={`flex items-center gap-3 p-3 rounded-lg ${contact.isMainContact ? 'bg-[#f0f4ff] border border-[#253663]/20' : 'bg-gray-50'}`}>
                          <div className="w-9 h-9 rounded-full bg-[#253663]/10 flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-[#253663]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-gray-900 truncate">{contact.name}</p>
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5">
                              {contact.phone && <p className="text-xs text-gray-500">{contact.phone}</p>}
                              {contact.email && <p className="text-xs text-gray-500">{contact.email}</p>}
                            </div>
                          </div>
                          {contact.phone && (
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                onClick={() => handleCopyPhone(contact.phone)}
                                className="p-2 rounded-full hover:bg-gray-200 transition-colors"
                                title="Copiar número"
                              >
                                <Copy className="w-4 h-4 text-gray-500" />
                              </button>
                              <button
                                onClick={() => handleContactWhatsApp(contact.phone)}
                                className="p-2 rounded-full hover:bg-green-100 transition-colors"
                                title="Enviar mensagem via WhatsApp"
                              >
                                <FaWhatsapp className="w-4 h-4 text-green-600" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* 4️⃣ Dimensões e Medidas */}
              <Card className="border border-gray-200 shadow-sm">
                <CardContent className="p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-5 flex items-center gap-2">
                    <Maximize className="w-5 h-5 text-[#253663]" />
                    Dimensões e Medidas
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="text-xs text-gray-500 mb-1">Comprimento</div>
                      <div className="text-sm font-medium text-gray-900">
                        {freight.length || 'Não informado'}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="text-xs text-gray-500 mb-1">Largura</div>
                      <div className="text-sm font-medium text-gray-900">
                        {freight.width || 'Não informado'}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="text-xs text-gray-500 mb-1">Altura</div>
                      <div className="text-sm font-medium text-gray-900">
                        {freight.height || 'Não informado'}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="text-xs text-gray-500 mb-1">Peso Cúbico</div>
                      <div className="text-sm font-medium text-gray-900">
                        {freight.cubicWeight || 'Não informado'}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="text-xs text-gray-500 mb-1">Metros Cúbicos Totais</div>
                      <div className="text-sm font-medium text-gray-900">
                        {freight.totalCubicMeters || 'Não informado'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
      </div>

      {/* Company Profile Sheet */}
      <UnifiedUserProfileSheet
        open={showCompanyProfile}
        onOpenChange={setShowCompanyProfile}
        profile={companyProfile}
        showContactButton={true}
        currentUser={user ? { id: resolvedCompanyId, name: displayName } : undefined}
      />
      
      {/* Rating Dialog */}
      {ratingTarget && user && (
        <RatingDialog
          open={showRatingDialog}
          onOpenChange={setShowRatingDialog}
          freightId={freight.id}
          freightCode={freight.freight_code}
          targetId={ratingTarget.targetId}
          targetName={ratingTarget.targetName}
          targetType={ratingTarget.targetType}
          evaluatorId={resolvedCompanyId}
          evaluatorName={displayName}
          evaluatorType={(user as any).userType || 'caminhoneiro'}
          onRatingSubmitted={() => {
            setHasAlreadyRated(true);
            setCanRate(false);
            toast.success('Obrigado pela avaliação!');
          }}
        />
      )}

      {/* ✅ ANTT 2026 — Registrar número do CIOT obtido fora da plataforma */}
      <Dialog open={showCiotDialog} onOpenChange={setShowCiotDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar CIOT</DialogTitle>
            <DialogDescription>
              Informe o número do CIOT gerado junto a um provedor autorizado (Roadcard, TruckPad, FreteBras, Repom...).
              A plataforma ainda não emite o CIOT automaticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="ciot-number">Número do CIOT</Label>
              <Input
                id="ciot-number"
                value={ciotNumberInput}
                onChange={(e) => setCiotNumberInput(e.target.value)}
                placeholder="Ex: 000000000000"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCiotDialog(false)} disabled={savingCompliance}>Cancelar</Button>
            <Button onClick={handleConfirmCiotNumber} disabled={savingCompliance} className="bg-[#253663] hover:bg-[#1a2847] text-white">
              {savingCompliance ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ✅ ANTT 2026 — Registrar número do MDF-e obtido fora da plataforma */}
      <Dialog open={showMdfeDialog} onOpenChange={setShowMdfeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar MDF-e</DialogTitle>
            <DialogDescription>
              Informe o número do Manifesto Eletrônico de Documentos Fiscais emitido para esta viagem.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="mdfe-number">Número do MDF-e</Label>
              <Input
                id="mdfe-number"
                value={mdfeNumberInput}
                onChange={(e) => setMdfeNumberInput(e.target.value)}
                placeholder="Ex: 35260000000000000000000000000000000000000000"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMdfeDialog(false)} disabled={savingCompliance}>Cancelar</Button>
            <Button onClick={handleConfirmMdfeNumber} disabled={savingCompliance} className="bg-[#253663] hover:bg-[#1a2847] text-white">
              {savingCompliance ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </div>
      </div>
    </div>
  );
}