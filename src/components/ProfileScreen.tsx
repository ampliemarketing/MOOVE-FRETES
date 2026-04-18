import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { TermsOfUseModal } from './TermsOfUseModal';
import { PrivacyPolicyModal } from './PrivacyPolicyModal';
import { ProfileEditModal } from './ProfileEditModal';
import { handleProfileSave } from '../utils/profile-save-handler';
import { getAvatarUrl, getDocumentUrl } from '../utils/storage-helper';
import { 
  User as UserIcon,
  Settings,
  Star,
  Trophy,
  Shield,
  Truck,
  Package,
  MapPin,
  Clock,
  DollarSign,
  Calendar,
  Building,
  Users,
  Crown,
  Heart,
  Edit,
  Activity,
  CheckCircle,
  Sparkles,
  Swords,
  Medal,
  Award,
  Target,
  Gem,
  Zap,
  Flame,
  Gift,
  ArrowLeft,
  FileText,
  AlertCircle,
  Eye,
  Loader2
} from 'lucide-react';
import { motion } from 'motion/react';
import { useUser, database } from '../utils/database';
import type { User } from './contexts/AppContext';
import { LoadingSpinner } from './LoadingSpinner';
import { toast } from 'sonner@2.0.3';
import { Input } from './ui/input';

// ════════════════════════════════════════════════════════════════
// COMPONENTE: DocumentCard - Card de documento com visualização
// ════════════════════════════════════════════════════════════════
function DocumentCard({ label, path }: { label: string; path?: string }) {
  const [loading, setLoading] = React.useState(false);
  const hasDocument = Boolean(path);

  const handleViewDocument = async () => {
    if (!path) return;
    setLoading(true);
    try {
      const url = await getDocumentUrl(path);
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        toast.error('Não foi possível gerar o link do documento.');
      }
    } catch (error) {
      console.error('Erro ao abrir documento:', error);
      toast.error('Erro ao abrir documento.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`p-4 border rounded-lg transition-colors ${
        hasDocument
          ? 'border-green-200 bg-green-50/50 hover:border-green-400 cursor-pointer'
          : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={hasDocument ? handleViewDocument : undefined}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-medium text-sm">{label}</span>
        {loading ? (
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
        ) : hasDocument ? (
          <Eye className="w-4 h-4 text-green-600" />
        ) : (
          <FileText className="w-4 h-4 text-gray-400" />
        )}
      </div>
      {hasDocument ? (
        <div className="flex items-center gap-1">
          <CheckCircle className="w-3 h-3 text-green-600" />
          <p className="text-xs text-green-700">Documento enviado — clique para visualizar</p>
        </div>
      ) : (
        <p className="text-xs text-gray-500">Documento não disponível</p>
      )}
    </div>
  );
}

interface UserData {
  id: string;
  userType: 'embarcador' | 'transportadora' | 'caminhoneiro';
  verified: boolean;
  joinDate: string;
  level: number;
  totalXP: number;
  nextLevelXP: number;
  name: string;
  email: string;
  phone?: string;
  bio?: string;
  company?: string;
  avatar?: string;
  location: string;
  professionalInfo: {
    cpf?: string;
    cnh?: string;
    cnhCategory?: string;
    cnhExpiry?: string;
    rntrc?: string;
    rntrcExpiry?: string;
    rg?: string;
    birthDate?: string;
    vehicleType?: string;
    vehiclePlate?: string;
    vehicleModel?: string;
    vehicleYear?: string;
    renavam?: string;
    anttVehicle?: string;
    address?: {
      cep?: string;
      street?: string;
      number?: string;
      complement?: string;
      neighborhood?: string;
      city?: string;
      state?: string;
    };
    specializations: string[];
    certifications: string[];
    documentPaths?: Record<string, string>;
  };
  stats: UserStats;
  socialStats: SocialStats;
  preferences: UserPreferences;
}

interface Activity {
  id: number;
  action: string;
  details: string;
  time: string;
  status: 'success' | 'info' | 'warning';
}

// Trophy and Mission interfaces removed - no longer needed

interface UserStats {
  totalFreights: number;
  completedFreights: number;
  averageRating: number;
  punctuality: number;
  weeklyFreights: number;
  thisMonthValue: number;
}

interface SocialStats {
  followers: number;
  following: number;
  posts: number;
  likes: number;
}

interface UserPreferences {
  privacy: {
    profilePublic: boolean;
    showStats: boolean;
  };
}

interface ProfileScreenProps {
  user?: {
    id: string;
    name: string;
    userType: string;
    verified: boolean;
    rating: number;
    totalTrips: number;
  };
  onBack?: () => void;
  onLogout?: () => void;
  showActivity?: boolean;
  activities?: Activity[];
  isCollaborator?: boolean; // ✅ Se true, perfil em modo somente leitura
  companyId?: string; // ✅ ID do dono da empresa (para carregar dados da empresa)
  companyName?: string; // ✅ Nome da empresa
}

// Mock user data removed - component should receive real user data from props
const mockUserData: UserData = {
  id: '',
  userType: 'caminhoneiro',
  verified: false,
  joinDate: new Date().toISOString().split('T')[0],
  level: 1,
  totalXP: 0,
  nextLevelXP: 1000,
  name: '',
  email: '',
  phone: '',
  bio: '',
  company: '',
  location: '',
  professionalInfo: {
    cpf: '',
    cnh: '',
    cnhCategory: '',
    cnhExpiry: '',
    rntrc: '',
    rntrcExpiry: '',
    rg: '',
    birthDate: '',
    vehicleType: '',
    vehiclePlate: '',
    vehicleModel: '',
    vehicleYear: '',
    renavam: '',
    anttVehicle: '',
    address: {
      cep: '',
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: ''
    },
    specializations: [],
    certifications: []
  },
  stats: {
    totalFreights: 0,
    completedFreights: 0,
    averageRating: 0,
    punctuality: 0,
    weeklyFreights: 0,
    thisMonthValue: 0
  },
  socialStats: {
    followers: 0,
    following: 0,
    posts: 0,
    likes: 0
  },
  preferences: {
    privacy: {
      profilePublic: true,
      showStats: true
    }
  }
};

// Mock data removed - system uses real data from database

export function ProfileScreen({ user, onBack, onLogout, showActivity, activities, isCollaborator, companyId, companyName }: ProfileScreenProps) {
  const [userData, setUserData] = useState<UserData>(mockUserData);
  const [activeTab, setActiveTab] = useState('data');
  const [loading, setLoading] = useState(true);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Estados para edição inline
  const [editedData, setEditedData] = useState<any>({});
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  
  // Estado para armazenar avaliações
  const [userRatings, setUserRatings] = useState<any[]>([]);
  const [loadingRatings, setLoadingRatings] = useState(false);
  
  // 🏢 Estado para armazenar dados completos da empresa
  const [companyDetails, setCompanyDetails] = useState<any>(null);

  // Buscar dados do perfil do backend
  React.useEffect(() => {
    const fetchProfileData = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      // ✅ Se for colaborador, carregar dados do dono da empresa
      const profileId = isCollaborator && companyId ? companyId : user.id;

      try {
        // 🔄 BUSCAR DADOS DO SUPABASE PRIMEIRO
        const { getSupabaseClient } = await import('../utils/supabase/client');
        const supabase = getSupabaseClient();
        
        
        const { data: supabaseUser, error: supabaseError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', profileId)
          .single();
          
        if (supabaseError) {
          console.error('❌ [ProfileScreen] Erro ao buscar do Supabase:', supabaseError);
        } else if (supabaseUser) {
        }
        
        // Usar dados locais do database ao invés de fetch
        const { database } = await import('../utils/database');
        const userResponse = await database.users.getById(profileId);
        
        if (userResponse.success && userResponse.data) {
          const profileData = userResponse.data;
          
          // 🏢 Buscar dados da empresa se for transportadora, embarcador ou agenciador
          // ✅ SOLUÇÃO 2: Não buscar companies para caminhoneiros (previne erro 406)
          let companyData = null;
          if (profileData.userType === 'transportadora' || profileData.userType === 'embarcador' || profileData.userType === 'agenciador') {
            
            // 🔍 TENTAR BUSCAR DO SUPABASE PRIMEIRO
            try {
              const { data: supabaseCompany, error: companyError } = await supabase
                .from('companies')
                .select('*')
                .eq('user_id', profileId)
                .single();
                
              if (!companyError && supabaseCompany) {
                
                // Transformar dados do Supabase para formato local
                companyData = {
                  id: supabaseCompany.id,
                  userId: supabaseCompany.user_id,
                  name: supabaseCompany.trading_name || supabaseCompany.company_name,
                  companyName: supabaseCompany.company_name || supabaseCompany.trading_name,
                  cnpj: supabaseCompany.cnpj,
                  phone: supabaseCompany.phone,
                  email: supabaseCompany.email, // ❌ PROBLEMA: Email deveria ter sido salvo no cadastro!
                  corporateEmail: supabaseCompany.corporate_email,
                  description: supabaseCompany.description || supabaseCompany.metadata?.description,
                  businessType: supabaseCompany.company_type || profileData.userType,
                  rating: supabaseCompany.rating || 0,
                  // ✅ FIX: address é JSONB, não colunas separadas
                  address: {
                    cep: supabaseCompany.address?.cep || '',
                    street: supabaseCompany.address?.street || '',
                    number: supabaseCompany.address?.number || '',
                    complement: supabaseCompany.address?.complement || '',
                    neighborhood: supabaseCompany.address?.neighborhood || '',
                    city: supabaseCompany.address?.city || '',
                    state: supabaseCompany.address?.state || ''
                  },
                  contact: {
                    phone: supabaseCompany.phone || '',
                    email: supabaseCompany.corporate_email || supabaseCompany.email || ''
                  },
                  stateRegistration: supabaseCompany.state_registration,
                  municipalRegistration: supabaseCompany.municipal_registration,
                  // ✅ DADOS DO REPRESENTANTE LEGAL
                  representativeName: supabaseCompany.representative_name,
                  representativeCpf: supabaseCompany.representative_cpf,
                  representativeRg: supabaseCompany.representative_rg,
                  representativePhone: supabaseCompany.representative_phone,
                  representativeEmail: supabaseCompany.representative_email,
                  representativeRole: supabaseCompany.representative_role,
                  representativeCnh: supabaseCompany.representative_cnh,
                  // ✅ DOCUMENTOS ESPECÍFICOS
                  rntrc: supabaseCompany.rntrc,
                  rntrcExpiry: supabaseCompany.rntrc_expiry,
                  // ✅ PESSOA FÍSICA (AGENCIADOR)
                  isIndividual: supabaseCompany.is_individual,
                  mainCpf: supabaseCompany.main_cpf,
                  // ✅ DOCUMENTO PATHS (Storage)
                  documentPaths: supabaseCompany.document_paths || {}
                };
                
                setCompanyDetails(companyData);
              } else if (companyError) {
              }
            } catch (error) {
            }
            
            // 📦 Se não encontrou no Supabase, buscar do LocalStorage
            if (!companyData) {
              const companyResponse = await database.companies.getByUserId(profileId);
              
              if (companyResponse.success && companyResponse.data) {
                companyData = companyResponse.data;
                
                setCompanyDetails(companyData);
              } else {
                // 🆕 CRIAR EMPRESA BÁSICA COM DADOS DO USUÁRIO
                if (supabaseUser) {
                  const basicCompanyData = {
                    userId: profileId,
                    name: supabaseUser.name,
                    companyName: supabaseUser.name,
                    cnpj: supabaseUser.cnpj || '',
                    phone: supabaseUser.phone || '',
                    email: supabaseUser.email || '',
                    businessType: profileData.userType,
                    rating: 0,
                    description: '',
                    address: {
                      cep: '',
                      street: '',
                      number: '',
                      complement: '',
                      neighborhood: '',
                      city: '',
                      state: ''
                    }
                  };
                  
                  companyData = basicCompanyData;
                  setCompanyDetails(basicCompanyData);
                }
              }
            }
            
          }
          
          // 🚚 Buscar dados do motorista se for caminhoneiro
          let driverData = null;
          if (profileData.userType === 'caminhoneiro') {
            
            // 🔍 TENTAR BUSCAR DO SUPABASE PRIMEIRO
            try {
              const { data: supabaseDriver, error: driverError } = await supabase
                .from('drivers')
                .select('*')
                .eq('user_id', profileId)
                .maybeSingle(); // ✅ Fix: Usar maybeSingle() para evitar erro com duplicatas
                
              if (!driverError && supabaseDriver) {
                
                // Transformar dados do Supabase para formato local
                driverData = {
                  id: supabaseDriver.id,
                  userId: supabaseDriver.user_id,
                  name: supabaseDriver.name,
                  cpf: supabaseDriver.cpf,
                  rg: supabaseDriver.rg,
                  birthDate: supabaseDriver.birth_date,
                  cnh: supabaseDriver.cnh,
                  cnhCategory: supabaseDriver.cnh_category,
                  cnhExpiry: supabaseDriver.cnh_expiry,
                  rntrc: supabaseDriver.rntrc,
                  rntrcExpiry: supabaseDriver.rntrc_expiry,
                  phone: supabaseDriver.phone,
                  profileImage: supabaseDriver.profile_image,
                  rating: supabaseDriver.rating || 0,
                  completedTrips: supabaseDriver.completed_trips || 0,
                  vehiclePlate: supabaseDriver.vehicle_plate,
                  vehicleModel: supabaseDriver.vehicle_model,
                  vehicleYear: supabaseDriver.vehicle_year,
                  renavam: supabaseDriver.renavam,
                  anttVehicle: supabaseDriver.antt_vehicle,
                  // ✅ FIX: address é JSONB, não colunas separadas
                  address: {
                    cep: supabaseDriver.address?.cep || '',
                    street: supabaseDriver.address?.street || '',
                    number: supabaseDriver.address?.number || '',
                    complement: supabaseDriver.address?.complement || '',
                    neighborhood: supabaseDriver.address?.neighborhood || '',
                    city: supabaseDriver.address?.city || '',
                    state: supabaseDriver.address?.state || ''
                  },
                  vehicle: {
                    type: supabaseDriver.vehicle_type
                  },
                  documentPaths: supabaseDriver.document_paths || {}
                };
              } else if (driverError) {
              }
            } catch (error) {
            }
            
            // 📦 Se não encontrou no Supabase, buscar do LocalStorage
            if (!driverData) {
              const driverResponse = await database.drivers.getByUserId(profileId);
              
              if (driverResponse.success && driverResponse.data) {
                driverData = driverResponse.data;
              } else {
                
                // 🆕 Se não encontrou em nenhum lugar, mas tem dados do Supabase user, usar esses dados
                if (supabaseUser) {
                  driverData = {
                    userId: profileId,
                    name: supabaseUser.name,
                    cpf: supabaseUser.cpf || '',
                    cnh: supabaseUser.cnh || '',
                    phone: supabaseUser.phone || '',
                    profileImage: supabaseUser.avatar_url || '',
                    rating: 0,
                    completedTrips: 0
                  };
                }
              }
            }
            
          }
          
          // 📷 Priorizar avatar do Supabase, depois LocalStorage
          const avatarPath = supabaseUser?.avatar_url || driverData?.profileImage || profileData.profile?.avatar || user.avatar || '';
          
          // Atualizar dados do perfil com as informações do database
          setUserData(prev => ({
            ...prev,
            id: profileData.id || profileId,
            name: companyData?.name || companyData?.tradingName || profileData.name || user.name || '', // ✅ EMPRESA PRIMEIRO
            email: supabaseUser?.email || profileData.email || user.email || '',
            phone: companyData?.phone || supabaseUser?.phone || profileData.phone || driverData?.phone || '',
            company: companyData?.companyName || companyData?.name || '',
            // ✅ SOLUÇÃO 1: Verificação defensiva completa para evitar crash em caminhoneiros
            location: companyData?.address?.city && companyData?.address?.state
              ? `${companyData.address.city}, ${companyData.address.state}`
              : (user.location || ''),
            userType: (profileData.userType || user.userType) as any,
            verified: profileData.profile?.verificationStatus === 'approved' || user.verified || false,
            bio: profileData.profile?.bio || companyData?.description || '',
            avatar: avatarPath, // ✅ CORRIGIDO: Guardar PATH (não URL) - getAvatarUrl() converte no render
            professionalInfo: {
              cpf: supabaseUser?.cpf || profileData.cpf || driverData?.cpf || '',
              cnh: driverData?.cnh || '', // ✅ CARREGAR CNH
              cnhCategory: driverData?.cnhCategory || '',
              cnhExpiry: driverData?.cnhExpiry || '',
              rntrc: driverData?.rntrc || '',
              rntrcExpiry: driverData?.rntrcExpiry || '',
              rg: driverData?.rg || '',
              birthDate: driverData?.birthDate || '',
              vehicleType: driverData?.vehicle?.type || '',
              vehiclePlate: driverData?.vehiclePlate || '',
              vehicleModel: driverData?.vehicleModel || '',
              vehicleYear: driverData?.vehicleYear || '',
              renavam: driverData?.renavam || '',
              anttVehicle: driverData?.anttVehicle || '',
              address: driverData?.address || companyData?.address || {
                cep: '',
                street: '',
                number: '',
                complement: '',
                neighborhood: '',
                city: '',
                state: ''
              },
              specializations: [],
              certifications: [],
              documentPaths: driverData?.documentPaths || {}
            },
            stats: {
              ...prev.stats,
              averageRating: companyData?.rating || driverData?.rating || profileData.profile?.rating || user.rating || 0,
              totalFreights: profileData.profile?.totalFreights || driverData?.completedTrips || user.totalTrips || 0,
              punctuality: driverData?.punctuality ?? 0,
            },
            socialStats: {
              ...prev.socialStats,
              followers: supabaseUser?.followers_count ?? 0,
              following: supabaseUser?.following_count ?? 0,
            }
          }));

          // 🏢 Armazenar detalhes completos da empresa
          setCompanyDetails(companyData);
        }
      } catch (error) {
        // Silenciar erro - usar dados do user já carregado
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [user, isCollaborator, companyId]);

  // Buscar avaliações do usuário
  React.useEffect(() => {
    const fetchUserRatings = async () => {
      if (!user?.id) return;
      
      setLoadingRatings(true);
      try {
        const ratingProfileId = isCollaborator && companyId ? companyId : user.id;
        const ratingsResponse = await database.ratings.getByDriver(ratingProfileId); // ✅ CORRIGIDO: getByDriver
        if (ratingsResponse.success && ratingsResponse.data) {
          setUserRatings(ratingsResponse.data);
        }
      } catch (error) {
        console.error('Erro ao buscar avaliações:', error);
      } finally {
        setLoadingRatings(false);
      }
    };

    fetchUserRatings();
  }, [user?.id]);

  // Usar dados do usuário se fornecidos (fallback)
  React.useEffect(() => {
    if (user && !loading) {
      setUserData(prev => ({
        ...prev,
        name: user.name || prev.name,
        verified: user.verified || prev.verified,
        stats: {
          ...prev.stats,
          averageRating: user.rating || prev.stats.averageRating,
          totalFreights: user.totalTrips || prev.stats.totalFreights,
        },
        userType: (user.userType as any) || prev.userType,
      }));
    }
  }, [user, loading]);

  // Função para recarregar dados do perfil
  const reloadProfileData = async () => {
    if (!user?.id) return;

    try {
      const { getSupabaseClient } = await import('../utils/supabase/client');
      const supabase = getSupabaseClient();
      
      
      // Buscar dados atualizados do Supabase (tabela profiles)
      const reloadProfileId = isCollaborator && companyId ? companyId : user.id;
      const { data: supabaseUser } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', reloadProfileId)
        .single();
      

      if (userData.userType === 'caminhoneiro') {
        const { data: driverData } = await supabase
          .from('drivers')
          .select('*')
          .eq('user_id', reloadProfileId)
          .maybeSingle(); // ✅ Fix: Usar maybeSingle() para evitar erro com duplicatas

        if (driverData && supabaseUser) {
          setUserData(prev => ({
            ...prev,
            name: driverData.name || supabaseUser.name || prev.name, // ✅ driver.name PRIMEIRO!
            phone: driverData.phone || supabaseUser.phone || prev.phone,
            avatar: driverData.profile_image || supabaseUser.avatar_url || prev.avatar,
            stats: {
              ...prev.stats,
              averageRating: driverData.rating || supabaseUser.rating || prev.stats.averageRating,
              totalFreights: supabaseUser.total_freights || driverData.completed_trips || prev.stats.totalFreights,
              punctuality: driverData.punctuality ?? prev.stats.punctuality,
            },
            socialStats: {
              ...prev.socialStats,
              followers: supabaseUser.followers_count ?? prev.socialStats.followers,
              following: supabaseUser.following_count ?? prev.socialStats.following,
            },
            professionalInfo: {
              ...prev.professionalInfo,
              cpf: driverData.cpf,
              rg: driverData.rg,
              birthDate: driverData.birth_date,
              cnh: driverData.cnh,
              cnhCategory: driverData.cnh_category,
              cnhExpiry: driverData.cnh_expiry,
              rntrc: driverData.rntrc,
              rntrcExpiry: driverData.rntrc_expiry,
              vehicleType: driverData.vehicle_type,
              vehiclePlate: driverData.vehicle_plate,
              vehicleModel: driverData.vehicle_model,
              profileImage: driverData.profile_image,
              vehicleYear: driverData.vehicle_year,
              renavam: driverData.renavam,
              anttVehicle: driverData.antt_vehicle,
              documentPaths: driverData.document_paths || prev.professionalInfo.documentPaths || {},
              address: {
                cep: driverData.address?.cep || '',
                street: driverData.address?.street || '',
                number: driverData.address?.number || '',
                complement: driverData.address?.complement || '',
                neighborhood: driverData.address?.neighborhood || '',
                city: driverData.address?.city || '',
                state: driverData.address?.state || '',
              },
            },
          }));
        }
      } else {
        const { data: companyData } = await supabase
          .from('companies')
          .select('*')
          .eq('user_id', reloadProfileId)
          .single();

        if (companyData && supabaseUser) {
          setCompanyDetails({
            name: companyData.trading_name,
            companyName: companyData.company_name,
            cnpj: companyData.cnpj,
            phone: companyData.phone,
            email: companyData.corporate_email,
            corporateEmail: companyData.corporate_email,
            description: companyData.description,
            address: {
              cep: companyData.address?.cep || '',
              street: companyData.address?.street || '',
              number: companyData.address?.number || '',
              complement: companyData.address?.complement || '',
              neighborhood: companyData.address?.neighborhood || '',
              city: companyData.address?.city || '',
              state: companyData.address?.state || ''
            },
            contact: {
              phone: companyData.phone || '',
              email: companyData.corporate_email || ''
            },
            logo: companyData.logo_url,
            representativeName: companyData.representative_name,
            representativeCpf: companyData.representative_cpf,
            representativeRg: companyData.representative_rg,
            representativePhone: companyData.representative_phone,
            representativeEmail: companyData.representative_email,
            representativeRole: companyData.representative_role,
            representativeCnh: companyData.representative_cnh,
            rntrc: companyData.rntrc,
            rntrcExpiry: companyData.rntrc_expiry,
            stateRegistration: companyData.state_registration,
            municipalRegistration: companyData.municipal_registration,
            documentPaths: companyData.document_paths || {},
          });

          setUserData(prev => ({
            ...prev,
            name: companyData.trading_name || companyData.name || prev.name, // ✅ CORRIGIDO: companies.trading_name TEM PRIORIDADE!
            phone: companyData.phone || supabaseUser.phone || prev.phone,
            company: companyData.trading_name || prev.company,
            avatar: companyData.logo_url || supabaseUser.avatar_url || prev.avatar,
            socialStats: {
              ...prev.socialStats,
              followers: supabaseUser.followers_count ?? prev.socialStats.followers,
              following: supabaseUser.following_count ?? prev.socialStats.following,
            },
          }));
        }
      }

    } catch (error) {
      console.error('❌ [ProfileScreen] Erro ao recarregar dados:', error);
    }
  };

  // Função para atualizar dados após edição
  const handleSaveProfile = async (updatedData: any) => {
    // Recarregar todos os dados do Supabase
    await reloadProfileData();
  };
  
  // 🔥 ESCUTAR EVENTO DE ATUALIZAÇÃO DE PERFIL E RECARREGAR AUTOMATICAMENTE
  React.useEffect(() => {
    const handleProfileUpdate = async (event: Event) => {
      const customEvent = event as CustomEvent;
      await reloadProfileData();
    };
    
    window.addEventListener('user-profile-updated', handleProfileUpdate);
    
    return () => {
      window.removeEventListener('user-profile-updated', handleProfileUpdate);
    };
  }, [user?.id]);

  const xpProgress = (((userData.totalXP || 0) % 10000) / 10000) * 100;

  const getUserTypeIcon = (type: string) => {
    switch (type) {
      case 'caminhoneiro':
        return <Truck className="w-5 h-5" />;
      case 'transportadora':
        return <Building className="w-5 h-5" />;
      default:
        return <UserIcon className="w-5 h-5" />;
    }
  };

  const getUserTypeLabel = (type: string) => {
    switch (type) {
      case 'caminhoneiro':
        return 'Caminhoneiro Profissional';
      case 'transportadora':
        return 'Empresa Transportadora';
      case 'embarcador':
        return 'Embarcador';
      default:
        return type;
    }
  };

  const formatNumber = (num?: number) => {
    if (num === undefined || num === null || isNaN(num)) {
      return '0';
    }
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  };

  const getIconComponent = (iconName: string) => {
    const iconMap: { [key: string]: React.ComponentType<any> } = {
      'Crown': Crown,
      'Clock': Clock,
      'Star': Star,
      'Package': Package,
      'Heart': Heart,
      'Swords': Swords,
      'Trophy': Trophy,
      'Medal': Medal,
      'Award': Award,
      'Target': Target,
      'Shield': Shield,
      'Gem': Gem,
      'Lightning': Zap,
      'Fire': Flame,
      'Gift': Gift
    };
    
    const IconComponent = iconMap[iconName] || Package;
    return <IconComponent className="w-5 h-5" />;
  };

  const renderActivityContent = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-accent" />
            <span>Suas Atividades</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(activities || []).map((activity) => (
              <div key={activity.id} className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className={`w-3 h-3 rounded-full ${
                  activity.status === 'success' ? 'bg-green-500' :
                  activity.status === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                }`} />
                <div className="flex-1">
                  <p className="font-medium text-sm">{activity.action}</p>
                  <p className="text-xs text-gray-600">{activity.details}</p>
                </div>
                <span className="text-xs text-gray-500">{activity.time}</span>
              </div>
            ))}
            
            {(!activities || activities.length === 0) && (
              <div className="text-center py-8 text-gray-500">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Nenhuma atividade recente</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Package className="w-6 h-6 text-accent" />
            </div>
            <p className="text-2xl font-semibold text-primary">{userData.stats.weeklyFreights || 0}</p>
            <p className="text-sm text-gray-600">Esta Semana</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-2xl font-semibold text-primary">
              R$ {((userData.stats.thisMonthValue || 0) / 1000).toFixed(0)}k
            </p>
            <p className="text-sm text-gray-600">Este Mês</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // Indicador de carregamento
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner message="Carregando perfil..." />
      </div>
    );
  }

  // 🔍 DEBUG: Log completo dos dados antes de renderizar

  return (
    <div className="min-h-screen bg-gray-50 overflow-y-auto pb-20">
      {/* ✅ Banner de colaborador - modo somente leitura */}
      {isCollaborator && (
        <div className="bg-blue-600 text-white text-sm px-4 py-2.5 flex items-center gap-2">
          <Eye className="w-4 h-4 flex-shrink-0" />
          <span>Visualizando perfil da empresa <strong>{companyName || 'da empresa'}</strong> — somente leitura</span>
        </div>
      )}
      {onBack && (
        <div className="p-4">
          <Button 
            variant="ghost" 
            onClick={onBack}
            className="text-primary hover:text-primary/80"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>
      )}

      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-primary">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-xl animate-pulse"></div>
            <div className="absolute top-32 right-20 w-24 h-24 bg-white/5 rounded-full blur-lg animate-pulse" style={{ animationDelay: '2s' }}></div>
          </div>
        </div>

        <div className="relative z-10 px-6 pb-8">
          <div className="flex items-end justify-between pt-16 pb-6" style={{ marginTop: '-2rem' }}>
            <div className="flex items-end gap-6">
              <motion.div 
                className="relative"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.6, type: "spring" }}
              >
                <div className="w-32 h-32 bg-white/95 backdrop-blur-md rounded-2xl p-1.5 shadow-2xl border border-white/20">
                  <div className="w-full h-full bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center text-white text-3xl relative overflow-hidden">
                    {(editedData.avatarPreview || userData.avatar) ? (
                      <img src={editedData.avatarPreview || getAvatarUrl(userData.avatar) || ''} alt="" className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <div className="p-6">
                        {getUserTypeIcon(userData.userType)}
                      </div>
                    )}
                    
                    {/* Overlay de edição quando modo de edição está ativo */}
                    {isEditing && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              // Validar tamanho (2MB max)
                              if (file.size > 2 * 1024 * 1024) {
                                toast.error('Imagem muito grande (máx 2MB)');
                                return;
                              }
                              
                              // Guardar o arquivo para upload posterior
                              setAvatarFile(file);
                              
                              // Criar preview local (base64 apenas para visualização)
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setEditedData({...editedData, avatarPreview: reader.result as string});
                                toast.success('Foto selecionada! Clique em Salvar para confirmar.');
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          id="avatar-upload"
                        />
                        <label htmlFor="avatar-upload" className="cursor-pointer flex flex-col items-center">
                          <Edit className="w-6 h-6 text-white mb-1" />
                          <span className="text-xs text-white">Editar Foto</span>
                        </label>
                      </div>
                    )}
                  </div>
                </div>
                
                <motion.div 
                  className="absolute -bottom-3 -right-3 w-12 h-12 bg-gray-600 rounded-2xl border-4 border-white/90 flex items-center justify-center shadow-2xl"
                  whileHover={{ scale: 1.1 }}
                >
                  <span className="font-bold text-white">{userData.level}</span>
                </motion.div>
                
                {userData.verified && (
                  <motion.div 
                    className="absolute -top-2 -right-2 w-8 h-8 bg-gray-600 rounded-full border-3 border-white flex items-center justify-center shadow-lg"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3, type: "spring" }}
                  >
                    <Shield className="w-4 h-4 text-white" />
                  </motion.div>
                )}
              </motion.div>
              
              <motion.div 
                className="pb-6"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.6 }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <h1 className="text-3xl font-bold text-white drop-shadow-sm">{userData.name}</h1>
                </div>
                <div className="space-y-2">
                  <Badge variant="secondary" className="bg-white/95 backdrop-blur-sm text-primary border border-white/30 shadow-lg">
                    {getUserTypeLabel(userData.userType)}
                  </Badge>
                  <div className="flex items-center gap-2 text-white/95 drop-shadow-sm">
                    <MapPin className="w-4 h-4" />
                    <span>{userData.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/95 drop-shadow-sm">
                    <Calendar className="w-4 h-4" />
                    <span>Membro desde {userData.joinDate ? new Date(userData.joinDate).getFullYear() : new Date().getFullYear()}</span>
                  </div>
                </div>
              </motion.div>
            </div>
            
            <motion.div 
              className="flex gap-3 pb-6"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              {!isCollaborator && (
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="bg-white/95 backdrop-blur-sm border border-white/30 shadow-lg hover:bg-white text-primary"
                  onClick={() => setShowEditModal(true)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </Button>
              )}
            </motion.div>
          </div>
          

        </div>
      </div>

      <div className="px-6 -mt-6 mb-8 relative z-10">
        <motion.div 
          className="grid grid-cols-4 gap-4"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1, duration: 0.6 }}
        >
          {[
            { 
              label: 'Fretes', 
              value: formatNumber(userData.stats.totalFreights), 
              icon: Package,
            },
            { 
              label: 'Avaliação', 
              value: (userData.stats.averageRating || 0).toFixed(1), 
              icon: Star,
            },
            { 
              label: 'Seguidores', 
              value: formatNumber(userData.socialStats.followers), 
              icon: Users,
            },
            { 
              label: 'Pontualidade', 
              value: `${userData.stats.punctuality || 0}%`, 
              icon: Clock,
            }
          ].map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.3 + index * 0.05, duration: 0.3, type: "spring" }}
              whileHover={{ scale: 1.05, y: -5 }}
              className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 text-center shadow-lg border border-gray-200/20 relative overflow-hidden"
            >
              <div className="relative z-10">
                <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-gray-100 flex items-center justify-center shadow-lg">
                  <stat.icon className="w-5 h-5 text-gray-600" />
                </div>
                <div className="font-bold text-lg text-gray-700">{stat.value}</div>
                <div className="text-xs text-gray-600 mt-1">{stat.label}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      <div className="px-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4, duration: 0.6 }}
          >
            <TabsList className={`grid w-full mb-8 h-12 bg-white border border-gray-200 gap-2 px-2 ${showActivity ? 'grid-cols-5' : 'grid-cols-4'}`}>

              {showActivity && (
                <TabsTrigger value="activity">
                  Atividade
                </TabsTrigger>
              )}
              <TabsTrigger value="data">
                Dados
              </TabsTrigger>
              <TabsTrigger value="vehicle">
                Veículo
              </TabsTrigger>
              <TabsTrigger value="ratings">
                Avaliações
              </TabsTrigger>
              <TabsTrigger value="settings">
                Sobre o Sistema
              </TabsTrigger>
            </TabsList>
          </motion.div>

          {showActivity && (
            <TabsContent value="activity" className="space-y-6">
              {renderActivityContent()}
            </TabsContent>
          )}



          <TabsContent value="data" className="space-y-6">
            {/* 🏢 Seção de Dados da Empresa (Transportadora/Agenciador) */}
            {(userData.userType === 'transportadora' || userData.userType === 'agenciador') && companyDetails && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Building className="w-5 h-5 text-primary" />
                    Dados da Empresa
                  </h3>
                  <div className="space-y-4">
                    {/* Identificação */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-gray-500 mb-1">Razão Social</Label>
                        {isEditing ? (
                          <Input
                            value={editedData.companyName ?? companyDetails.companyName ?? ''}
                            onChange={(e) => setEditedData({...editedData, companyName: e.target.value})}
                            className="mt-1"
                          />
                        ) : (
                          <p className="font-medium">{companyDetails.companyName || '-'}</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-sm text-gray-500 mb-1">Nome Fantasia</Label>
                        {isEditing ? (
                          <Input
                            value={editedData.tradingName ?? companyDetails.name ?? ''}
                            onChange={(e) => setEditedData({...editedData, tradingName: e.target.value})}
                            className="mt-1"
                          />
                        ) : (
                          <p className="font-medium">{companyDetails.name || '-'}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-gray-500 mb-1">CNPJ</Label>
                        {isEditing ? (
                          <Input
                            value={editedData.cnpj ?? companyDetails.cnpj ?? ''}
                            onChange={(e) => setEditedData({...editedData, cnpj: e.target.value})}
                            className="mt-1"
                          />
                        ) : (
                          <p className="font-medium">{companyDetails.cnpj || '-'}</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-sm text-gray-500 mb-1">Tipo</Label>
                        <Badge variant="secondary" className="mt-1">
                          {companyDetails.businessType === 'transportadora' ? 'Transportadora' : 'Agenciador'}
                        </Badge>
                      </div>
                    </div>

                    {/* Inscrições */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-gray-500 mb-1">Inscrição Estadual</Label>
                        {isEditing ? (
                          <Input
                            value={editedData.stateRegistration ?? companyDetails.stateRegistration ?? ''}
                            onChange={(e) => setEditedData({...editedData, stateRegistration: e.target.value})}
                            className="mt-1"
                          />
                        ) : (
                          <p className="font-medium">{companyDetails.stateRegistration || '-'}</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-sm text-gray-500 mb-1">Inscrição Municipal</Label>
                        {isEditing ? (
                          <Input
                            value={editedData.municipalRegistration ?? companyDetails.municipalRegistration ?? ''}
                            onChange={(e) => setEditedData({...editedData, municipalRegistration: e.target.value})}
                            className="mt-1"
                          />
                        ) : (
                          <p className="font-medium">{companyDetails.municipalRegistration || '-'}</p>
                        )}
                      </div>
                    </div>

                    {/* Contato */}
                    <div className="border-t border-gray-200 pt-4 mt-4">
                      <h4 className="font-medium mb-3">Contato</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm text-gray-500 mb-1">Telefone</Label>
                          {isEditing ? (
                            <Input
                              value={editedData.companyPhone ?? companyDetails.phone ?? companyDetails.contact?.phone ?? ''}
                              onChange={(e) => setEditedData({...editedData, companyPhone: e.target.value})}
                              className="mt-1"
                            />
                          ) : (
                            <p className="font-medium">{companyDetails.phone || companyDetails.contact?.phone || '-'}</p>
                          )}
                        </div>
                        <div>
                          <Label className="text-sm text-gray-500 mb-1">Email</Label>
                          {isEditing ? (
                            <Input
                              type="email"
                              value={editedData.companyEmail ?? companyDetails.email ?? companyDetails.contact?.email ?? ''}
                              onChange={(e) => setEditedData({...editedData, companyEmail: e.target.value})}
                              className="mt-1"
                            />
                          ) : (
                            <p className="font-medium">{companyDetails.email || companyDetails.contact?.email || '-'}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Endereço */}
                    {companyDetails.address && (
                      <div className="border-t border-gray-200 pt-4 mt-4">
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-primary" />
                          Endereço
                        </h4>
                        <div className="space-y-2">
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <Label className="text-sm text-gray-500 mb-1">CEP</Label>
                              {isEditing ? (
                                <Input
                                  value={editedData.companyCep ?? companyDetails?.address?.cep ?? ''}
                                  onChange={(e) => setEditedData({...editedData, companyCep: e.target.value})}
                                  className="mt-1"
                                />
                              ) : (
                                <p className="font-medium">{companyDetails?.address?.cep || '-'}</p>
                              )}
                            </div>
                            <div className="col-span-2">
                              <Label className="text-sm text-gray-500 mb-1">Logradouro</Label>
                              {isEditing ? (
                                <Input
                                  value={editedData.companyStreet ?? companyDetails?.address?.street ?? ''}
                                  onChange={(e) => setEditedData({...editedData, companyStreet: e.target.value})}
                                  className="mt-1"
                                />
                              ) : (
                                <p className="font-medium">{companyDetails?.address?.street || '-'}</p>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <Label className="text-sm text-gray-500 mb-1">Número</Label>
                              {isEditing ? (
                                <Input
                                  value={editedData.companyNumber ?? companyDetails?.address?.number ?? ''}
                                  onChange={(e) => setEditedData({...editedData, companyNumber: e.target.value})}
                                  className="mt-1"
                                />
                              ) : (
                                <p className="font-medium">{companyDetails?.address?.number || '-'}</p>
                              )}
                            </div>
                            <div className="col-span-2">
                              <Label className="text-sm text-gray-500 mb-1">Complemento</Label>
                              {isEditing ? (
                                <Input
                                  value={editedData.companyComplement ?? companyDetails?.address?.complement ?? ''}
                                  onChange={(e) => setEditedData({...editedData, companyComplement: e.target.value})}
                                  className="mt-1"
                                />
                              ) : (
                                <p className="font-medium">{companyDetails?.address?.complement || '-'}</p>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <Label className="text-sm text-gray-500 mb-1">Bairro</Label>
                              {isEditing ? (
                                <Input
                                  value={editedData.companyNeighborhood ?? companyDetails?.address?.neighborhood ?? ''}
                                  onChange={(e) => setEditedData({...editedData, companyNeighborhood: e.target.value})}
                                  className="mt-1"
                                />
                              ) : (
                                <p className="font-medium">{companyDetails?.address?.neighborhood || '-'}</p>
                              )}
                            </div>
                            <div>
                              <Label className="text-sm text-gray-500 mb-1">Cidade</Label>
                              {isEditing ? (
                                <Input
                                  value={editedData.companyCity ?? companyDetails?.address?.city ?? ''}
                                  onChange={(e) => setEditedData({...editedData, companyCity: e.target.value})}
                                  className="mt-1"
                                />
                              ) : (
                                <p className="font-medium">{companyDetails?.address?.city || '-'}</p>
                              )}
                            </div>
                            <div>
                              <Label className="text-sm text-gray-500 mb-1">Estado</Label>
                              {isEditing ? (
                                <Input
                                  value={editedData.companyState ?? companyDetails?.address?.state ?? ''}
                                  onChange={(e) => setEditedData({...editedData, companyState: e.target.value})}
                                  className="mt-1"
                                />
                              ) : (
                                <p className="font-medium">{companyDetails?.address?.state || '-'}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Representante Legal */}
                    {(companyDetails.representativeName || companyDetails.representativeCpf) && (
                      <div className="border-t border-gray-200 pt-4 mt-4">
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <UserIcon className="w-4 h-4 text-primary" />
                          Representante Legal
                        </h4>
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-gray-500 mb-1">Nome</p>
                              <p className="font-medium">{companyDetails.representativeName || '-'}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500 mb-1">Cargo/Vínculo</p>
                              <p className="font-medium">{companyDetails.representativeRole || '-'}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-gray-500 mb-1">CPF</p>
                              <p className="font-medium">{companyDetails.representativeCpf || '-'}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500 mb-1">RG</p>
                              <p className="font-medium">{companyDetails.representativeRg || '-'}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-gray-500 mb-1">Telefone</p>
                              <p className="font-medium">{companyDetails.representativePhone || '-'}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500 mb-1">Email</p>
                              <p className="font-medium">{companyDetails.representativeEmail || '-'}</p>
                            </div>
                          </div>
                          {companyDetails.representativeCnh && (
                            <div>
                              <p className="text-sm text-gray-500 mb-1">CNH</p>
                              <p className="font-medium">{companyDetails.representativeCnh}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Documentos Específicos (Transportadora) */}
                    {companyDetails.businessType === 'transportadora' && companyDetails.rntrc && (
                      <div className="border-t border-gray-200 pt-4 mt-4">
                        <h4 className="font-medium mb-3">Documentos Profissionais</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm text-gray-500 mb-1">RNTRC</Label>
                            {isEditing ? (
                              <Input
                                value={editedData.companyRntrc ?? companyDetails.rntrc ?? ''}
                                onChange={(e) => setEditedData({...editedData, companyRntrc: e.target.value})}
                                className="mt-1"
                              />
                            ) : (
                              <p className="font-medium">{companyDetails.rntrc}</p>
                            )}
                          </div>
                          <div>
                            <Label className="text-sm text-gray-500 mb-1">Validade RNTRC</Label>
                            {isEditing ? (
                              <Input
                                type="date"
                                value={editedData.companyRntrcExpiry ?? companyDetails.rntrcExpiry ?? ''}
                                onChange={(e) => setEditedData({...editedData, companyRntrcExpiry: e.target.value})}
                                className="mt-1"
                              />
                            ) : (
                              <p className="font-medium">{companyDetails.rntrcExpiry ? new Date(companyDetails.rntrcExpiry).toLocaleDateString('pt-BR') : '-'}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Descrição */}
                    {companyDetails.description && (
                      <div className="border-t border-gray-200 pt-4 mt-4">
                        <h4 className="font-medium mb-2">Sobre</h4>
                        <p className="text-gray-600">{companyDetails.description}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Seção de Documentos Enviados (Empresa) */}
            {(userData.userType === 'transportadora' || userData.userType === 'agenciador') && companyDetails && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Documentos Enviados
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { label: 'CNPJ', field: 'cnpjDocument' },
                      { label: 'Contrato Social', field: 'contractSocial' },
                      { label: 'Comprovante de Endereço', field: 'proofOfAddress' },
                      { label: 'RNTRC', field: 'rntrcDocument' }
                    ].map((doc) => (
                      <DocumentCard
                        key={doc.field}
                        label={doc.label}
                        path={companyDetails.documentPaths?.[doc.field]}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Dados Profissionais (Caminhoneiro) */}
            {userData.userType === 'caminhoneiro' && (
              <>
                {/* Dados Pessoais */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <UserIcon className="w-5 h-5 text-primary" />
                      Dados Pessoais
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-gray-500 mb-1">Nome Completo</Label>
                        {isEditing ? (
                          <Input
                            value={editedData.name ?? userData.name ?? ''}
                            onChange={(e) => setEditedData({...editedData, name: e.target.value})}
                            className="mt-1"
                          />
                        ) : (
                          <p className="font-medium">{userData.name || '-'}</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-sm text-gray-500 mb-1">CPF</Label>
                        {isEditing ? (
                          <Input
                            value={editedData.cpf ?? userData.professionalInfo.cpf ?? ''}
                            onChange={(e) => setEditedData({...editedData, cpf: e.target.value})}
                            className="mt-1"
                          />
                        ) : (
                          <p className="font-medium">{userData.professionalInfo.cpf || '-'}</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-sm text-gray-500 mb-1">RG</Label>
                        {isEditing ? (
                          <Input
                            value={editedData.rg ?? userData.professionalInfo.rg ?? ''}
                            onChange={(e) => setEditedData({...editedData, rg: e.target.value})}
                            className="mt-1"
                          />
                        ) : (
                          <p className="font-medium">{userData.professionalInfo.rg || '-'}</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-sm text-gray-500 mb-1">Data de Nascimento</Label>
                        {isEditing ? (
                          <Input
                            type="date"
                            value={editedData.birthDate ?? userData.professionalInfo.birthDate ?? ''}
                            onChange={(e) => setEditedData({...editedData, birthDate: e.target.value})}
                            className="mt-1"
                          />
                        ) : (
                          <p className="font-medium">{userData.professionalInfo.birthDate ? new Date(userData.professionalInfo.birthDate).toLocaleDateString('pt-BR') : '-'}</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-sm text-gray-500 mb-1">Telefone</Label>
                        {isEditing ? (
                          <Input
                            value={editedData.phone ?? userData.phone ?? ''}
                            onChange={(e) => setEditedData({...editedData, phone: e.target.value})}
                            className="mt-1"
                          />
                        ) : (
                          <p className="font-medium">{userData.phone || '-'}</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-sm text-gray-500 mb-1">Email</Label>
                        {isEditing ? (
                          <Input
                            type="email"
                            value={editedData.email ?? userData.email ?? ''}
                            onChange={(e) => setEditedData({...editedData, email: e.target.value})}
                            className="mt-1"
                          />
                        ) : (
                          <p className="font-medium">{userData.email || '-'}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Endereço */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-primary" />
                      Endereço
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-sm text-gray-500 mb-1">CEP</Label>
                        {isEditing ? (
                          <Input
                            value={editedData.cep ?? userData.professionalInfo.address?.cep ?? ''}
                            onChange={(e) => setEditedData({...editedData, cep: e.target.value})}
                            className="mt-1"
                          />
                        ) : (
                          <p className="font-medium">{userData.professionalInfo.address?.cep || '-'}</p>
                        )}
                      </div>
                      <div className="md:col-span-2">
                        <Label className="text-sm text-gray-500 mb-1">Logradouro</Label>
                        {isEditing ? (
                          <Input
                            value={editedData.street ?? userData.professionalInfo.address?.street ?? ''}
                            onChange={(e) => setEditedData({...editedData, street: e.target.value})}
                            className="mt-1"
                          />
                        ) : (
                          <p className="font-medium">{userData.professionalInfo.address?.street || '-'}</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-sm text-gray-500 mb-1">Número</Label>
                        {isEditing ? (
                          <Input
                            value={editedData.number ?? userData.professionalInfo.address?.number ?? ''}
                            onChange={(e) => setEditedData({...editedData, number: e.target.value})}
                            className="mt-1"
                          />
                        ) : (
                          <p className="font-medium">{userData.professionalInfo.address?.number || '-'}</p>
                        )}
                      </div>
                      <div className="md:col-span-2">
                        <Label className="text-sm text-gray-500 mb-1">Complemento</Label>
                        {isEditing ? (
                          <Input
                            value={editedData.complement ?? userData.professionalInfo.address?.complement ?? ''}
                            onChange={(e) => setEditedData({...editedData, complement: e.target.value})}
                            className="mt-1"
                          />
                        ) : (
                          <p className="font-medium">{userData.professionalInfo.address?.complement || '-'}</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-sm text-gray-500 mb-1">Bairro</Label>
                        {isEditing ? (
                          <Input
                            value={editedData.neighborhood ?? userData.professionalInfo.address?.neighborhood ?? ''}
                            onChange={(e) => setEditedData({...editedData, neighborhood: e.target.value})}
                            className="mt-1"
                          />
                        ) : (
                          <p className="font-medium">{userData.professionalInfo.address?.neighborhood || '-'}</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-sm text-gray-500 mb-1">Cidade</Label>
                        {isEditing ? (
                          <Input
                            value={editedData.city ?? userData.professionalInfo.address?.city ?? ''}
                            onChange={(e) => setEditedData({...editedData, city: e.target.value})}
                            className="mt-1"
                          />
                        ) : (
                          <p className="font-medium">{userData.professionalInfo.address?.city || '-'}</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-sm text-gray-500 mb-1">Estado</Label>
                        {isEditing ? (
                          <Input
                            value={editedData.state ?? userData.professionalInfo.address?.state ?? ''}
                            onChange={(e) => setEditedData({...editedData, state: e.target.value})}
                            className="mt-1"
                            maxLength={2}
                          />
                        ) : (
                          <p className="font-medium">{userData.professionalInfo.address?.state || '-'}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Documentos Profissionais */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      Documentos Profissionais
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-gray-500 mb-1">CNH</Label>
                        {isEditing ? (
                          <Input
                            value={editedData.cnh ?? userData.professionalInfo.cnh ?? ''}
                            onChange={(e) => setEditedData({...editedData, cnh: e.target.value})}
                            className="mt-1"
                          />
                        ) : (
                          <p className="font-medium">{userData.professionalInfo.cnh || '-'}</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-sm text-gray-500 mb-1">Categoria CNH</Label>
                        {isEditing ? (
                          <Input
                            value={editedData.cnhCategory ?? userData.professionalInfo.cnhCategory ?? ''}
                            onChange={(e) => setEditedData({...editedData, cnhCategory: e.target.value})}
                            className="mt-1"
                            maxLength={3}
                          />
                        ) : (
                          <p className="font-medium">{userData.professionalInfo.cnhCategory || '-'}</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-sm text-gray-500 mb-1">Validade CNH</Label>
                        {isEditing ? (
                          <Input
                            type="date"
                            value={editedData.cnhExpiry ?? userData.professionalInfo.cnhExpiry ?? ''}
                            onChange={(e) => setEditedData({...editedData, cnhExpiry: e.target.value})}
                            className="mt-1"
                          />
                        ) : (
                          <p className="font-medium">{userData.professionalInfo.cnhExpiry ? new Date(userData.professionalInfo.cnhExpiry).toLocaleDateString('pt-BR') : '-'}</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-sm text-gray-500 mb-1">RNTRC</Label>
                        {isEditing ? (
                          <Input
                            value={editedData.rntrc ?? userData.professionalInfo.rntrc ?? ''}
                            onChange={(e) => setEditedData({...editedData, rntrc: e.target.value})}
                            className="mt-1"
                          />
                        ) : (
                          <p className="font-medium">{userData.professionalInfo.rntrc || '-'}</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-sm text-gray-500 mb-1">Validade RNTRC</Label>
                        {isEditing ? (
                          <Input
                            type="date"
                            value={editedData.rntrcExpiry ?? userData.professionalInfo.rntrcExpiry ?? ''}
                            onChange={(e) => setEditedData({...editedData, rntrcExpiry: e.target.value})}
                            className="mt-1"
                          />
                        ) : (
                          <p className="font-medium">{userData.professionalInfo.rntrcExpiry ? new Date(userData.professionalInfo.rntrcExpiry).toLocaleDateString('pt-BR') : '-'}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Seção de Documentos Enviados */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      Documentos Enviados
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { label: 'CNH', field: 'cnh' },
                        { label: 'CRLV', field: 'vehicleDocument' },
                        { label: 'RG', field: 'rg' },
                        { label: 'CPF', field: 'cpfDocument' },
                        { label: 'RNTRC', field: 'rntrcDocument' }
                      ].map((doc) => (
                        <DocumentCard
                          key={doc.field}
                          label={doc.label}
                          path={userData.professionalInfo?.documentPaths?.[doc.field]}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="vehicle" className="space-y-6">
            {userData.userType === 'caminhoneiro' && userData.professionalInfo ? (
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Truck className="w-5 h-5 text-primary" />
                    Informações do Veículo
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-gray-500 mb-1">Placa</Label>
                      {isEditing ? (
                        <Input
                          value={editedData.vehiclePlate ?? userData.professionalInfo.vehiclePlate ?? ''}
                          onChange={(e) => setEditedData({...editedData, vehiclePlate: e.target.value})}
                          className="mt-1"
                          maxLength={8}
                        />
                      ) : (
                        <p className="font-medium">{userData.professionalInfo.vehiclePlate || '-'}</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-sm text-gray-500 mb-1">Marca/Modelo</Label>
                      {isEditing ? (
                        <Input
                          value={editedData.vehicleModel ?? userData.professionalInfo.vehicleModel ?? ''}
                          onChange={(e) => setEditedData({...editedData, vehicleModel: e.target.value})}
                          className="mt-1"
                        />
                      ) : (
                        <p className="font-medium">{userData.professionalInfo.vehicleModel || '-'}</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-sm text-gray-500 mb-1">Ano</Label>
                      {isEditing ? (
                        <Input
                          value={editedData.vehicleYear ?? userData.professionalInfo.vehicleYear ?? ''}
                          onChange={(e) => setEditedData({...editedData, vehicleYear: e.target.value})}
                          className="mt-1"
                          maxLength={4}
                        />
                      ) : (
                        <p className="font-medium">{userData.professionalInfo.vehicleYear || '-'}</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-sm text-gray-500 mb-1">RENAVAM</Label>
                      {isEditing ? (
                        <Input
                          value={editedData.renavam ?? userData.professionalInfo.renavam ?? ''}
                          onChange={(e) => setEditedData({...editedData, renavam: e.target.value})}
                          className="mt-1"
                        />
                      ) : (
                        <p className="font-medium">{userData.professionalInfo.renavam || '-'}</p>
                      )}
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-sm text-gray-500 mb-1">ANTT do Veículo</Label>
                      {isEditing ? (
                        <Input
                          value={editedData.anttVehicle ?? userData.professionalInfo.anttVehicle ?? ''}
                          onChange={(e) => setEditedData({...editedData, anttVehicle: e.target.value})}
                          className="mt-1"
                        />
                      ) : (
                        <p className="font-medium">{userData.professionalInfo.anttVehicle || '-'}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Truck className="w-4 h-4 text-primary" />
                      Tipos de Veículos
                    </h4>
                    {isEditing ? (
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {['Caminhão Toco', 'Caminhão Truck', 'Carreta', 'Bitrem', 'Rodotrem', 'Van', 'VUC', '3/4'].map((type) => {
                            const isSelected = (editedData.vehicleType || user?.vehicleType) === type;
                            return (
                              <Button
                                key={type}
                                type="button"
                                variant={isSelected ? "default" : "outline"}
                                size="sm"
                                className={`h-9 px-4 ${isSelected ? 'bg-primary text-white' : 'hover:bg-gray-100'}`}
                                onClick={() => {
                                  setEditedData({...editedData, vehicleType: type});
                                }}
                              >
                                {type}
                              </Button>
                            );
                          })}
                        </div>
                        <p className="text-xs text-gray-500">Clique no tipo para selecionar</p>
                      </div>
                    ) : (
                      user?.vehicleType ? (
                        <Badge variant="secondary" className="bg-primary/10 text-primary border border-primary/20">{user.vehicleType}</Badge>
                      ) : (
                        <p className="text-sm text-gray-500">Nenhum tipo de veículo cadastrado</p>
                      )
                    )}
                  </div>
                  
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Package className="w-4 h-4 text-green-600" />
                      Tipos de Carrocerias
                    </h4>
                    {isEditing ? (
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {['Baú', 'Sider', 'Graneleiro', 'Caçamba', 'Refrigerado', 'Porta Container', 'Prancha', 'Grade Baixa', 'Tanque'].map((type) => {
                            const isSelected = (editedData.trailerType || user?.trailerType) === type;
                            return (
                              <Button
                                key={type}
                                type="button"
                                variant={isSelected ? "default" : "outline"}
                                size="sm"
                                className={`h-9 px-4 ${isSelected ? 'bg-green-600 text-white hover:bg-green-700' : 'hover:bg-gray-100'}`}
                                onClick={() => {
                                  setEditedData({...editedData, trailerType: type});
                                }}
                              >
                                {type}
                              </Button>
                            );
                          })}
                        </div>
                        <p className="text-xs text-gray-500">Clique no tipo para selecionar</p>
                      </div>
                    ) : (
                      user?.trailerType ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-700 border border-green-200">{user.trailerType}</Badge>
                      ) : (
                        <p className="text-sm text-gray-500">Nenhum tipo de carroceria cadastrado</p>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <Truck className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600">Informações de veículo disponíveis apenas para caminhoneiros</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="ratings" className="space-y-6">
            {loadingRatings ? (
              <LoadingSpinner message="Carregando avaliações..." />
            ) : userRatings.length > 0 ? (
              <div className="space-y-4">
                {userRatings.map((rating) => (
                  <Card key={rating.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                            <span className="font-semibold text-lg">{(rating.overallRating ?? 0).toFixed(1)}</span>
                          </div>
                          <p className="text-sm text-gray-600">{rating.raterName || 'Avaliador'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">
                            {new Date(rating.createdAt).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className="text-center p-2 bg-gray-50 rounded">
                          <p className="text-xs text-gray-500">Pontualidade</p>
                          <p className="font-medium">{(rating.punctuality ?? 0).toFixed(1)}</p>
                        </div>
                        <div className="text-center p-2 bg-gray-50 rounded">
                          <p className="text-xs text-gray-500">Cuidado</p>
                          <p className="font-medium">{(rating.care ?? 0).toFixed(1)}</p>
                        </div>
                        <div className="text-center p-2 bg-gray-50 rounded">
                          <p className="text-xs text-gray-500">Comunicação</p>
                          <p className="font-medium">{(rating.communication ?? 0).toFixed(1)}</p>
                        </div>
                      </div>
                      
                      {rating.comment && (
                        <div className="p-3 bg-gray-50 rounded">
                          <p className="text-sm text-gray-700">{rating.comment}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <Star className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600 mb-2">Você ainda não possui avaliações</p>
                  <p className="text-sm text-gray-500">Complete mais fretes para receber avaliações dos clientes</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Informações Legais</h3>
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setShowTermsModal(true)}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Termos e Condições de Uso
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setShowPrivacyModal(true)}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Política de Privacidade
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <TermsOfUseModal open={showTermsModal} onOpenChange={setShowTermsModal} />
      <PrivacyPolicyModal open={showPrivacyModal} onOpenChange={setShowPrivacyModal} />
      <ProfileEditModal 
        isOpen={showEditModal} 
        onClose={() => setShowEditModal(false)}
        userData={userData}
        companyDetails={companyDetails}
        onSave={handleSaveProfile}
      />
    </div>
  );
}