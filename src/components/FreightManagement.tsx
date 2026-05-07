import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { formatLocationSlash, formatLocation, isValidLocation, isSameLocation } from '../utils/location-helpers';
import { validateFreights } from '../utils/freight-validator';
import { 
  Search, 
  Settings, 
  Download, 
  MoreHorizontal, 
  Eye, 
  Plus, 
  Filter,
  RefreshCw,
  Edit,
  Share,
  FileText,
  Trash2,
  MapPin,
  Package,
  Truck,
  Users,
  Play,
  Pause,
  CheckCircle,
  Clock,
  AlertCircle,
  Star,
  Calendar,
  DollarSign,
  Phone,
  ArrowLeft,
  Navigation,
  UserCheck,
  X,
  Sliders,
  Building2,
  User as UserIcon,
  ArrowDown,
  Send,
  PackageCheck,
  ChevronDown,
  ChevronUp,
  ChevronRight
} from 'lucide-react';
import { FaWhatsapp, FaTruck } from "react-icons/fa";
import { MdOutlineCancel, MdOutlineEdit } from "react-icons/md";
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from './ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';
import { FreightRegistration } from './FreightRegistration';
// FreightDetailScreen is now rendered by /fretes/:id route
import { AddPreferredRoute } from './AddPreferredRoute';
import { AllFreightsCard } from './AllFreightsCard';
import { FreightCardMotorista } from './FreightCardMotorista';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { motion } from 'motion/react';
import { toast } from 'sonner@2.0.3';
import { ImageWithFallback } from './ImageWithFallback';
import type { User as AppUser } from './contexts/AppContext';
import { useFreights as useFreightsAPI } from '../utils/hooks/useFreights';
import type { Freight as APIFreight } from '../utils/hooks/useFreights';
import { useCollaboratorPermissions } from '../utils/hooks/useCollaboratorPermissions';
import { database } from '../utils/database';
import { LoadingSpinner } from './LoadingSpinner';
import { CityAutocomplete } from './CityAutocomplete';
import { FreightFilters, initialFiltersState, FreightFiltersState } from './freight/FreightFilters';
import { AvailabilityCountdown } from './AvailabilityCountdown';
import { NearbyDriversScreen } from './NearbyDriversScreen';

import { getAvatarUrl } from '../utils/storage-helper';
import { generateDeepLinkUrl } from '../utils/deep-link';

interface Freight {
  id: string;
  freight_code?: string; // Código único no padrão placa brasileira (AAA0A00)
  type: 'plus' | 'regular';
  exposureLevel: 'Alta exposição' | 'Média exposição' | 'Baixa exposição';
  origin: {
    city: string;
    state: string;
  };
  destination: {
    city: string;
    state: string;
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
  acceptedQuoteId?: string;
  acceptedQuoteValue?: string; // ✅ ADICIONADO: Valor da cotação aceita
  publisherPhone?: string; // ✅ ADICIONADO: Telefone da empresa para WhatsApp
  driver?: {
    id: string;
    name: string;
    phone: string;
    rating: number;
  };
  value?: number;
  deadline?: string;
  observations?: string;
  priority: 'low' | 'medium' | 'high';
  requiresTracking?: boolean;
  publisherType?: string;
  pickupDate?: string;
  deliveryDate?: string;
  // ✅ CAMPOS ADICIONAIS DO FORMULÁRIO
  product?: string;
  species?: string;
  cargoType?: string;
  occupancyType?: 'completa' | 'complemento';
  volumes?: number;
  volumeUnit?: string;
  needsCover?: boolean;
  needsTracker?: boolean;
  isInsured?: boolean;
  cubicWeight?: number;
  totalCubicMeters?: number;
  length?: number;
  width?: number;
  height?: number;
  selectedLightVehicles?: string[];
  selectedMediumVehicles?: string[];
  selectedHeavyVehicles?: string[];
  selectedClosedTrailers?: string[];
  selectedOpenTrailers?: string[];
  selectedSpecialTrailers?: string[];
  freightValueType?: string;
  valueCalculation?: string;
  paymentIncluded?: boolean;
  paymentMethod?: string;
  advancePayment?: number;
  urgencyType?: string;
  scheduledDate?: string;
  hasAdditionalCargo?: boolean;
  additionalCargoDetails?: string;
}

// Sistema usa apenas dados reais do banco de dados - sem dados demo
// Dados mock removidos - o sistema agora usa exclusivamente dados do banco de dados

// Função para gerar código de frete no padrão de placa brasileira Mercosul (AAA0A00) - FALLBACK
const generateFreightCode = (id: string): string => {
  const chars = id.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  
  // Extrai caracteres para formar o padrão AAA0A00
  const letters = chars.replace(/[0-9]/g, ''); // Apenas letras
  const numbers = chars.replace(/[A-Z]/g, '');  // Apenas números
  
  // Garante que temos caracteres suficientes
  const l1 = letters[0] || 'A';
  const l2 = letters[1] || 'B';
  const l3 = letters[2] || 'C';
  const l4 = letters[3] || 'D';
  const n1 = numbers[0] || '0';
  const n2 = numbers[1] || '0';
  const n3 = numbers[2] || '0';
  
  // Retorna no formato #AAA0A00
  return `#${l1}${l2}${l3}${n1}${l4}${n2}${n3}`;
};

interface FreightManagementProps {
  user: AppUser;
  initialTab?: 'list' | 'create';
  onNavigateToChat?: (freightId: string, freightData?: any) => void;
  onOpenChat?: (userId: string, userName: string) => void;
  initialFreightForQuote?: string | null;
  shouldOpenFreightForm?: boolean;
  setShouldOpenFreightForm?: (value: boolean) => void;
  initialView?: 'my-freights' | 'all-freights';
  selectedFreightId?: string | null;
}

export function FreightManagement({ 
  user, 
  initialTab = 'list', 
  onNavigateToChat,
  onOpenChat,
  initialFreightForQuote,
  shouldOpenFreightForm = false,
  setShouldOpenFreightForm,
  initialView,
  selectedFreightId
}: FreightManagementProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'draft' | 'active' | 'scheduled' | 'contracted' | 'completed' | 'inactive'>('all');
  const [activeTab, setActiveTab] = useState(initialTab);
  
  // Determinar viewMode inicial
  const getInitialViewMode = (): 'my-freights' | 'all-freights' => {
    // Se initialView foi passado, usar ele
    if (initialView) return initialView;
    // Senão, motoristas iniciam com 'all-freights', outros usuários com 'my-freights'
    return user.userType === 'caminhoneiro' ? 'all-freights' : 'my-freights';
  };
  
  const [viewMode, setViewMode] = useState<'my-freights' | 'all-freights' | 'quotes'>(getInitialViewMode());
  const [selectedFreights, setSelectedFreights] = useState<string[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState<string[] | null>(null);
  const [showEditDialog, setShowEditDialog] = useState<string | null>(null);
  const [freightToEdit, setFreightToEdit] = useState<Freight | null>(null);

  // Navigation to /fretes/:id handles freight detail view
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showQuoteDialog, setShowQuoteDialog] = useState<{ freight: Freight; proposedPrice: string } | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [freightForQuote, setFreightForQuote] = useState<string | null>(null);
  const [preferredRoutes, setPreferredRoutes] = useState<any[]>([]);
  const [showAddPreferredRoute, setShowAddPreferredRoute] = useState(false);
  
  // Estados para disponibilidade de motorista
  const [isAvailable, setIsAvailable] = useState(false);
  const [currentLocation, setCurrentLocation] = useState({ city: '', state: '' });
  const [availabilityExpiry, setAvailabilityExpiry] = useState<Date | null>(null);
  const [showLocationSearch, setShowLocationSearch] = useState(false);
  
  // Estado para seção de fretes concluídos (colapsável)
  const [showCompletedSection, setShowCompletedSection] = useState(false);
  
  // Estados para tela de motoristas próximos
  const [showNearbyDrivers, setShowNearbyDrivers] = useState(false);
  const [nearbyDriversFreight, setNearbyDriversFreight] = useState<Freight | null>(null);
  
  // Verificação de permissões para colaboradores
  const permissions = useCollaboratorPermissions(user?.id || '');
  
  // ✅ Resolver companyId: se for colaborador, usar o companyId da empresa vinculada
  const resolvedCompanyId = user?.collaborator?.companyId || user?.id || '';
  const isCollaborator = !!user?.collaborator;
  const displayName = isCollaborator ? (user?.collaborator?.companyName || user.name) : user.name;
  
  // Integração com API real do backend
  const { 
    freights: apiFreights, 
    loading: loadingFreights, 
    createFreight, 
    updateFreight, 
    deleteFreight,
    loadFreights 
  } = useFreightsAPI();
  
  // 🔄 Listener para recarregar fretes quando uma cotação é aceita
  React.useEffect(() => {
    const handleFreightsUpdate = () => {
      loadFreights();
    };
    
    window.addEventListener('freights-updated', handleFreightsUpdate);
    
    return () => {
      window.removeEventListener('freights-updated', handleFreightsUpdate);
    };
  }, [loadFreights]);
  
  // 📝 Abrir formulário de criação de frete quando solicitado
  React.useEffect(() => {
    if (shouldOpenFreightForm) {
      setActiveTab('create');
      if (setShouldOpenFreightForm) {
        setShouldOpenFreightForm(false);
      }
    }
  }, [shouldOpenFreightForm, setShouldOpenFreightForm]);
  
  // 🔄 Atualizar viewMode quando initialView mudar
  React.useEffect(() => {
    if (initialView) {
      setViewMode(initialView);
    }
  }, [initialView]);
  
  // 👁️ Navegar para detalhes automaticamente quando selectedFreightId for passado
  React.useEffect(() => {
    if (selectedFreightId) {
      navigate(`/fretes/${selectedFreightId}`, { replace: true });
    }
  }, [selectedFreightId, navigate]);

  // ✏️ Abrir edição quando vindo de /fretes/:id via editFreightId no state de navegação
  React.useEffect(() => {
    const editFreightId = location.state?.editFreightId;
    if (!editFreightId || !apiFreights.length) return;
    const freight = apiFreights.find((f: Freight) => f.id === editFreightId);
    if (freight) {
      handleEditFreight(freight);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, apiFreights]);

  // 🚛 Carregar disponibilidade do motorista
  React.useEffect(() => {
    if (user && user.id && user.userType === 'caminhoneiro') {
      const loadDriverAvailability = async () => {
        const availability = await database.getDriverAvailability(user.id);

        if (availability) {
          setIsAvailable(availability.isAvailable);
          // ✅ SOLUÇÃO: Verificação defensiva para evitar null
          const loc = availability.location || { city: '', state: '' };
          setCurrentLocation(loc);
          setAvailabilityExpiry(availability.expiresAt ? new Date(availability.expiresAt) : null);

          // Solicitar localização/disponibilidade se motorista não estiver ativo
          if (!availability.isAvailable) {
            setTimeout(() => setShowLocationSearch(true), 800);
          }
        } else {
          // Nenhum registro de disponibilidade ainda — pedir localização
          setTimeout(() => setShowLocationSearch(true), 800);
        }
      };
      loadDriverAvailability();
    }
  }, [user?.id, user?.userType]);
  
  // ⏰ Verificar expiração da disponibilidade
  React.useEffect(() => {
    if (!isAvailable || !availabilityExpiry || !user?.id) return;
    
    const checkExpiry = setInterval(() => {
      if (new Date() > availabilityExpiry) {
        setIsAvailable(false);
        setAvailabilityExpiry(null);
        database.updateDriverAvailability(user.id, {
          isAvailable: false,
          location: currentLocation,
          expiresAt: null
        });
        toast.info('Sua disponibilidade expirou após 24 horas');
        setShowLocationSearch(true);
      }
    }, 60000); // Verificar a cada minuto
    
    return () => clearInterval(checkExpiry);
  }, [isAvailable, availabilityExpiry, user?.id, currentLocation]);
  
  // 📍 Função para atualizar disponibilidade
  const toggleAvailability = async () => {
    if (!user || !user.id) {
      toast.error('Você precisa estar logado para atualizar disponibilidade');
      return;
    }
    
    if (!isAvailable && (!currentLocation?.city || !currentLocation?.state)) {
      setShowLocationSearch(true);
      toast.info('Defina sua localização primeiro');
      return;
    }
    
    const newAvailability = !isAvailable;
    const expiryDate = newAvailability ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null; // 24 horas
    
    // [REVISAR] console.log('🔄 [toggleAvailability] Atualizando disponibilidade:', {
    // userId: user.id,
    // newAvailability,
    // currentLocation,
    // expiryDate: expiryDate?.toISOString()
    // });
    
    try {
      const result = await database.updateDriverAvailability(user.id, {
        isAvailable: newAvailability,
        location: currentLocation,
        expiresAt: expiryDate?.toISOString() || null
      });
      
      
      if (result.success) {
        setIsAvailable(newAvailability);
        setAvailabilityExpiry(expiryDate);
        
        toast.success(newAvailability 
          ? `✅ Disponível em ${currentLocation?.city}, ${currentLocation?.state} por 24h` 
          : 'Disponibilidade desativada'
        );
      } else {
        toast.error('Erro ao atualizar: ' + (result.error || 'Erro desconhecido'));
        console.error('❌ [toggleAvailability] Erro:', result.error);
      }
    } catch (error) {
      toast.error('Erro ao atualizar disponibilidade');
      console.error('❌ [toggleAvailability] Exception:', error);
    }
  };

  // 🔄 Função para renovar disponibilidade (mais 24h)
  const renewAvailability = async () => {
    if (!user || !user.id) {
      toast.error('Você precisa estar logado para renovar disponibilidade');
      return;
    }
    
    if (!currentLocation?.city || !currentLocation?.state) {
      toast.error('Localização não definida');
      return;
    }

    const newExpiryDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Mais 24 horas

    try {
      const result = await database.updateDriverAvailability(user.id, {
        isAvailable: true,
        location: currentLocation,
        expiresAt: newExpiryDate.toISOString()
      });

      if (result.success) {
        setIsAvailable(true);
        setAvailabilityExpiry(newExpiryDate);
        toast.success('Disponibilidade renovada por mais 24h');
      } else {
        toast.error('Erro ao renovar: ' + (result.error || 'Erro desconhecido'));
      }
    } catch (error) {
      toast.error('Erro ao renovar disponibilidade');
      console.error('Erro ao renovar availability:', error);
    }
  };
  
  // 📍 Função para atualizar localização
  const updateLocation = async (city: string, state: string) => {
    if (!user || !user.id) {
      toast.error('Você precisa estar logado para atualizar localização');
      return;
    }
    
    setCurrentLocation({ city, state });
    // ❌ NÃO fechar o diálogo aqui - deixar o botão "Confirmar" fazer isso
    
    // Sempre atualizar no Supabase, independente do status de disponibilidade
    try {
      const updateData = {
        isAvailable,
        location: { city, state },
        expiresAt: availabilityExpiry?.toISOString() || null
      };
      
      const result = await database.updateDriverAvailability(user.id, updateData);
      
      if (result.success) {
        // ✅ Toast de confirmação foi movido para o botão "Confirmar"
      } else {
        toast.error('Erro ao sincronizar: ' + (result.error || 'Erro desconhecido'));
        console.error('Erro ao atualizar localização:', result.error);
      }
    } catch (error) {
      toast.error('Erro ao atualizar localização');
      console.error('Exceção ao atualizar localização:', error);
    }
  };
  
  // Separar fretes próprios de todos os fretes
  const myFreights = React.useMemo(() => {
    if (user.userType === 'caminhoneiro') {
      return [];
    }
    
    return apiFreights.filter(f => f.userId === resolvedCompanyId || f.customerId === resolvedCompanyId);
  }, [apiFreights, resolvedCompanyId, user.userType]);
  
  const allFreights = React.useMemo(() => {
    if (user.userType === 'caminhoneiro') {
      // Motoristas veem fretes publicados e ativos (não veem rascunhos, cancelados, concluídos, inativos ou agendados)
      const filtered = apiFreights.filter(f => 
        f.status === 'publicado' || 
        f.status === 'active' || 
        f.status === 'em_cotacao'
      );
      return filtered;
    }
    
    // 🔒 REGRA: "Todos os Fretes" NUNCA exibe fretes inativos, concluídos ou agendados
    // Fretes agendados aparecem APENAS em "Meus Fretes"
    const filtered = apiFreights.filter(f => 
      f.status !== 'inactive' && 
      f.status !== 'concluido' && 
      f.status !== 'completed' && 
      f.status !== 'scheduled'
    );
    
    // 🔍 DEBUG: Verificar se companyLogo está presente
    // [REVISAR] console.log('🖼️ [FreightManagement] Verificando companyLogo nos fretes:', {
    // total: apiFreights.length,
    // withLogo: apiFreights.filter(f => f.companyLogo).length,
    // sample: apiFreights.slice(0, 2).map(f => ({
    // id: f.id.substring(0, 8),
    // hasLogo: !!f.companyLogo,
    // logoPreview: f.companyLogo?.substring(0, 50)
    // }))
    // });
    
    // [REVISAR] console.log('📦 Fretes disponíveis em "Todos os Fretes":', {
    // total: apiFreights.length,
    // filtered: filtered.length,
    // inactiveCount: apiFreights.filter(f => f.status === 'inactive').length,
    // inactiveExcluidos: apiFreights.filter(f => f.status === 'inactive').map(f => ({
    // id: f.id,
    // origin: formatLocationSlash(f.origin),
    // destination: formatLocationSlash(f.destination),
    // userId: f.userId
    // }))
    // });
    
    return filtered;
  }, [apiFreights, user.userType, user.id, resolvedCompanyId]);
  
  const loadingMyFreights = loadingFreights;
  const loadingAllFreights = loadingFreights;
  const refreshMyFreights = loadFreights;
  const refreshAllFreights = loadFreights;
  
  // Carregar rotas de preferência para motoristas
  React.useEffect(() => {
    const loadPreferredRoutes = async () => {
      if (user.userType === 'caminhoneiro') {
        const response = await database.preferredRoutes.getActiveByDriver(user.id);
        if (response.success && response.data) {
          setPreferredRoutes(response.data);
        }
      }
    };
    loadPreferredRoutes();
  }, [user.id, user.userType]);
  
  // 🔍 Debug: Verificar quantos fretes foram carregados (desabilitado)
  // React.useEffect(() => {
  //   console.log('📊 Fretes carregados:', {
  //     viewMode,
  //     userType: user.userType,
  //     apiFreightsCount: apiFreights.length,
  //     myFreightsCount: myFreights.length,
  //     allFreightsCount: allFreights.length,
  //     loading: viewMode === 'my-freights' ? loadingMyFreights : loadingAllFreights,
  //     apiFreightsStatus: apiFreights.map(f => ({ id: f.id, status: f.status, origin: `${f.origin.city}/${f.origin.state}` }))
  //   });
  // }, [viewMode, myFreights.length, allFreights.length, loadingMyFreights, loadingAllFreights, apiFreights, user.userType]);

  // Limpar freightForQuote quando sair do modo de cotações
  React.useEffect(() => {
    if (viewMode !== 'quotes') {
      setFreightForQuote(null);
    }
    // Motoristas não podem acessar gestão de cotações - redirecionar para all-freights
    if (viewMode === 'quotes' && user.userType === 'caminhoneiro') {
      setViewMode('all-freights');
      toast.error('Motoristas não têm acesso à gestão de cotações');
    }
  }, [viewMode, user.userType]);

  // Lidar com frete inicial para cotação vindo de fora
  // Motoristas não podem acessar gestão de cotações
  React.useEffect(() => {
    if (initialFreightForQuote && user.userType !== 'caminhoneiro') {
      setFreightForQuote(initialFreightForQuote);
      setViewMode('quotes');
    }
  }, [initialFreightForQuote, user.userType]);
  
  // Converter APIFreight para Freight local (compatibilidade com interface existente)
  const convertAPIToLocalFreight = React.useCallback((apiFreight: APIFreight): Freight => {
    // Mapear status do backend para status local
    const statusMap: Record<APIFreight['status'], Freight['status']> = {
      'rascunho': 'draft',
      'publicado': 'active',
      'em_cotacao': 'active',
      'em_andamento': 'in-transit',
      'concluido': 'completed',
      'cancelado': 'cancelled',
      'inactive': 'inactive',
      'scheduled': 'scheduled',
      'active': 'active',
      'draft': 'draft',              // ✅ ADICIONADO: draft permanece draft
      'completed': 'completed',      // ✅ ADICIONADO: completed permanece completed
      'in-transit': 'in-transit',    // ✅ ADICIONADO: in-transit permanece in-transit
      'contracted': 'contracted',    // ✅ ADICIONADO: contracted permanece contracted
      'cancelled': 'cancelled',      // ✅ ADICIONADO: cancelled permanece cancelled
    };
    
    return {
      id: apiFreight.id,
      type: 'regular' as const,
      exposureLevel: 'Média exposição' as const,
      origin: apiFreight.origin,
      destination: apiFreight.destination,
      cargo: apiFreight.cargo?.type || 'Carga geral',
      weight: apiFreight.weight || (apiFreight.cargo?.weight ? `${apiFreight.cargo.weight} kg` : 'A definir'),
      truckType: apiFreight.truckType || apiFreight.vehicleType || 'Truck',
      category: apiFreight.category || apiFreight.trailerType || 'Carga geral',
      status: statusMap[apiFreight.status] || 'active',
      price: apiFreight.price || (apiFreight.estimatedPrice ? `R$ ${apiFreight.estimatedPrice.toLocaleString('pt-BR')}` : 'A combinar'),
      createdAt: apiFreight.createdAt,
      updatedAt: apiFreight.updatedAt,
      customerId: apiFreight.customerId,
      customerName: apiFreight.customerName,
      companyLogo: apiFreight.companyLogo, // ✅ ADICIONADO: Logo da empresa
      publisherPhone: apiFreight.publisherPhone, // ✅ ADICIONADO: Telefone da empresa
      observations: apiFreight.observations,
      priority: 'medium' as const,
      deadline: apiFreight.deliveryDate,
      value: apiFreight.estimatedPrice,
      requiresTracking: apiFreight.needsTracker || false,
      publisherType: (apiFreight as any).metadata?.publisherType || 'embarcador',
      // ✅ CAMPOS ADICIONAIS DO FORMULÁRIO - PRESERVAR TUDO
      pickupDate: apiFreight.pickupDate,
      deliveryDate: apiFreight.deliveryDate,
      product: apiFreight.product,
      species: apiFreight.species,
      cargoType: apiFreight.cargoType,
      occupancyType: apiFreight.occupancyType,
      volumes: apiFreight.volumes,
      volumeUnit: apiFreight.volumeUnit,
      needsCover: apiFreight.needsCover,
      needsTracker: apiFreight.needsTracker,
      isInsured: apiFreight.isInsured,
      cubicWeight: apiFreight.cubicWeight,
      totalCubicMeters: apiFreight.totalCubicMeters,
      length: apiFreight.length,
      width: apiFreight.width,
      height: apiFreight.height,
      selectedLightVehicles: apiFreight.selectedLightVehicles,
      selectedMediumVehicles: apiFreight.selectedMediumVehicles,
      selectedHeavyVehicles: apiFreight.selectedHeavyVehicles,
      selectedClosedTrailers: apiFreight.selectedClosedTrailers,
      selectedOpenTrailers: apiFreight.selectedOpenTrailers,
      selectedSpecialTrailers: apiFreight.selectedSpecialTrailers,
      freightValueType: apiFreight.freightValueType,
      valueCalculation: apiFreight.valueCalculation,
      paymentIncluded: apiFreight.paymentIncluded,
      paymentMethod: apiFreight.paymentMethod,
      advancePayment: apiFreight.advancePayment,
      urgencyType: apiFreight.urgencyType,
      scheduledDate: apiFreight.scheduledDate,
      hasAdditionalCargo: apiFreight.hasAdditionalCargo,
      additionalCargoDetails: apiFreight.additionalCargoDetails,
    };
  }, []);
  
  // Selecionar fonte de dados baseado no viewMode
  const freights = React.useMemo(() => {
    if (viewMode === 'my-freights') {
      return myFreights.map(convertAPIToLocalFreight);
    }
    return allFreights.map(convertAPIToLocalFreight);
  }, [viewMode, myFreights, allFreights, convertAPIToLocalFreight]);
  
  const loading = viewMode === 'my-freights' ? loadingMyFreights : loadingAllFreights;
  
  // Estados para filtros avançados
  const [freightFilters, setFreightFilters] = useState<FreightFiltersState>(initialFiltersState);
  
  // Labels para os campos de cidade com autocomplete
  const [originCityLabel, setOriginCityLabel] = useState('');
  const [destinationCityLabel, setDestinationCityLabel] = useState('');

  // Verificar se o usuário pode gerenciar fretes
  // Se não for colaborador (owner), tem todas as permissões
  // Se for colaborador, precisa ter a permissão específica
  const canManageFreights = user.userType !== 'caminhoneiro' && 
    (permissions.loading || !permissions.collaborator || permissions.hasPermission('create_freight'));
  
  // Para motoristas, forçar visualização de todos os fretes
  React.useEffect(() => {
    if (user.userType === 'caminhoneiro') {
      setViewMode('all-freights');
    }
  }, [user.userType]);
  
  // Verificar se um frete corresponde a uma rota preferida
  const isPreferredRoute = (freight: Freight): boolean => {
    if (user.userType !== 'caminhoneiro' || preferredRoutes.length === 0 || !freight.origin || !freight.destination) {
      return false;
    }
    
    return preferredRoutes.some(route => {
      // Validar se ambas localizações existem e são válidas
      if (!isValidLocation(route.origin) || !isValidLocation(freight.origin)) return false;
      if (!isValidLocation(route.destination) || !isValidLocation(freight.destination)) return false;
      
      // Comparar origem e destino usando isSameLocation
      return isSameLocation(route.origin, freight.origin) && 
             isSameLocation(route.destination, freight.destination);
    });
  };
  
  // Fretes concluídos do usuário (para a seção colapsável em "Meus Fretes")
  const completedFreights = React.useMemo(() => {
    return freights.filter(freight => freight.customerId === resolvedCompanyId && freight.status === 'completed');
  }, [freights, resolvedCompanyId]);
  
  // Filtrar fretes baseado no modo de visualização
  const filteredFreights = useMemo(() => {
    let baseFreights = freights;

    // Filtrar por "Meus Fretes" ou "Todos os Fretes"
    if (viewMode === 'my-freights') {
      // Apenas fretes do usuário logado, EXCLUINDO concluídos (vão para seção separada)
      baseFreights = freights.filter(freight => freight.customerId === resolvedCompanyId && freight.status !== 'completed');
    }
    // Para 'all-freights', mostra todos os fretes da plataforma (sem filtro adicional)

    // Aplicar filtros de busca e status
    return baseFreights.filter(freight => {
      // ✅ VERIFICAÇÃO DE NULL ADICIONADA - Previne erro "Cannot read properties of null"
      const matchesSearch = (freight.origin?.city?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
                           (freight.destination?.city?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
                           (freight.cargo?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
                           (freight.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
      
      // Aplicar filtros laterais (FreightFilters) com validação completa
      if (freightFilters.origin.city && !isValidLocation(freight.origin)) return false;
      if (freightFilters.origin.city && freight.origin && !freight.origin.city?.toLowerCase().includes(freightFilters.origin.city.toLowerCase())) return false;
      if (freightFilters.destination.city && !isValidLocation(freight.destination)) return false;
      if (freightFilters.destination.city && freight.destination && !freight.destination.city?.toLowerCase().includes(freightFilters.destination.city.toLowerCase())) return false;
      if (freightFilters.origin.state && freight.origin && freight.origin.state !== freightFilters.origin.state) return false;
      if (freightFilters.destination.state && freight.destination && freight.destination.state !== freightFilters.destination.state) return false;
      
      // Filtro de Veículo
      if (freightFilters.vehicleTypes.length > 0) {
        if (!freightFilters.vehicleTypes.includes(freight.truckType)) return false;
      }
      
      // Filtro de Carroceria (bodyTypes)
      if (freightFilters.bodyTypes.length > 0) {
        const freightCategory = freight.category || '';
        const matchesBody = freightFilters.bodyTypes.some(type => 
          freightCategory.toLowerCase().includes(type.toLowerCase())
        );
        if (!matchesBody) return false;
      }
      
      // Filtro de Rastreador
      if (freightFilters.hasTracker !== 'ambos') {
        const requiresTracking = freight.requiresTracking === true;
        if (freightFilters.hasTracker === 'sim' && !requiresTracking) return false;
        if (freightFilters.hasTracker === 'nao' && requiresTracking) return false;
      }
      
      // Filtro de Agenciador
      if (freightFilters.hasAgency !== 'ambos') {
        const isAgency = freight.publisherType === 'agenciador';
        // Se não tiver publisherType, assumimos embarcador (não agenciador) ou tentamos inferir
        if (freightFilters.hasAgency === 'sim' && !isAgency) return false;
        if (freightFilters.hasAgency === 'nao' && isAgency) return false;
      }
      
      // Filtro de Preço
      if (freightFilters.hasPrice !== 'ambos') {
        const hasPrice = freight.price !== 'A combinar';
        if (freightFilters.hasPrice === 'sim' && !hasPrice) return false;
        if (freightFilters.hasPrice === 'nao' && hasPrice) return false;
      }
      
      // Filtro de Complemento
      if (freightFilters.isComplement !== 'ambos') {
        const isComplement = freight.cargo.toLowerCase().includes('complemento') || freight.category.toLowerCase().includes('complemento');
        if (freightFilters.isComplement === 'sim' && !isComplement) return false;
        if (freightFilters.isComplement === 'nao' && isComplement) return false;
      }
      
      if (activeFilter === 'all') return matchesSearch;
      return matchesSearch && freight.status === activeFilter;
    }).sort((a, b) => {
      // Prioridade de ordenação: fretes ativos primeiro, depois agendados e inativos por último
      const getPriority = (status: string) => {
        if (status === 'inactive') return 2;
        if (status === 'scheduled') return 2;
        return 1;
      };

      const priorityA = getPriority(a.status);
      const priorityB = getPriority(b.status);

      if (priorityA !== priorityB) return priorityA - priorityB;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [freights, viewMode, resolvedCompanyId, searchTerm, freightFilters, activeFilter]);
  
  // 🔍 DEBUG: Verificar fretes filtrados (desabilitado para reduzir logs)
  // React.useEffect(() => {
  //   console.log('🔍 [FreightManagement] Fretes filtrados:', {
  //     viewMode,
  //     activeFilter,
  //     total: filteredFreights.length,
  //     byStatus: {
  //       draft: filteredFreights.filter(f => f.status === 'draft').length,
  //       active: filteredFreights.filter(f => f.status === 'active').length,
  //       scheduled: filteredFreights.filter(f => f.status === 'scheduled').length,
  //       inactive: filteredFreights.filter(f => f.status === 'inactive').length,
  //     },
  //     sample: filteredFreights.slice(0, 3).map(f => ({
  //       id: f.id.substring(0, 8),
  //       status: f.status,
  //       origin: f.origin.city,
  //       destination: f.destination.city
  //     }))
  //   });
  // }, [filteredFreights, viewMode, activeFilter]);

  const statusCounts = useMemo(() => {
    const relevantFreights = viewMode === 'my-freights'
      ? freights.filter(f => f.customerId === resolvedCompanyId)
      : viewMode === 'all-freights'
      ? freights
      : [];

    const activeRelevant = viewMode === 'my-freights'
      ? relevantFreights.filter(f => f.status !== 'completed')
      : relevantFreights;

    return {
      all: activeRelevant.length,
      draft: relevantFreights.filter(f => f.status === 'draft').length,
      active: relevantFreights.filter(f => f.status === 'active').length,
      contracted: relevantFreights.filter(f => f.status === 'contracted').length,
      scheduled: relevantFreights.filter(f => f.status === 'scheduled').length,
      completed: relevantFreights.filter(f => f.status === 'completed').length,
      inactive: relevantFreights.filter(f => f.status === 'inactive').length
    };
  }, [freights, viewMode, resolvedCompanyId]);

  // Ações de CRUD integradas com banco de dados
  const handleDeleteFreight = async (id: string) => {
    // Verificar permissões para colaboradores
    // Se é colaborador (não é owner), precisa ter permissão
    if (user.userType === 'transportadora' || user.userType === 'agenciador') {
      // Se tem um collaborator record E não tem permissão → bloquear
      if (!permissions.loading && permissions.collaborator && !permissions.hasPermission('delete_freight')) {
        toast.error('Você não tem permissão para excluir fretes');
        return;
      }
    }
    
    try {
      const result = await database.freights.delete(id);
      if (result.success) {
        setShowDeleteDialog(null);
        toast.success('Frete excluído com sucesso');
        // Refresh data
        if (viewMode === 'my-freights') {
          await refreshMyFreights();
        } else {
          await refreshAllFreights();
        }
      } else {
        toast.error(result.error || 'Erro ao excluir frete');
      }
    } catch (error) {
      console.error('Error deleting freight:', error);
      toast.error('Erro ao excluir frete');
    }
  };

  const handleDeleteMultipleFreights = async (ids: string[]) => {
    // Verificar permissões para colaboradores
    if (user.userType === 'transportadora' || user.userType === 'agenciador') {
      if (!permissions.loading && permissions.collaborator && !permissions.hasPermission('delete_freight')) {
        toast.error('Você não tem permissão para excluir fretes');
        return;
      }
    }
    
    try {
      let successCount = 0;
      let errorCount = 0;
      
      for (const id of ids) {
        const result = await database.freights.delete(id);
        if (result.success) {
          successCount++;
        } else {
          errorCount++;
        }
      }
      
      setShowDeleteDialog(null);
      setSelectedFreights([]);
      
      if (successCount > 0) {
        toast.success(`${successCount} ${successCount === 1 ? 'frete excluído' : 'fretes excluídos'} com sucesso`);
      }
      if (errorCount > 0) {
        toast.error(`Erro ao excluir ${errorCount} ${errorCount === 1 ? 'frete' : 'fretes'}`);
      }
      
      // Refresh data
      if (viewMode === 'my-freights') {
        await refreshMyFreights();
      } else {
        await refreshAllFreights();
      }
    } catch (error) {
      console.error('Error deleting freights:', error);
      toast.error('Erro ao excluir fretes');
    }
  };

  const handleToggleStatus = async (id: string, newStatus: Freight['status']) => {
    // Verificar permissões para colaboradores
    // Se é colaborador (não é owner), precisa ter permissão
    if (user.userType === 'transportadora' || user.userType === 'agenciador') {
      // Se tem um collaborator record E não tem permissão → bloquear
      if (!permissions.loading && permissions.collaborator && !permissions.hasPermission('edit_freight')) {
        toast.error('Você não tem permissão para alterar o status de fretes');
        return;
      }
    }
    
    try {
      const result = await database.freights.update(id, { status: newStatus });
      if (result.success) {
        const statusMessages = {
          active: 'Frete reativado com sucesso!',
          inactive: 'Frete desativado',
          completed: 'Frete finalizado',
          cancelled: 'Frete cancelado'
        };
        
        toast.success(statusMessages[newStatus] || 'Status atualizado');
        
        // Atualizar o detalhe aberto (se estiver na tela de detalhes)
        // Refresh data
        if (viewMode === 'my-freights') {
          await refreshMyFreights();
        } else {
          await refreshAllFreights();
        }
      } else {
        console.error('❌ Falha ao atualizar status:', result.error);
        const errorMsg = result.error || 'Erro ao atualizar status';
        if (errorMsg.includes('recursion')) {
          toast.error('Erro de RLS no banco (recursão). Execute a migration v3 de collaborators.');
        } else if (errorMsg.includes('RLS') || errorMsg.includes('row')) {
          toast.error('Sem permissão para atualizar este frete. Verifique as políticas RLS.');
        } else {
          toast.error(errorMsg);
        }
      }
    } catch (error) {
      console.error('Error updating freight status:', error);
      toast.error('Erro ao atualizar status do frete');
    }
  };



  const handleSendQuote = async () => {
    if (!showQuoteDialog) return;
    
    const { freight, proposedPrice } = showQuoteDialog;
    
    if (!proposedPrice.trim()) {
      toast.error('Informe o valor proposto');
      return;
    }
    
    setQuoteLoading(true);
    
    try {
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 7); // 7 dias de validade
      
      // Buscar dados do perfil (empresa se colaborador, próprio se owner)
      const userResponse = await database.users.getById(resolvedCompanyId);
      const userData = userResponse.data;
      
      const result = await database.quotes.create({
        freightId: freight.id,
        providerId: resolvedCompanyId, // ✅ Usar companyId se colaborador
        providerName: displayName, // ✅ Nome da empresa se colaborador
        providerType: user.userType as 'transportadora' | 'caminhoneiro' | 'agenciador',
        proposedPrice: proposedPrice,
        deliveryEstimate: '3-5 dias', // ✅ CORRIGIDO: String simples ao invés de timestamp
        observations: '',
        validUntil: validUntil.toISOString(),
        status: 'pending',
        provider: {
          rating: userData?.profile?.rating || 0,
          completedFreights: userData?.profile?.completedFreights || 0,
          responseTime: '2h'
        }
      });
      
      if (result.success) {
        // Criar notificação para o embarcador/transportadora
        await database.notifications.create({
          userId: freight.customerId,
          type: 'quote',
          title: 'Nova cotação recebida',
          message: `${displayName} enviou uma cotação de ${proposedPrice} para seu frete.`,
          icon: 'DollarSign',
          read: false,
          actionUrl: `/quotes`,
        });
        
        // Disparar evento customizado para atualizar MyRoutesScreen
        window.dispatchEvent(new CustomEvent('quote-created', { 
          detail: { 
            quoteId: result.data?.id,
            freightId: freight.id,
            providerId: resolvedCompanyId
          } 
        }));
        
        toast.success('Cotação enviada com sucesso! Acompanhe em "Minhas Rotas"');
        setShowQuoteDialog(null);
        await refreshAllFreights();
      } else {
        toast.error(result.error || 'Erro ao enviar cotação');
      }
    } catch (error) {
      console.error('Erro ao enviar cotação:', error);
      toast.error('Erro ao enviar cotação');
    } finally {
      setQuoteLoading(false);
    }
  };

  const handleEditFreight = (freight: Freight) => {
    // Verificar permissões para colaboradores
    if (user.userType === 'transportadora' || user.userType === 'agenciador') {
      if (!permissions.loading && permissions.collaborator && !permissions.hasPermission('edit_freight')) {
        toast.error('Você não tem permissão para editar fretes');
        return;
      }
    }
    
    setFreightToEdit(freight);
  };

  // Verificar se frete pertence ao usuário (para ações de edição/exclusão)
  const isOwnFreight = (freight: Freight) => freight.customerId === resolvedCompanyId;

  const FreightListView = () => (
    <div className="min-h-full bg-background">
      {/* Header fixo como no FretebraS */}
      <div className="bg-card border-b sticky top-0 z-10">
        {/* Linha principal de controles - apenas para fretes, não para cotações */}
        {viewMode !== 'quotes' && (
          <div className="px-6 py-4">
            <div className="space-y-4">
              {/* Campo de busca e ações OU Barra de ações em massa */}
              <div className="flex items-center gap-3">
                {selectedFreights.length > 0 && viewMode === 'my-freights' ? (
                  /* Barra de ações em massa */
                  <>
                    <div className="flex items-center gap-2 flex-1 h-10">
                      <Checkbox
                        checked={selectedFreights.length === filteredFreights.length && filteredFreights.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedFreights(filteredFreights.map(f => f.id));
                          } else {
                            setSelectedFreights([]);
                          }
                        }}
                        className="mr-4 bg-transparent border-gray-300 data-[state=checked]:bg-transparent data-[state=checked]:text-primary data-[state=checked]:border-primary"
                      />
                      <Button variant="outline" size="sm" className="h-10" onClick={() => {
                        const firstFreight = freights.find(f => f.id === selectedFreights[0]);
                        if (firstFreight) handleEditFreight(firstFreight);
                      }}>
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                      </Button>
                      <Button variant="outline" size="sm" className="h-10" onClick={() => {
                        if (selectedFreights.length === 0) {
                          toast.error('Selecione pelo menos um frete para compartilhar');
                          return;
                        }
                        const freight = freights.find(f => f.id === selectedFreights[0]);
                        if (!freight) return;
                        
                        const origin = formatLocationSlash(freight.origin);
                        const destination = formatLocationSlash(freight.destination);
                        const vehicleType = freight.truckType || 'Não especificado';
                        const trailerTypes = [
                          ...(freight.selectedClosedTrailers || []),
                          ...(freight.selectedOpenTrailers || []),
                          ...(freight.selectedSpecialTrailers || [])
                        ].join(', ') || 'Não especificado';
                        const product = freight.product || 'Não especificado';
                        const freightCode = freight.freight_code || `FRETE-${freight.id.slice(0, 8).toUpperCase()}`;
                        
                        const message = `🚨🚨🚨🚨🚨🚨🚨
CARGAS MOOVEFRETES
🚨🚨🚨🚨🚨🚨🚨
⬇⬇⬇⬇⬇⬇⬇⬇⬇

📦 Frete ${freightCode}
🖥 https://moovefretes.com.br/

📍 De: ${origin}
📍 Para: ${destination}
🚚 Veículo: ${vehicleType}
🚛 Carroceria: ${trailerTypes}
📦 Produto: ${product}

🔗 Frete ${freightCode} disponível no MooveFretes:
${generateDeepLinkUrl('freight', freight.id)}`;
                        
                        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
                        window.open(whatsappUrl, '_blank');
                      }}>
                        <Share className="w-4 h-4 mr-2" />
                        Compartilhar
                      </Button>

                      <Button variant="outline" size="sm" className="h-10" onClick={() => {
                        selectedFreights.forEach(id => handleToggleStatus(id, 'inactive'));
                        setSelectedFreights([]);
                      }}>
                        <Pause className="w-4 h-4 mr-2" />
                        Desativar
                      </Button>
                      <Button variant="outline" size="sm" className="h-10" onClick={() => {
                        selectedFreights.forEach(id => handleToggleStatus(id, 'completed'));
                        setSelectedFreights([]);
                      }}>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Concluir
                      </Button>
                      <Button variant="outline" size="sm" className="h-10" onClick={() => {
                        if (selectedFreights.length > 0) {
                          setShowDeleteDialog(selectedFreights);
                        } else {
                          toast.error('Selecione ao menos um frete para excluir');
                        }
                      }}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Excluir
                      </Button>

                    </div>
                  </>
                ) : (
                  /* Controles normais - busca e ações */
                  <>
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        placeholder={user.userType === 'caminhoneiro' ? 'Buscar por cidade, estado ou tipo de carga...' : 'Buscar frete'}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 h-10 bg-transparent border border-input"
                      />
                    </div>

                    {/* Indicador de disponibilidade - apenas para motoristas */}
                    {user.userType === 'caminhoneiro' && (
                      <div className="flex items-center gap-2 shrink-0">
                        {!isAvailable ? (
                          /* Estado inativo: CTA clara para informar localização */
                          <button
                            onClick={() => setShowLocationSearch(true)}
                            className="flex items-center gap-2 px-3 h-10 rounded-lg border border-orange-400 bg-orange-50 text-orange-700 hover:bg-orange-100 transition-all"
                          >
                            <MapPin className="w-4 h-4" />
                            <span className="text-xs font-medium whitespace-nowrap">
                              {currentLocation?.city
                                ? `Ativar em ${currentLocation.city}, ${currentLocation.state}`
                                : 'Informar localização'}
                            </span>
                            <ChevronRight className="w-3 h-3 opacity-60" />
                          </button>
                        ) : (
                          <>
                            {/* Toggle de disponibilidade */}
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={toggleAvailability}
                                    className="flex items-center gap-2 px-3 h-10 rounded-lg border bg-green-50 border-green-500 text-green-700 transition-all"
                                  >
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                    <span className="text-xs font-medium whitespace-nowrap">Disponível para fretes</span>
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Clique para ficar indisponível</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            {/* Pílula unificada: localização + countdown */}
                            <div className="flex items-center h-10 rounded-lg border border-gray-200 bg-white overflow-hidden divide-x divide-gray-200">
                              <button
                                onClick={() => setShowLocationSearch(true)}
                                className="flex items-center gap-1.5 px-3 h-full hover:bg-gray-50 transition-colors"
                              >
                                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                                <span className="text-xs text-gray-600 whitespace-nowrap">
                                  {currentLocation?.city
                                    ? `${currentLocation.city}, ${currentLocation.state}`
                                    : 'Definir localização'}
                                </span>
                              </button>
                              {availabilityExpiry && (
                                <AvailabilityCountdown
                                  expiresAt={availabilityExpiry}
                                  onExpired={() => {
                                    setIsAvailable(false);
                                    setAvailabilityExpiry(null);
                                    toast.info('Sua disponibilidade expirou após 24 horas');
                                    setShowLocationSearch(true);
                                  }}
                                  onRenew={renewAvailability}
                                  inline
                                />
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* Botão "Criar Frete" - apenas para empresas */}
                    {user.userType !== 'caminhoneiro' && (
                      <Button
                        onClick={() => setActiveTab('create')}
                        className="h-10 shrink-0 bg-[#253663] hover:bg-[#ea742a] text-white relative overflow-hidden group transition-all duration-300 hover:shadow-lg hover:scale-105 animate-shake-cycle"
                      >
                        <div className="absolute inset-0 bg-primary/15 animate-pulse"></div>
                        <Plus className="w-4 h-4 mr-2 relative z-10" />
                        <span className="relative z-10">Criar Frete</span>
                      </Button>
                    )}

                    {/* Botão "Para onde você quer ir" - apenas para caminhoneiros */}
                    {user.userType === 'caminhoneiro' && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={() => setShowAddPreferredRoute(true)}
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 shrink-0 border-primary/50 hover:bg-primary/10"
                        >
                          <Navigation className="w-4 h-4 text-primary" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Indicar para onde quero ir</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                {/* Botão de filtros */}
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => setShowAdvancedFilters(true)}
                  className="relative h-10 w-10 shrink-0 lg:hidden"
                >
                  <Sliders className="w-4 h-4" />
                  {(() => {
                    const activeCount = Object.keys(freightFilters).filter(key => {
                      const val = freightFilters[key as keyof FreightFiltersState];
                      if (Array.isArray(val)) return val.length > 0;
                      if (typeof val === 'object' && val !== null && 'city' in val) return (val as any).city !== '';
                      return val !== '' && val !== 'ambos';
                    }).length;
                    
                    return activeCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-medium">
                        {activeCount}
                      </span>
                    );
                  })()}
                </Button>

                {/* Botão de atualizar */}
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => viewMode === 'my-freights' ? refreshMyFreights() : refreshAllFreights()}
                  disabled={loading}
                  className="h-10 w-10 shrink-0"
                >
                      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                  </>
                )}
              </div>

              {/* Contador de fretes e filtros ativos */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-sm">
                      <span className="font-semibold text-foreground">{filteredFreights.length}</span>
                      <span className="text-muted-foreground"> frete{filteredFreights.length !== 1 ? 's' : ''} disponíve{filteredFreights.length !== 1 ? 'is' : 'l'}</span>
                    </span>
                  </div>

                  {selectedFreights.length > 0 && viewMode === 'my-freights' && (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <span className="text-sm">
                        <span className="font-semibold text-foreground">{selectedFreights.length}</span>
                        <span className="text-muted-foreground"> frete{selectedFreights.length !== 1 ? 's' : ''} selecionado{selectedFreights.length !== 1 ? 's' : ''}</span>
                      </span>
                    </div>
                  )}
                  
                  {(() => {
                    const activeCount = Object.keys(freightFilters).filter(key => {
                      const val = freightFilters[key as keyof FreightFiltersState];
                      if (Array.isArray(val)) return val.length > 0;
                      if (typeof val === 'object' && val !== null && 'city' in val) return (val as any).city !== '';
                      return val !== '' && val !== 'ambos';
                    }).length;
                    
                    return activeCount > 0 && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20">
                        <Filter className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs font-medium text-primary">
                          {activeCount} filtro{activeCount > 1 ? 's' : ''}
                        </span>
                        <button
                          onClick={() => setFreightFilters(initialFiltersState)}
                          className="ml-0.5 text-primary hover:text-primary/70 transition-colors"
                          title="Limpar filtros"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })()}
                </div>

                {/* Badges de status - apenas para gestores e apenas em "Meus Fretes" */}
                {canManageFreights && viewMode === 'my-freights' && (
                  <div className="flex items-center gap-2">
                    <Badge 
                      className={`cursor-pointer px-3 py-1 transition-all ${
                        activeFilter === 'active' 
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                          : 'bg-card text-muted-foreground hover:bg-muted border'
                      }`}
                      onClick={() => setActiveFilter(activeFilter === 'active' ? 'all' : 'active')}
                    >
                      Ativos: {statusCounts.active}
                    </Badge>
                    
                    <Badge 
                      className={`cursor-pointer px-3 py-1 transition-all ${
                        activeFilter === 'scheduled' 
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                          : 'bg-card text-muted-foreground hover:bg-muted border'
                      }`}
                      onClick={() => setActiveFilter(activeFilter === 'scheduled' ? 'all' : 'scheduled')}
                    >
                      Agendados: {statusCounts.scheduled}
                    </Badge>
                    
                    {/* Badge de Desativados - oculto para motoristas */}
                    {user.userType !== 'caminhoneiro' && (
                      <Badge 
                        className={`cursor-pointer px-3 py-1 transition-all ${
                          activeFilter === 'inactive' 
                            ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                            : 'bg-card text-muted-foreground hover:bg-muted border'
                        }`}
                        onClick={() => setActiveFilter(activeFilter === 'inactive' ? 'all' : 'inactive')}
                      >
                        Desativados: {statusCounts.inactive}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Download da listagem - apenas para gestores */}
      </div>

      {/* Lista de fretes - Layout com Grid Alinhado */}
      {viewMode !== 'quotes' && (
        <div className="px-6 py-4">
          {loading ? (
            <LoadingSpinner message="Carregando fretes..." />
          ) : filteredFreights.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center max-w-md">
                <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                {viewMode === 'all-freights' ? (
                  <>
                    <p className="text-muted-foreground mb-2">Nenhum frete ativo encontrado na plataforma</p>
                    <p className="text-sm text-muted-foreground">
                      {canManageFreights 
                        ? 'Seja o primeiro a publicar um frete!'
                        : 'Aguarde novos fretes serem publicados.'}
                    </p>
                    {canManageFreights && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-4"
                        onClick={() => {
                          setViewMode('my-freights');
                          setActiveTab('new');
                        }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Publicar Frete
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-muted-foreground mb-2">Você ainda não possui fretes cadastrados</p>
                  </>
                )}
              </div>
            </div>
          ) : (
            // Layout diferenciado por viewMode
            viewMode === 'all-freights' ? (
              // Layout especial para "Todos os Fretes" - Com Sidebar e Cards horizontais
              <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
                {/* Sidebar de Filtros - Visível apenas em desktop */}
                <div className="hidden lg:block bg-card rounded-lg border p-4 h-fit sticky top-24">
                  <FreightFilters 
                    filters={freightFilters} 
                    onFilterChange={setFreightFilters} 
                  />
                </div>

                <div className="space-y-3">
                  {filteredFreights.map((freight, index) => (
                    <motion.div
                      key={freight.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ 
                        opacity: (freight.status === 'scheduled' || freight.status === 'inactive') ? 0.5 : 1, 
                        y: 0 
                      }}
                      transition={{ duration: 0.2, delay: index * 0.02 }}
                    >
                      {user.userType === 'caminhoneiro' ? (
                        <FreightCardMotorista
                          freight={freight}
                          onClick={() => navigate(`/fretes/${freight.id}`)}
                          currentUser={{ id: user.id, name: user.name }}
                        />
                      ) : (
                        <AllFreightsCard
                          freight={freight}
                          onClick={() => navigate(`/fretes/${freight.id}`)}
                        />
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            ) : (
              // Layout para transportadoras/embarcadores - Lista tabular
              <div className="space-y-3">
                {filteredFreights.map((freight, index) => (
                <motion.div
                  key={freight.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ 
                    opacity: (freight.status === 'scheduled' || freight.status === 'inactive') ? 0.5 : 1, 
                    y: 0 
                  }}
                  transition={{ duration: 0.2, delay: index * 0.02 }}
                  className="bg-card border rounded-lg hover:shadow-card-hover transition-shadow cursor-pointer"
                  onClick={(e) => {
                    // Evitar abrir detalhes se clicou em checkbox, botão ou menu
                    const target = e.target as HTMLElement;
                    if (
                      target.closest('button') || 
                      target.closest('[role="checkbox"]') ||
                      target.closest('[role="menu"]')
                    ) {
                      return;
                    }
                    navigate(`/fretes/${freight.id}`);
                  }}
                >
                <div className="px-6 py-5 relative">
                  {/* Grid com larguras fixas para alinhamento perfeito */}
                  <div className={`grid ${viewMode === 'all-freights' ? 'grid-cols-10' : 'grid-cols-9'} items-center gap-6 min-h-[60px]`}>
                    
                    {/* 1. Checkbox - 1 coluna - apenas em "Meus Fretes" */}
                    {viewMode === 'my-freights' ? (
                      <div className="col-span-1 flex justify-center" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedFreights.includes(freight.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedFreights(prev => [...prev, freight.id]);
                            } else {
                              setSelectedFreights(prev => prev.filter(id => id !== freight.id));
                            }
                          }}
                          className="bg-transparent border-gray-300 data-[state=checked]:bg-transparent data-[state=checked]:text-primary data-[state=checked]:border-primary"
                        />
                      </div>
                    ) : null}

                    {/* 2. Logo da Transportadora - 1 coluna - apenas em "Todos os Fretes" */}
                    {viewMode === 'all-freights' ? (() => {
                      const companyLogoUrl = getAvatarUrl(freight.companyLogo);
                      return (
                        <div className="col-span-1 flex justify-center">
                          {companyLogoUrl ? (
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-surface-100 border border-border">
                              <ImageWithFallback
                                src={companyLogoUrl}
                                alt={freight.customerName || 'Logo da empresa'}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-surface-200 border border-border flex items-center justify-center">
                              <Building2 className="w-4 h-4 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      );
                    })() : null}



                    {/* 4. Rota (origem e destino) - 2 colunas */}
                    <div className="col-span-2">
                      <div className="flex flex-col text-sm leading-relaxed space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-primary"></div>
                          <span className="text-foreground font-medium truncate">
                            {freight.origin?.city || 'Origem'}, {freight.origin?.state || 'UF'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full border-2 border-primary"></div>
                          <span className="text-foreground font-medium truncate">
                            {freight.destination?.city || 'Destino'}, {freight.destination?.state || 'UF'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 5. Informações da Carga - 2 colunas */}
                    <div className="col-span-2">
                      <div className="flex flex-col text-sm leading-relaxed space-y-1">
                        <div className="text-foreground font-medium truncate">
                          {freight.cargo}
                        </div>
                        <div className="text-muted-foreground truncate">
                          {freight.weight} • {freight.truckType}
                        </div>
                        {/* Badge de status para agendados */}
                        {freight.status === 'scheduled' && (
                          <div className="flex items-center gap-1 text-xs text-indigo-600 mt-0.5">
                            <Calendar className="w-3 h-3" />
                            <span>
                              Agendado{freight.pickupDate ? ` ${new Date(freight.pickupDate + 'T00:00:00').toLocaleDateString('pt-BR')}` : ''}
                            </span>
                          </div>
                        )}
                        {freight.acceptedDriverName && (
                          <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
                            <UserCheck className="w-3 h-3" />
                            <span className="truncate">{freight.acceptedDriverName}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 6. Preço e Data - 1 coluna */}
                    <div className="col-span-1">
                      <div className="flex flex-col text-sm leading-relaxed space-y-1">
                        <div className="text-foreground font-medium whitespace-nowrap">
                          {freight.price === 'A combinar' ? freight.price : (() => {
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
                    </div>

                    {/* 7. Publicado por (apenas em "Todos os Fretes") - 1 coluna */}
                    {viewMode === 'all-freights' ? (
                      <div className="col-span-1">
                        <div className="text-xs text-muted-foreground">
                          Publicado por:
                        </div>
                        <div className="text-sm font-medium truncate">
                          {freight.customerName}
                        </div>
                      </div>
                    ) : null}

                    {/* Menu de Ações - posicionamento absoluto */}
                    <div className="absolute top-1/2 -translate-y-1/2 right-6 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {/* Botão de Motoristas Indicados */}
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setNearbyDriversFreight(freight);
                          setShowNearbyDrivers(true);
                        }}
                        className="flex items-center gap-2 bg-[#253663] text-white border-[#253663] hover:bg-transparent hover:text-[#253663] hover:border-[#253663] transition-colors"
                      >
                        <FaTruck className="w-4 h-4" />
                        <span>Motoristas Indicados</span>
                      </Button>

                      {canManageFreights && isOwnFreight(freight) ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            {selectedFreights.length === 0 && (
                              <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            )}
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditFreight(freight)}>
                              <MdOutlineEdit className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>

                            <DropdownMenuItem onClick={() => {
                              const origin = formatLocationSlash(freight.origin);
                              const destination = formatLocationSlash(freight.destination);
                              const vehicleType = freight.truckType || 'Não especificado';
                              const trailerTypes = [
                                ...(freight.selectedClosedTrailers || []),
                                ...(freight.selectedOpenTrailers || []),
                                ...(freight.selectedSpecialTrailers || [])
                              ].join(', ') || 'Não especificado';
                              const product = freight.product || 'Não especificado';
                              const freightCode = freight.freight_code || `FRETE-${freight.id.slice(0, 8).toUpperCase()}`;
                              
                              const message = `🚚 *Fretes disponíveis no MooveFretes*

📦 ${origin} → ${destination}

🔗
${generateDeepLinkUrl('freight', freight.id)}

Veja todos os fretes:
https://moovefretes.com.br`;
                              
                              const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
                              window.open(whatsappUrl, '_blank');
                            }}>
                              <FaWhatsapp className="w-4 h-4 mr-2" />
                              Compartilhar frete
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {freight.status === 'inactive' || freight.status === 'scheduled' ? (
                              <DropdownMenuItem onClick={() => handleToggleStatus(freight.id, 'active')}>
                                <Play className="w-4 h-4 mr-2" />
                                Reativar frete
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => handleToggleStatus(freight.id, 'inactive')}>
                                <Pause className="w-4 h-4 mr-2" />
                                Desativar frete
                              </DropdownMenuItem>
                            )}
                            {freight.status !== 'completed' && (
                              <DropdownMenuItem onClick={() => handleToggleStatus(freight.id, 'completed')}>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Concluir frete
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => setShowDeleteDialog([freight.id])}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Excluir frete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
              ))}
              </div>
            )
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* SEÇÃO COLAPSÁVEL: Fretes Concluídos - apenas em "Meus Fretes" */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {viewMode === 'my-freights' && completedFreights.length > 0 && (
        <div className="px-6 pb-6">
          <button
            onClick={() => setShowCompletedSection(!showCompletedSection)}
            className="w-full flex items-center justify-between py-3 px-4 bg-gray-50 rounded-[var(--radius)] border border-gray-200 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm text-foreground">Fretes Concluídos</span>
              <span className="text-xs text-muted-foreground">({completedFreights.length} frete{completedFreights.length !== 1 ? 's' : ''})</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showCompletedSection ? 'rotate-180' : ''}`} />
          </button>

          {showCompletedSection && (
            <div className="mt-2 space-y-2">
              {completedFreights.map((freight) => (
                <div
                  key={freight.id}
                  className="flex items-center gap-3 px-4 py-3 bg-card border rounded-[var(--radius)] cursor-pointer opacity-70 hover:opacity-100 transition-opacity"
                  onClick={() => navigate(`/fretes/${freight.id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-sm">
                      <span className="truncate">{freight.origin?.city}/{freight.origin?.state}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="truncate">{freight.destination?.city}/{freight.destination?.state}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{freight.cargo}</span>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{freight.price}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );

  // Renderizar tela de adicionar rota preferida
  if (showAddPreferredRoute) {
    return (
      <AddPreferredRoute
        onBack={() => setShowAddPreferredRoute(false)}
        onSuccess={async () => {
          // Recarregar rotas preferidas se necessário
          const response = await database.preferredRoutes.getActiveByDriver(user.id);
          if (response.success && response.data) {
            setPreferredRoutes(response.data);
          }
        }}
      />
    );
  }

  // Renderizar tela de motoristas próximos
  if (showNearbyDrivers && nearbyDriversFreight) {
    return (
      <NearbyDriversScreen
        onBack={() => {
          setShowNearbyDrivers(false);
          setNearbyDriversFreight(null);
        }}
        freightId={nearbyDriversFreight.id}
        freightOrigin={nearbyDriversFreight.origin}
        freightData={nearbyDriversFreight}
        user={user}
        onOpenChat={onOpenChat}
      />
    );
  }

  // Renderizar tela de edição de frete
  if (freightToEdit) {
    return (
      <FreightRegistration 
        user={user} 
        initialData={{
          origin: freightToEdit.origin,
          destination: freightToEdit.destination,
          cargo: typeof freightToEdit.cargo === 'string' 
            ? { type: freightToEdit.cargo, weight: 0, description: '' }
            : freightToEdit.cargo,
          vehicleType: freightToEdit.truckType || freightToEdit.vehicleType,
          trailerType: freightToEdit.category || freightToEdit.trailerType,
          pickupDate: freightToEdit.pickupDate,
          deliveryDate: freightToEdit.deadline || freightToEdit.deliveryDate,
          observations: freightToEdit.observations,
          price: freightToEdit.price,
          status: freightToEdit.status,
        }}
        freightId={freightToEdit.id}
        isEditing={true}
        onComplete={async () => {
          await refreshMyFreights();
          setFreightToEdit(null);
          toast.success('Frete atualizado com sucesso!');
        }}
        onCancel={() => {
          setFreightToEdit(null);
        }}
      />
    );
  }

  return (
    <>
      {/* Dialog de busca de localização para motoristas */}
      <Dialog open={showLocationSearch} onOpenChange={setShowLocationSearch}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Definir sua localização atual</DialogTitle>
            <DialogDescription>
              Informe onde você está no momento para que as empresas possam encontrar você mais facilmente.
              {!isAvailable && (
                <span className="block mt-2 text-[#253663] font-medium">
                  Ao confirmar, você ficará disponível para receber fretes por 24 horas.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <CityAutocomplete
              label="Localização Atual"
              value={currentLocation?.city ? `${currentLocation.city}, ${currentLocation.state}` : ''}
              onValueChange={(city, state) => {
                updateLocation(city, state);
              }}
              placeholder="Digite a cidade..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLocationSearch(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={async () => {
                if (currentLocation?.city && currentLocation?.state) {
                  setShowLocationSearch(false);
                  
                  // ✅ MARCAR MOTORISTA COMO DISPONÍVEL automaticamente ao confirmar localização
                  if (!isAvailable && user?.id) {
                    const expiryDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas
                    
                    // [REVISAR] console.log('✅ [LocationModal] Marcando motorista como disponível:', {
                    // userId: user.id,
                    // currentLocation,
                    // expiryDate: expiryDate.toISOString()
                    // });
                    
                    try {
                      const result = await database.updateDriverAvailability(
                        user.id,
                        {
                          isAvailable: true,
                          location: currentLocation,
                          expiresAt: expiryDate.toISOString(),
                        }
                      );
                      
                      
                      if (result.success) {
                        setIsAvailable(true);
                        setAvailabilityExpiry(expiryDate);
                        toast.success('Você está disponível para fretes!', {
                          description: `Localização: ${currentLocation.city}, ${currentLocation.state}`
                        });
                      } else {
                        toast.error('Erro ao atualizar disponibilidade: ' + result.error);
                      }
                    } catch (error) {
                      console.error('❌ Erro ao marcar disponibilidade:', error);
                      toast.error('Erro ao marcar disponibilidade');
                    }
                  } else {
                    toast.success('Localização atualizada com sucesso!');
                  }
                } else {
                  toast.error('Por favor, selecione uma localização válida');
                }
              }}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Conteúdo principal */}
    <TooltipProvider>
      <div className="min-h-full bg-background">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsContent value="list" className="mt-0">
            <FreightListView />
          </TabsContent>
          
          <TabsContent value="create" className="mt-0">
            {canManageFreights ? (
              <FreightRegistration 
                user={user} 
                onComplete={async () => {
                  // Refresh data after creating freight
                  await refreshMyFreights();
                  // Switch to my-freights view
                  setViewMode('my-freights');
                  // Go back to list
                  setActiveTab('list');
                }}
                onCancel={() => {
                  setActiveTab('list');
                }}
              />
            ) : (
              <div className="p-6 text-center">
                <p className="text-muted-foreground">
                  Apenas embarcadores podem criar novos fretes.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Dialog para excluir frete */}
        <AlertDialog open={!!showDeleteDialog} onOpenChange={() => setShowDeleteDialog(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Excluir {showDeleteDialog && showDeleteDialog.length > 1 ? `${showDeleteDialog.length} fretes` : 'frete'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir {showDeleteDialog && showDeleteDialog.length > 1 ? `estes ${showDeleteDialog.length} fretes` : 'este frete'}? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => {
                  if (showDeleteDialog) {
                    if (showDeleteDialog.length === 1) {
                      handleDeleteFreight(showDeleteDialog[0]);
                    } else {
                      handleDeleteMultipleFreights(showDeleteDialog);
                    }
                  }
                }}
                className="bg-destructive hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Dialog de Filtros Avançados */}
        <Dialog open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Filtros Avançados</DialogTitle>
              <DialogDescription>
                Refine sua busca com filtros específicos para encontrar fretes exatamente como você precisa
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              <FreightFilters 
                filters={freightFilters} 
                onFilterChange={setFreightFilters} 
              />
            </div>

            <DialogFooter className="gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setFreightFilters(initialFiltersState);
                  toast.success('Filtros limpos');
                }}
              >
                <X className="w-4 h-4 mr-2" />
                Limpar Filtros
              </Button>
              <Button 
                className="bg-primary hover:bg-primary/90"
                onClick={() => {
                  setShowAdvancedFilters(false);
                  const activeCount = Object.keys(freightFilters).filter(key => {
                    const val = freightFilters[key as keyof FreightFiltersState];
                    if (Array.isArray(val)) return val.length > 0;
                    if (typeof val === 'object' && val !== null && 'city' in val) return (val as any).city !== '';
                    return val !== '' && val !== 'ambos';
                  }).length;
                  if (activeCount > 0) {
                    toast.success(`${activeCount} filtro(s) aplicado(s)`);
                  }
                }}
              >
                <Filter className="w-4 h-4 mr-2" />
                Aplicar Filtros
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de Cotação */}
        <Dialog open={!!showQuoteDialog} onOpenChange={() => setShowQuoteDialog(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" />
                Enviar Cotação
              </DialogTitle>
              <DialogDescription>
                Revise o valor proposto e confirme o envio da cotação
              </DialogDescription>
            </DialogHeader>

            {showQuoteDialog && (
              <div className="space-y-4 py-4">
                {/* Informações do Frete */}
                <div className="p-4 bg-surface-50 rounded-lg border space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Frete {showQuoteDialog.freight.freight_code || generateFreightCode(showQuoteDialog.freight.id)}</span>
                    {showQuoteDialog.freight.type === 'plus' && (
                      <Badge className="bg-primary text-primary-foreground">
                        <Star className="w-3 h-3 mr-1 fill-current" />
                        Plus
                      </Badge>
                    )}
                  </div>
                  
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Rota:</span>
                      <span className="font-medium">
                        {showQuoteDialog.freight.origin?.city}/{showQuoteDialog.freight.origin?.state} → {showQuoteDialog.freight.destination?.city}/{showQuoteDialog.freight.destination?.state}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Carga:</span>
                      <span className="font-medium">{showQuoteDialog.freight.cargo}</span>
                    </div>
                  </div>
                </div>

                {/* Campo de Valor Proposto */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Valor Proposto <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="Ex: R$ 5.000,00"
                    value={showQuoteDialog.proposedPrice}
                    onChange={(e) => setShowQuoteDialog({
                      ...showQuoteDialog,
                      proposedPrice: e.target.value
                    })}
                    className="text-base"
                  />
                  <p className="text-xs text-muted-foreground">
                    {showQuoteDialog.freight.price !== 'A combinar' 
                      ? `Valor sugerido pela transportadora: ${showQuoteDialog.freight.price}`
                      : 'Informe o valor que deseja cobrar por este frete'}
                  </p>
                </div>

                {/* Alerta */}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-700">
                      Após enviar, sua cotação ficará aguardando aprovação em "Minhas Rotas" → "Pendentes"
                    </p>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setShowQuoteDialog(null)}
                disabled={quoteLoading}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSendQuote}
                disabled={quoteLoading || !showQuoteDialog?.proposedPrice}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {quoteLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Enviar Cotação
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>



      </div>
    </TooltipProvider>
    </>
  );
}