/**
 * Tela de Motoristas Próximos
 * Mostra motoristas disponíveis próximos à origem de um frete específico
 * Baseado na localização de disponibilidade do motorista (expira em 24h)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, 
  Search, 
  MapPin, 
  Star, 
  Phone, 
  MessageCircle, 
  Filter, 
  Users, 
  RefreshCw, 
  Eye, 
  Navigation,
  Clock,
  CheckCircle,
  Truck,
  Trophy,
  Target,
  Package,
  X,
  User
} from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { Button } from './ui/button';
import { getAvatarUrl } from '../utils/storage-helper';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from './ui/sheet';
import { toast } from 'sonner@2.0.3';
import { database } from '../utils/database';
import { motion } from 'motion/react';
import { ImageWithFallback } from './ImageWithFallback';
import { LoadingSpinner } from './LoadingSpinner';
import { DriverDetailScreen } from './DriverDetailScreen';
import type { User as AppUser } from './contexts/AppContext';
import type { UnifiedUserProfile } from '../utils/user-profile-helper';
import { generateDeepLinkUrl } from '../utils/deep-link';

interface NearbyDriversScreenProps {
  onBack: () => void;
  freightId: string;
  freightOrigin: {
    city: string;
    state: string;
  };
  freightData?: any; // Dados completos do frete para mensagens
  user?: AppUser;
  onOpenChat?: (userId: string, userName: string, prefilledMessage?: string) => void;
}

interface DriverDisplay {
  id: string;
  name: string;
  phone: string;
  rating: number;
  totalTrips: number;
  vehicleModel: string;
  licensePlate: string;
  avatarUrl?: string;
  location: {
    city: string;
    state: string;
    coordinates?: [number, number];
  };
  destination?: {
    city: string;
    state: string;
  };
  availability: 'available' | 'busy' | 'offline';
  verified: boolean;
  level: number;
  lastSeen: string;
  memberSince: string;
  preferredRoutes: string[];
  operatingStates: string[];
  specialties: string[];
  priceRange: {
    min: number;
    max: number;
  };
  reviewCount: number;
  distance?: number; // Distância aproximada em km
  availabilityExpiresAt?: string;
}

export function NearbyDriversScreen({ 
  onBack, 
  freightId, 
  freightOrigin, 
  freightData,
  user, 
  onOpenChat 
}: NearbyDriversScreenProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDriver, setSelectedDriver] = useState<DriverDisplay | null>(null);
  const [showDriverDetails, setShowDriverDetails] = useState(false);
  const [sortBy, setSortBy] = useState<'distance' | 'rating' | 'trips'>('distance');
  const [searchRadius, setSearchRadius] = useState<number>(100); // Raio em km (padrão: 100km)
  const [drivers, setDrivers] = useState<DriverDisplay[]>([]);
  const [loading, setLoading] = useState(true);

  // Carregar motoristas disponíveis próximos à origem
  useEffect(() => {
    loadNearbyDrivers();
  }, [freightId, freightOrigin]);

  const loadNearbyDrivers = async () => {
    setLoading(true);
    try {
      console.log('🚛 [NearbyDriversScreen] Iniciando busca de motoristas próximos');
      console.log('📍 Origem do frete:', freightOrigin);
      console.log('🔎 Parametros de busca:', {
        city: freightOrigin.city,
        state: freightOrigin.state,
        city_type: typeof freightOrigin.city,
        state_type: typeof freightOrigin.state,
        city_length: freightOrigin.city?.length,
        state_length: freightOrigin.state?.length
      });
      
      // Buscar motoristas com disponibilidade ativa próximos à origem
      const result = await database.getAvailableDriversByLocation(
        freightOrigin.city,
        freightOrigin.state
      );

      console.log('📥 Resultado da busca:', result);

      if (result.success && result.data) {
        console.log('✅ Motoristas encontrados:', result.data.length);
        
        // Converter para formato DriverDisplay
        const driversData: DriverDisplay[] = result.data
          .filter((item: any) => {
            const hasProfile = !!item.profile;
            console.log('🔍 Verificando motorista:', { 
              id: item.user_id, 
              hasProfile,
              location: item.current_location 
            });
            return hasProfile;
          })
          .map((item: any) => {
            const profile = item.profile;
            
            const driverData = {
              id: profile.id,
              name: profile.name || 'Motorista',
              phone: profile.phone || '',
              rating: profile.rating || 4.5,
              totalTrips: 0, // Pode adicionar stats depois se necessário
              vehicleModel: 'Caminhão',
              licensePlate: '',
              avatarUrl: profile.avatar_url,
              location: {
                city: item.current_location?.city || freightOrigin.city,
                state: item.current_location?.state || freightOrigin.state,
                coordinates: item.current_location?.coordinates
              },
              availability: item.available ? 'available' : 'offline',
              verified: false,
              level: 1,
              lastSeen: new Date().toISOString(),
              memberSince: new Date().toISOString(),
              preferredRoutes: [],
              operatingStates: [item.current_location?.state || freightOrigin.state],
              specialties: [],
              priceRange: {
                min: 0,
                max: 0
              },
              reviewCount: 0,
              distance: calculateDistance(
                item.current_location || { city: freightOrigin.city, state: freightOrigin.state },
                freightOrigin
              ),
              availabilityExpiresAt: item.availability_expires_at
            };
            
            console.log('🚗 Motorista convertido:', driverData);
            return driverData;
          });

        console.log('📋 Total de motoristas após conversão:', driversData.length);
        setDrivers(driversData);
      } else {
        console.log('⚠️ Nenhum motorista encontrado ou erro:', result.error);
        setDrivers([]);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar motoristas:', error);
      toast.error('Erro ao carregar motoristas próximos');
      setDrivers([]);
    } finally {
      setLoading(false);
    }
  };

  // Calcular distância aproximada (simplificado - mesma cidade = 0km, mesmo estado = 100km, diferente = 500km)
  const calculateDistance = (
    location: { city: string; state: string },
    origin: { city: string; state: string }
  ): number => {
    if (location.city === origin.city && location.state === origin.state) {
      return 0;
    }
    if (location.state === origin.state) {
      return 100;
    }
    return 500;
  };

  // 🔥 Gerar código do frete
  const generateFreightCode = (id: string): string => {
    return `FRT-${id.substring(0, 8).toUpperCase()}`;
  };

  // 🔥 Criar mensagem padronizada para WhatsApp
  const createWhatsAppMessage = (driver: DriverDisplay): string => {
    const today = new Date().toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });

    const hour = new Date().getHours();
    let greeting = 'Bom dia';
    if (hour >= 12 && hour < 18) {
      greeting = 'Boa tarde';
    } else if (hour >= 18) {
      greeting = 'Boa noite';
    }

    if (!freightData) {
      return `*Olá ${driver.name}, sou ${user?.name || 'Usuário'}.*\n\nTenho um *frete na sua região* e gostaria de saber se você está disponível.\n\n🚛 *Seu perfil:*\n${generateDeepLinkUrl('profile', driver.id)}\n\n*Podemos conversar?* 📦`;
    }

    const origin = `${freightData.origin.city}/${freightData.origin.state}`;
    const destination = `${freightData.destination.city}/${freightData.destination.state}`;

    const freightCode = freightData.freight_code || `#${(freightData.id || '').substring(0, 7).toUpperCase()}`;

    return `*Olá ${driver.name}, sou ${user?.name || 'Usuário'} e tenho o frete ${freightCode} disponível.*

📦 *Frete ${freightCode}:*
${origin} → ${destination}

🔗 *Link do frete:*
${generateDeepLinkUrl('freight', freightData.id)}

🚛 *Seu perfil:*
${generateDeepLinkUrl('profile', driver.id)}

*Você tem interesse?* 🚚`;
  };

  // 🔥 Criar mensagem padronizada para Chat
  const createChatMessage = (driver: DriverDisplay): string => {
    const today = new Date().toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });

    if (!freightData) {
      return `*Olá, vi seu perfil na MooveFretes.*\n\nTenho um *frete que pode te interessar.*\n\n🚛 *Seu perfil:*\n${generateDeepLinkUrl('profile', driver.id)}\n\nPodemos conversar? 📦`;
    }

    const origin = `${freightData.origin.city}/${freightData.origin.state}`;
    const destination = `${freightData.destination.city}/${freightData.destination.state}`;
    const price = freightData.price !== 'A combinar' ? `R$ ${freightData.price}` : 'A combinar';

    const freightCode = freightData.freight_code || `#${(freightData.id || '').substring(0, 7).toUpperCase()}`;

    return `*Olá, vi seu perfil na MooveFretes.*

Tenho o *frete ${freightCode}* que pode te interessar.

📦 *Frete ${freightCode}:* ${origin} → ${destination}

🔗 *Link do frete:*
${generateDeepLinkUrl('freight', freightData.id)}

🚛 *Seu perfil:*
${generateDeepLinkUrl('profile', driver.id)}

Podemos conversar? 📦`;
  };

  // Filtrar e ordenar motoristas
  const filteredDrivers = useMemo(() => {
    let filtered = drivers;

    // Filtrar por raio de distância
    filtered = filtered.filter(driver => (driver.distance || 0) <= searchRadius);

    // Busca por nome
    if (searchTerm) {
      filtered = filtered.filter(driver =>
        driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        driver.location.city.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Ordenar
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'distance':
          return (a.distance || 0) - (b.distance || 0);
        case 'rating':
          return b.rating - a.rating;
        case 'trips':
          return b.totalTrips - a.totalTrips;
        default:
          return 0;
      }
    });

    return filtered;
  }, [drivers, searchTerm, sortBy, searchRadius]);

  const handleContactDriver = (driver: DriverDisplay) => {
    if (driver.phone) {
      const message = createWhatsAppMessage(driver);
      const whatsappUrl = `https://wa.me/55${driver.phone.replace(/\\D/g, '')}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
      toast.success('Abrindo WhatsApp...');
    } else {
      toast.error('Telefone não disponível');
    }
  };

  const handleWhatsApp = (driver: DriverDisplay) => {
    handleContactDriver(driver);
  };

  const handleOpenChat = (driver: DriverDisplay) => {
    if (onOpenChat) {
      const prefilledMessage = createChatMessage(driver);
      onOpenChat(driver.id, driver.name, prefilledMessage);
      toast.success(`Abrindo chat com ${driver.name}...`);
    } else {
      toast.error('Erro ao abrir chat. Tente novamente.');
      console.error('onOpenChat callback not provided to NearbyDriversScreen');
    }
  };

  const handleViewProfile = (driver: DriverDisplay) => {
    handleViewDetails(driver);
  };

  const handleViewDetails = (driver: DriverDisplay) => {
    setSelectedDriver(driver);
    setShowDriverDetails(true);
  };

  const handleSendChatToAll = async () => {
    if (filteredDrivers.length === 0) {
      toast.error('Nenhum motorista disponível para contato');
      return;
    }

    if (!user?.id) {
      toast.error('Erro: usuário não autenticado');
      return;
    }
    
    try {
      // Enviar mensagem diretamente para cada motorista via database
      const promises = filteredDrivers.map(async (driver) => {
        const prefilledMessage = createChatMessage(driver);
        
        // Verificar se já existe um chat
        const existingChats = await database.chats.getAll();
        const chat = existingChats.find(c => 
          (c.user1Id === user.id && c.user2Id === driver.id) ||
          (c.user1Id === driver.id && c.user2Id === user.id)
        );

        let chatId: string;

        if (chat) {
          chatId = chat.id;
        } else {
          // Criar novo chat
          const newChat = await database.chats.create({
            user1Id: user.id,
            user2Id: driver.id,
            user1Name: user.name,
            user2Name: driver.name,
            user1Avatar: user.avatarUrl || '',
            user2Avatar: driver.avatarUrl || '',
            lastMessage: prefilledMessage.substring(0, 100),
            lastMessageTime: new Date().toISOString(),
            unreadCount1: 0,
            unreadCount2: 1, // Motorista tem 1 mensagem não lida
          });
          chatId = newChat.id;
        }

        // Enviar mensagem
        await database.messages.create({
          chatId,
          senderId: user.id,
          text: prefilledMessage,
          timestamp: new Date().toISOString(),
          read: false,
        });

        // Atualizar chat com última mensagem
        await database.chats.update(chatId, {
          lastMessage: prefilledMessage.substring(0, 100),
          lastMessageTime: new Date().toISOString(),
        });
      });

      await Promise.all(promises);
      
      toast.success(`✅ Mensagem enviada para ${filteredDrivers.length} motorista${filteredDrivers.length > 1 ? 's' : ''}!`);
    } catch (error) {
      console.error('❌ Erro ao enviar mensagens:', error);
      toast.error('Erro ao enviar mensagens. Tente novamente.');
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b border-[#e5e7eb] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
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
              <h1 className="text-xl font-semibold text-[#111827]">
                Motoristas Próximos
              </h1>
              <p className="text-sm text-[#6b7280]">
                {freightOrigin.city} - {freightOrigin.state}
              </p>
            </div>
            <Badge variant="secondary" className="text-sm">
              {filteredDrivers.length} disponíveis
            </Badge>
            {filteredDrivers.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSendChatToAll}
                className="flex items-center gap-2 bg-primary text-white border-primary hover:bg-transparent hover:text-primary hover:border-primary transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Enviar Chat para Todos</span>
                <span className="sm:hidden">Chat para Todos</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="bg-white border-b border-[#e5e7eb]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Busca */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280]" />
              <Input
                placeholder="Buscar motorista..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Ordenar */}
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="distance">Mais próximos</SelectItem>
                <SelectItem value="rating">Melhor avaliados</SelectItem>
                <SelectItem value="trips">Mais viagens</SelectItem>
              </SelectContent>
            </Select>

            {/* Raio de Busca */}
            <Select value={searchRadius.toString()} onValueChange={(value) => setSearchRadius(Number(value))}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="50">50 km</SelectItem>
                <SelectItem value="100">100 km</SelectItem>
                <SelectItem value="200">200 km</SelectItem>
                <SelectItem value="500">500 km</SelectItem>
                <SelectItem value="1000">1000 km</SelectItem>
              </SelectContent>
            </Select>

            {/* Atualizar */}
            <Button
              variant="outline"
              size="icon"
              onClick={loadNearbyDrivers}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : filteredDrivers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-[#6b7280] mx-auto mb-4" />
            <h3 className="text-lg font-medium text-[#111827] mb-2">
              Nenhum motorista disponível
            </h3>
            <p className="text-sm text-[#6b7280] mb-4">
              Não há motoristas disponíveis próximos a {freightOrigin.city} - {freightOrigin.state} no momento
            </p>
            <Button variant="outline" onClick={loadNearbyDrivers}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDrivers.map((driver) => {
              // ✅ Converter avatar PATH → URL dinamicamente
              const avatarUrl = getAvatarUrl(driver.avatarUrl);

              return (
              <Card
                key={driver.id}
                className="hover:shadow-card-hover transition-all duration-200 border-light cursor-pointer"
                onClick={() => handleViewDetails(driver)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start space-x-4">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={driver.name}
                          className="w-12 h-12 rounded-full object-cover bg-gray-100"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            if (e.currentTarget.nextElementSibling) {
                              (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                            }
                          }}
                        />
                      ) : null}
                      <div 
                        className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground"
                        style={{ display: avatarUrl ? 'none' : 'flex' }}
                      >
                        <User className="w-6 h-6" />
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 ${driver.availability === 'available' ? 'bg-green-500' : 'bg-gray-400'} rounded-full border-2 border-white`}></div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-medium text-foreground">{driver.name}</h3>
                            {driver.verified && (
                              <CheckCircle className="w-4 h-4 text-blue-500" />
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                            <div className="flex items-center space-x-1">
                              <Star className="w-3 h-3 text-yellow-500" />
                              <span>{driver.rating}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Trophy className="w-3 h-3" />
                              <span>{driver.totalTrips} viagens</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Target className="w-3 h-3" />
                              <span>Nível {driver.level}</span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-2">
                            <div className="flex items-center space-x-1">
                              <MapPin className="w-3 h-3" />
                              <span>{driver.location.city}, {driver.location.state}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Truck className="w-3 h-3" />
                              <span>{driver.vehicleModel}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="flex flex-col gap-2 items-end justify-center">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenChat(driver);
                              }}
                              className="bg-primary hover:bg-primary/90 text-primary-foreground h-9 px-4 min-w-[120px]"
                            >
                              <MessageCircle className="w-4 h-4 mr-2" />
                              Chat
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleWhatsApp(driver);
                              }}
                              className="border-green-200 text-green-600 hover:bg-green-50 h-9 px-4 min-w-[120px]"
                            >
                              <MessageCircle className="w-4 h-4 mr-2" />
                              WhatsApp
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
            })}
          </div>
        )}
      </div>

      {/* Sheet de Detalhes do Motorista */}
      <Sheet open={showDriverDetails} onOpenChange={setShowDriverDetails}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0">
          <SheetTitle className="sr-only">
            {selectedDriver ? `Detalhes de ${selectedDriver.name}` : 'Detalhes do Motorista'}
          </SheetTitle>
          <SheetDescription className="sr-only">
            Informações detalhadas e avaliações do motorista
          </SheetDescription>
          {selectedDriver && (
            <DriverDetailScreen
              driver={selectedDriver}
              onBack={() => setShowDriverDetails(false)}
              user={user}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}