import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { formatLocation } from '../utils/location-helpers';
import { Star, Phone, MessageCircle, MapPin, Navigation, Eye, Truck, Route, Package, Award, Copy, CheckCircle, Trophy, Heart, UserIcon, Share2, ExternalLink } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from './ui/sheet';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { DriverLocationMap } from './DriverLocationMap';
import { getAvatarUrl } from '../utils/storage-helper';
import { database } from '../utils/database';
import { generateDeepLinkUrl } from '../utils/deep-link';
import { copyToClipboard } from '../utils/clipboard-helper';
import { toast } from 'sonner@2.0.3';
import type { Rating } from '../utils/database/schema';

interface DriverData {
  id: string;
  user_id?: string; // ✅ ADICIONADO: user_id para buscar avaliações
  name: string;
  rating: number;
  totalTrips: number;
  reviewCount: number;
  level: number;
  verified: boolean;
  availability: 'available' | 'busy' | 'offline';
  avatarUrl?: string;
  phone: string;
  location: {
    city: string;
    state: string;
    coordinates: [number, number];
  };
  destination?: {
    city: string;
    state: string;
  };
  lastSeen: string;
  vehicleModel: string;
  licensePlate: string;
  specialties: string[];
  operatingStates: string[];
  preferredRoutes: string[];
}

interface DriverDetailsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver: DriverData | null;
  isFavorited: boolean;
  onToggleFavorite: () => void;
  onOpenChat?: (driverId: string, driverName: string) => void;
  onWhatsAppContact: (driver: DriverData) => void;
  onCopyPhone: (driver: DriverData) => void;
  onOpenRating: () => void;
  getTimeAgo: (date: string) => string;
  getAvailabilityColor: (availability: string) => string;
  getAvailabilityText: (availability: string) => string;
}

export function DriverDetailsSheet({
  open,
  onOpenChange,
  driver,
  isFavorited,
  onToggleFavorite,
  onOpenChat,
  onWhatsAppContact,
  onCopyPhone,
  onOpenRating,
  getTimeAgo,
  getAvailabilityColor,
  getAvailabilityText,
}: DriverDetailsSheetProps) {
  if (!driver) return null;

  const navigate = useNavigate();
  const avatarUrl = useMemo(() => getAvatarUrl(driver.avatarUrl), [driver.avatarUrl]);

  // Resolve the user_id for profile navigation and sharing
  const profileUserId = driver.user_id || driver.id;

  const handleViewFullProfile = () => {
    onOpenChange(false);
    navigate(`/perfil/${profileUserId}`);
  };

  const handleShareProfile = async () => {
    const shareUrl = generateDeepLinkUrl('profile', profileUserId);
    const shareText = `Perfil de motorista no MooveFretes:\n\n🚛 ${driver.name}\n\n🔗 ${shareUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: `Perfil - ${driver.name}`, text: shareText, url: shareUrl });
      } catch {
        copyToClipboard(shareUrl, 'Link do perfil copiado!');
      }
    } else {
      copyToClipboard(shareUrl, 'Link do perfil copiado!');
    }
  };
  
  // ✅ Estado para avaliações
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loadingRatings, setLoadingRatings] = useState(false);
  
  // ✅ Carregar avaliações quando o modal abrir
  useEffect(() => {
    if (!open || !driver) {
      setRatings([]);
      return;
    }
    
    const loadRatings = async () => {
      setLoadingRatings(true);
      try {
        // ✅ CORRIGIDO: usar user_id ao invés de id
        const targetId = driver.user_id || driver.id;
        
        const response = await database.ratings.getByTarget(targetId);
        
        if (response.success && response.data) {
          setRatings(response.data);
          // [REVISAR] console.log('✅ Avaliações carregadas com sucesso:', {
          // count: response.data.length,
          // ratings: response.data.map(r => ({
          // id: r.id,
          // evaluatorName: r.evaluatorName,
          // overallRating: r.overallRating,
          // createdAt: r.createdAt
          // }))
          // });
        } else {
          setRatings([]);
        }
      } catch (error) {
        console.error('❌ [DriverDetailsSheet] Erro ao carregar avaliações:', error);
        setRatings([]);
      } finally {
        setLoadingRatings(false);
      }
    };
    
    loadRatings();
  }, [open, driver]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0">
        <SheetTitle className="sr-only">
          Detalhes de {driver.name}
        </SheetTitle>
        <SheetDescription className="sr-only">
          Informações completas sobre o motorista {driver.name}, incluindo localização, veículo, performance e contato.
        </SheetDescription>
        
        <div className="flex flex-col h-full">
          {/* Header Hero */}
          <div className="relative bg-gradient-to-br from-primary/5 via-background to-background p-6 pb-4 border-b">
            <div className="flex items-start space-x-4">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={driver.name}
                    className="w-16 h-16 rounded-full object-cover bg-gray-100 shadow-lg"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      if (e.currentTarget.nextElementSibling) {
                        (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                      }
                    }}
                  />
                ) : null}
                <div 
                  className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-white shadow-lg"
                  style={{ display: avatarUrl ? 'none' : 'flex' }}
                >
                  <UserIcon className="w-8 h-8" />
                </div>
                <div className={`absolute -bottom-1 -right-1 w-5 h-5 ${getAvailabilityColor(driver.availability)} rounded-full border-2 border-white`}>
                  <div className="w-2 h-2 bg-white rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Profile Info */}
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <h2 className="text-lg font-medium">{driver.name}</h2>
                      {driver.verified && (
                        <CheckCircle className="w-4 h-4 text-blue-500" />
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-3 text-sm text-muted-foreground mb-2">
                      <div className="flex items-center space-x-1">
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                        <span>{driver.rating}</span>
                      </div>
                      <span>•</span>
                      <span>{driver.totalTrips} viagens</span>
                      <span>•</span>
                      <span>Nível {driver.level}</span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="bg-primary/10 text-primary border-0 text-xs">
                        <Trophy className="w-3 h-3 mr-1" />
                        Nível {driver.level}
                      </Badge>
                      <Badge 
                        variant={driver.availability === 'available' ? 'default' : 'secondary'} 
                        className={driver.availability === 'available' ? 'bg-green-500 hover:bg-green-600 text-xs' : 'text-xs'}
                      >
                        {getAvailabilityText(driver.availability)}
                      </Badge>
                    </div>
                  </div>

                  <Button variant="ghost" size="icon" onClick={onToggleFavorite}>
                    <Heart className={`w-5 h-5 ${isFavorited ? 'fill-red-500 text-red-500' : ''}`} />
                  </Button>
                </div>

                {/* Share & Full Profile buttons */}
                <div className="flex items-center gap-1 mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleShareProfile}
                    className="h-7 text-xs text-muted-foreground hover:text-primary px-2"
                  >
                    <Share2 className="w-3 h-3 mr-1" />
                    Compartilhar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleViewFullProfile}
                    className="h-7 text-xs text-muted-foreground hover:text-primary px-2"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Ver perfil completo
                  </Button>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-2 mt-4">
              <div className="bg-white rounded-lg p-2 text-center border">
                <div className="flex items-center justify-center space-x-1 mb-1">
                  <Package className="w-3 h-3 text-blue-500" />
                  <span className="text-sm font-medium">{driver.totalTrips}</span>
                </div>
                <div className="text-xs text-muted-foreground">Viagens</div>
              </div>
              <div className="bg-white rounded-lg p-2 text-center border">
                <div className="flex items-center justify-center space-x-1 mb-1">
                  <Award className="w-3 h-3 text-purple-500" />
                  <span className="text-sm font-medium">{ratings.length}</span>
                </div>
                <div className="text-xs text-muted-foreground">Avaliações</div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="p-4 border-b bg-white">
            <div className="grid grid-cols-5 gap-2">
              <Button 
                onClick={() => {
                  if (onOpenChat) {
                    // ✅ CORRIGIDO: usar user_id ao invés de id da tabela drivers
                    onOpenChat(driver.user_id || driver.userId || driver.id, driver.name);
                  }
                }}
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm h-9"
                size="sm"
              >
                <MessageCircle className="w-3 h-3 mr-1" />
                Chat
              </Button>
              <Button 
                variant="outline" 
                onClick={() => onWhatsAppContact(driver)}
                className="border-green-200 text-green-600 hover:bg-green-50 text-sm h-9"
                size="sm"
              >
                <MessageCircle className="w-3 h-3 mr-1" />
                WhatsApp
              </Button>
              <Button 
                variant="outline"
                onClick={() => onCopyPhone(driver)}
                className="text-sm h-9"
                size="sm"
              >
                <Phone className="w-3 h-3 mr-1" />
                Ligar
              </Button>
              <Button 
                variant="outline"
                onClick={onOpenRating}
                className="text-sm h-9 border-yellow-200 text-yellow-600 hover:bg-yellow-50"
                size="sm"
              >
                <Star className="w-3 h-3 mr-1" />
                Avaliar
              </Button>
              <Button 
                variant="outline"
                onClick={handleShareProfile}
                className="text-sm h-9 border-blue-200 text-blue-600 hover:bg-blue-50"
                size="sm"
              >
                <Share2 className="w-3 h-3 mr-1" />
                Compartilhar
              </Button>
            </div>
          </div>

          {/* Tabs Navigation */}
          <Tabs defaultValue="overview" className="flex-1 flex flex-col">
            <TabsList className="w-full bg-white justify-start px-4 h-12 gap-2 border-b">
              <TabsTrigger value="overview">
                Visão Geral
              </TabsTrigger>
              <TabsTrigger value="freights">
                Fretes
              </TabsTrigger>
              <TabsTrigger value="reviews">
                Avaliações
              </TabsTrigger>
              <TabsTrigger value="about">
                Sobre
              </TabsTrigger>
            </TabsList>

            {/* Tab: Visão Geral */}
            <TabsContent value="overview" className="flex-1 overflow-y-auto p-4 space-y-4 bg-background m-0">
              {/* Location Map */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center space-x-2">
                    <MapPin className="w-4 h-4" />
                    <span>Localização Atual</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <DriverLocationMap
                    coordinates={driver.location.coordinates}
                    cityName={`${driver.location.city}, ${driver.location.state}`}
                    driverName={driver.name}
                    className="h-48 rounded-b-lg"
                  />
                </CardContent>
              </Card>

              {/* Location Details */}
              <Card>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2 text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      <span>Localização</span>
                    </div>
                    <span className="font-medium">{formatLocation(driver.location)}</span>
                  </div>
                  
                  {driver.destination && (
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2 text-blue-600">
                        <Navigation className="w-3 h-3" />
                        <span>Destino</span>
                      </div>
                      <span className="font-medium text-blue-600">
                        {formatLocation(driver.destination)}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2 text-muted-foreground">
                      <Eye className="w-3 h-3" />
                      <span>Última vez ativo</span>
                    </div>
                    <span className="font-medium">Há {getTimeAgo(driver.lastSeen)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Vehicle Information */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center space-x-2">
                    <Truck className="w-4 h-4" />
                    <span>Informações do Veículo</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground">Modelo</div>
                      <div className="font-medium">{driver.vehicleModel}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Placa</div>
                      <div className="font-medium">{driver.licensePlate}</div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <div className="text-xs text-muted-foreground mb-2">Especialidades</div>
                    <div className="flex flex-wrap gap-1">
                      {driver.specialties.map((specialty, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs border-primary/20 text-primary">
                          {specialty}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Routes & Coverage */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center space-x-2">
                    <Route className="w-4 h-4" />
                    <span>Rotas e Cobertura</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="text-xs text-muted-foreground mb-2">Estados de Atuação</div>
                    <div className="flex flex-wrap gap-1">
                      {driver.operatingStates.map((state, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs bg-blue-50 text-blue-700">
                          {state}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-xs text-muted-foreground mb-2">Rotas Preferenciais</div>
                    <div className="space-y-1">
                      {driver.preferredRoutes.map((route, idx) => (
                        <div key={idx} className="flex items-center space-x-2 p-1.5 bg-surface-50 rounded text-xs">
                          <Navigation className="w-3 h-3 text-primary" />
                          <span className="font-medium">{route}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Contact Information */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center space-x-2">
                    <Phone className="w-4 h-4" />
                    <span>Contato</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-2 bg-surface-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                        <Phone className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">{driver.phone}</div>
                        <div className="text-xs text-muted-foreground">Telefone principal</div>
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <Button variant="ghost" size="sm" onClick={() => onCopyPhone(driver)} className="h-7 w-7 p-0">
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => onWhatsAppContact(driver)} className="h-7 w-7 p-0 text-green-600">
                        <MessageCircle className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Fretes */}
            <TabsContent value="freights" className="flex-1 overflow-y-auto p-4 space-y-4 bg-background m-0">
              <Card>
                <CardContent className="p-12 text-center">
                  <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Histórico de fretes em desenvolvimento</p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Avaliações */}
            <TabsContent value="reviews" className="flex-1 overflow-y-auto p-4 space-y-4 bg-background m-0">
              {loadingRatings ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <div className="animate-pulse">
                      <Star className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">Carregando avaliações...</p>
                    </div>
                  </CardContent>
                </Card>
              ) : ratings.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Star className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">Nenhuma avaliação ainda</p>
                    <p className="text-sm text-muted-foreground mt-2">Este motorista ainda não recebeu avaliações</p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Estatísticas de avaliação */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Resumo das Avaliações</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-muted rounded-lg">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                            <span className="text-2xl font-bold">
                              {(ratings.length > 0 
                                ? ratings.reduce((sum, r) => sum + (r.overallRating ?? 0), 0) / ratings.length 
                                : 0
                              ).toFixed(1)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">Nota Média</p>
                        </div>
                        <div className="text-center p-4 bg-muted rounded-lg">
                          <div className="text-2xl font-bold mb-1">{ratings.length}</div>
                          <p className="text-sm text-muted-foreground">{ratings.length === 1 ? 'Avaliação' : 'Avaliações'}</p>
                        </div>
                      </div>
                      
                      {/* Médias por categoria */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Pontualidade</span>
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm font-medium">
                              {(ratings.length > 0 
                                ? ratings.reduce((sum, r) => sum + (r.punctualityRating ?? 0), 0) / ratings.length 
                                : 0
                              ).toFixed(1)}
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Comunicação</span>
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm font-medium">
                              {(ratings.length > 0 
                                ? ratings.reduce((sum, r) => sum + (r.communicationRating ?? 0), 0) / ratings.length 
                                : 0
                              ).toFixed(1)}
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Profissionalismo</span>
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm font-medium">
                              {(ratings.length > 0 
                                ? ratings.reduce((sum, r) => sum + (r.professionalismRating ?? 0), 0) / ratings.length 
                                : 0
                              ).toFixed(1)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Lista de avaliações */}
                  <div className="space-y-4">
                    <h3 className="font-medium text-sm px-1">Avaliações Recebidas</h3>
                    {ratings.map((rating) => (
                      <Card key={rating.id}>
                        <CardContent className="p-4 space-y-3">
                          {/* Cabeçalho */}
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{rating.evaluatorName}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(rating.createdAt).toLocaleDateString('pt-BR', {
                                  day: '2-digit',
                                  month: 'long',
                                  year: 'numeric'
                                })}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              <span className="font-bold">{(rating.overallRating ?? 0).toFixed(1)}</span>
                            </div>
                          </div>
                          
                          {/* Comentário */}
                          {rating.comment && (
                            <p className="text-sm text-muted-foreground italic">"{rating.comment}"</p>
                          )}
                          
                          {/* Métricas detalhadas */}
                          <div className="grid grid-cols-3 gap-2 pt-2 border-t text-center">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Pontualidade</p>
                              <div className="flex items-center justify-center gap-0.5">
                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                <span className="text-xs font-medium">{(rating.punctualityRating ?? 0).toFixed(1)}</span>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Comunicação</p>
                              <div className="flex items-center justify-center gap-0.5">
                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                <span className="text-xs font-medium">{(rating.communicationRating ?? 0).toFixed(1)}</span>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Profissionalismo</p>
                              <div className="flex items-center justify-center gap-0.5">
                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                <span className="text-xs font-medium">{(rating.professionalismRating ?? 0).toFixed(1)}</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Badge do tipo de avaliador */}
                          <div className="flex gap-2">
                            <Badge variant="outline" className="text-xs">
                              {rating.evaluatorType === 'transportadora' ? 'Transportadora' : 
                               rating.evaluatorType === 'embarcador' ? 'Embarcador' : 
                               rating.evaluatorType === 'agenciador' ? 'Agenciador' : 'Motorista'}
                            </Badge>
                            {rating.freightCode && (
                              <Badge variant="secondary" className="text-xs">
                                Frete #{rating.freightCode}
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </TabsContent>

            {/* Tab: Sobre */}
            <TabsContent value="about" className="flex-1 overflow-y-auto p-4 space-y-4 bg-background m-0">
              <Card>
                <CardContent className="p-12 text-center">
                  <UserIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Informações adicionais em desenvolvimento</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}