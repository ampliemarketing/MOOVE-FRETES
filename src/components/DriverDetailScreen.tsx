import React, { useState, useEffect } from 'react';
import { formatLocation } from '../utils/location-helpers';
import { generateDeepLinkUrl } from '../utils/deep-link';
import { ChevronLeft, MapPin, Star, Phone, MessageCircle, Copy, Mail, CheckCircle, Calendar, Package, TrendingUp, Award, Activity, Heart, Share2, MoreVertical, Truck, Trophy, Clock, Eye, Navigation, MapPinned } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Progress } from './ui/progress';
import { Avatar, AvatarFallback } from './ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner@2.0.3';
import { database } from '../utils/database';
import type { Rating } from '../utils/database/schema';
import type { User } from './contexts/AppContext';
import { copyToClipboard } from '../utils/clipboard-helper';
import { RatingDialog } from './RatingDialog';
import { DriverLocationMap } from './DriverLocationMap';

interface Driver {
  id: string;
  name: string;
  phone: string;
  rating: number;
  totalTrips: number;
  vehicleModel: string;
  licensePlate: string;
  location: {
    city: string;
    state: string;
    coordinates: [number, number];
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
}

interface DriverDetailScreenProps {
  driver: Driver;
  onBack: () => void;
  user?: User;
}

export function DriverDetailScreen({ driver, onBack, user }: DriverDetailScreenProps) {
  console.log('🎯 [DriverDetailScreen] Componente montado com driver:', {
    id: driver.id,
    name: driver.name,
    rating: driver.rating,
    reviewCount: driver.reviewCount
  });
  
  const [activeTab, setActiveTab] = useState('overview');
  const [isFavorited, setIsFavorited] = useState(false);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [completedFreights, setCompletedFreights] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('🔍 [DriverDetailScreen] Carregando dados do motorista:', driver.id);
        
        // Buscar avaliações
        const ratingsResponse = await database.ratings.getByDriver(driver.id, { limit: 100 });
        console.log('📊 [DriverDetailScreen] Resposta de avaliações:', {
          success: ratingsResponse.success,
          count: ratingsResponse.data?.length || 0,
          data: ratingsResponse.data
        });
        
        if (ratingsResponse.success && ratingsResponse.data) {
          setRatings(ratingsResponse.data);
          console.log('✅ [DriverDetailScreen] Avaliações carregadas:', ratingsResponse.data.length);
        } else {
          setRatings([]);
          console.log('⚠️ [DriverDetailScreen] Nenhuma avaliação encontrada');
        }

        // Buscar fretes completados do motorista
        const freightsResponse = await database.freights.getByDriver(driver.id);
        if (freightsResponse.success && freightsResponse.data) {
          const completed = freightsResponse.data.filter(f => f.status === 'completed');
          setCompletedFreights(completed);
        }
      } catch (error) {
        console.error('❌ [DriverDetailScreen] Erro ao carregar dados:', error);
      }
    };

    fetchData();
  }, [driver.id]);

  // Calcular distribuição de ratings
  const ratingDistribution = [5, 4, 3, 2, 1].map(rating => {
    const count = ratings.filter(r => Math.floor(r.overallRating) === rating).length;
    const percentage = ratings.length > 0 ? (count / ratings.length) * 100 : 0;
    return { rating, count, percentage };
  });

  const handleWhatsAppContact = () => {
    // Gerar saudação baseada na hora do dia
    const hour = new Date().getHours();
    let greeting = 'Bom dia';
    if (hour >= 12 && hour < 18) {
      greeting = 'Boa tarde';
    } else if (hour >= 18) {
      greeting = 'Boa noite';
    }

    const companyName = user?.name || 'Nossa Empresa';
    const companyId = user?.id || '';
    const userType = user?.userType === 'caminhoneiro' ? 'motorista' : 'empresa';
    
    const today = new Date().toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
    
    const message = `*Olá ${driver.name}, sou ${companyName}.*

Vi seu perfil na MooveFretes e tenho *fretes que podem te interessar.*

🚛 *Seu perfil:*
${generateDeepLinkUrl('profile', driver.id)}

🏢 *Meu perfil:*
${generateDeepLinkUrl('profile', companyId)}

*Você está disponível?* 📦`;

    const phone = driver.phone.replace(/\D/g, '');
    const url = `https://api.whatsapp.com/send?phone=55${phone}&text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    toast.success(`Abrindo WhatsApp para ${driver.name}`);
  };

  const handleContractDriver = () => {
    toast.success(`[Demo] Solicitação de contratação enviada para ${driver.name}!`);
  };

  const handleCopyPhone = () => {
    copyToClipboard(driver.phone);
    toast.success('Telefone copiado para a área de transferência');
  };

  const handleToggleFavorite = () => {
    setIsFavorited(!isFavorited);
    toast.success(isFavorited ? 
      `${driver.name} removido dos favoritos` : 
      `${driver.name} adicionado aos favoritos!`
    );
  };

  const handleShareProfile = async () => {
    const shareUrl = generateDeepLinkUrl('profile', driver.id);
    const shareText = `Veja o perfil deste motorista no MooveFretes:\n\n🚛 ${driver.name}\n\n🔗 ${shareUrl}`;

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

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'available': return 'bg-green-500';
      case 'busy': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getAvailabilityText = (availability: string) => {
    switch (availability) {
      case 'available': return 'Disponível';
      case 'busy': return 'Em viagem';
      case 'offline': return 'Offline';
      default: return 'Desconhecido';
    }
  };

  const getLevelColor = (level: number) => {
    if (level >= 15) return 'from-purple-500 to-pink-500';
    if (level >= 10) return 'from-blue-500 to-cyan-500';
    if (level >= 5) return 'from-green-500 to-emerald-500';
    return 'from-gray-500 to-slate-500';
  };

  return (
    <div className="min-h-screen bg-background overflow-y-auto">
      {/* Header with Hero Section */}
      <div className="relative">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background" />
        
        {/* Navigation */}
        <div className="relative z-10 flex items-center justify-between p-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon" onClick={handleToggleFavorite} className="rounded-full">
              <Heart className={`w-5 h-5 ${isFavorited ? 'fill-red-500 text-red-500' : ''}`} />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleShareProfile} className="rounded-full">
              <Share2 className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Hero Profile Section */}
        <div className="relative z-10 px-4 pb-6">
          <div className="flex items-start space-x-4">
            {/* Avatar */}
            <div className="relative">
              <Avatar className="w-20 h-20 border-4 border-white shadow-lg">
                <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                  {driver.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className={`absolute -bottom-1 -right-1 w-6 h-6 ${getAvailabilityColor(driver.availability)} rounded-full border-3 border-white flex items-center justify-center`}>
                <div className="w-2 h-2 bg-white rounded-full" />
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <h1 className="text-xl font-medium">{driver.name}</h1>
                    {driver.verified && (
                      <CheckCircle className="w-5 h-5 text-blue-500" />
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-2">
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="font-medium">{driver.rating}</span>
                      <span>({driver.reviewCount})</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Package className="w-4 h-4" />
                      <span>{driver.totalTrips} viagens</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className={`bg-gradient-to-r ${getLevelColor(driver.level)} text-white border-0`}>
                      <Trophy className="w-3 h-3 mr-1" />
                      Nível {driver.level}
                    </Badge>
                    <Badge variant={driver.availability === 'available' ? 'default' : 'secondary'} 
                           className={driver.availability === 'available' ? 'bg-green-500 hover:bg-green-600' : ''}>
                      {getAvailabilityText(driver.availability)}
                    </Badge>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="text-right">
                  <div className="font-medium text-primary">
                    R$ {driver.priceRange.min.toLocaleString('pt-BR')} - {driver.priceRange.max.toLocaleString('pt-BR')}
                  </div>
                  <div className="text-xs text-muted-foreground">Faixa de preço</div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats Cards */}
          <div className="grid grid-cols-2 gap-3 mt-6">
            <Card className="text-center">
              <CardContent className="p-3">
                <div className="flex items-center justify-center space-x-1 mb-1">
                  <Package className="w-4 h-4 text-blue-500" />
                  <span className="font-medium">{driver.totalTrips}</span>
                </div>
                <div className="text-xs text-muted-foreground">Total de Viagens</div>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="p-3">
                <div className="flex items-center justify-center space-x-1 mb-1">
                  <Calendar className="w-4 h-4 text-purple-500" />
                  <span className="font-medium">
                    {Math.floor((new Date().getTime() - new Date(driver.memberSince).getTime()) / (1000 * 60 * 60 * 24 * 365))}a
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">Experiência</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-4 pb-4">
        <div className="grid grid-cols-4 gap-2">
          <Button 
            onClick={handleContractDriver}
            disabled={driver.availability === 'offline'}
            className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm h-9"
            size="sm"
          >
            <CheckCircle className="w-4 h-4 mr-1" />
            Contratar
          </Button>
          <Button 
            variant="outline" 
            onClick={handleWhatsAppContact}
            className="border-green-200 text-green-600 hover:bg-green-50 text-sm h-9"
            size="sm"
          >
            <MessageCircle className="w-4 h-4 mr-1" />
            WhatsApp
          </Button>
          <Button 
            variant="outline"
            onClick={handleCopyPhone}
            className="text-sm h-9"
            size="sm"
          >
            <Phone className="w-4 h-4 mr-1" />
            Ligar
          </Button>
          <Button 
            variant="outline"
            onClick={() => setShowRatingDialog(true)}
            className="text-sm h-9 border-yellow-200 text-yellow-600 hover:bg-yellow-50"
            size="sm"
          >
            <Star className="w-4 h-4 mr-1" />
            Avaliar
          </Button>
        </div>
      </div>

      {/* Rating Dialog */}
      {user && (
        <RatingDialog
          open={showRatingDialog}
          onOpenChange={setShowRatingDialog}
          targetUser={{
            id: driver.id,
            name: driver.name,
            type: 'caminhoneiro'
          }}
          currentUser={user}
          onSuccess={async () => {
            console.log('🎉 [DriverDetailScreen] Avaliação enviada com sucesso! Recarregando...');
            
            // Recarregar avaliações após submissão bem-sucedida
            try {
              const ratingsResponse = await database.ratings.getByDriver(driver.id, { limit: 100 });
              console.log('📊 [DriverDetailScreen] Resposta após recarregar:', {
                success: ratingsResponse.success,
                count: ratingsResponse.data?.length || 0,
                data: ratingsResponse.data
              });
              
              if (ratingsResponse.success && ratingsResponse.data) {
                setRatings(ratingsResponse.data);
                console.log('✅ [DriverDetailScreen] Avaliações atualizadas! Total:', ratingsResponse.data.length);
              } else {
                console.log('⚠️ [DriverDetailScreen] Nenhuma avaliação retornada após reload');
              }
            } catch (error) {
              console.error('❌ [DriverDetailScreen] Erro ao recarregar avaliações:', error);
            }
          }}
        />
      )}

      {/* Tabs Content */}
      <div className="px-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="location">Localização</TabsTrigger>
            <TabsTrigger value="reviews">Avaliações</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Vehicle Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Truck className="w-5 h-5" />
                  <span>Informações do Veículo</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Modelo</div>
                    <div className="font-medium">{driver.vehicleModel}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Placa</div>
                    <div className="font-medium">{driver.licensePlate}</div>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <div className="text-sm text-muted-foreground mb-2">Especialidades</div>
                  <div className="flex flex-wrap gap-2">
                    {driver.specialties.map((specialty, idx) => (
                      <Badge key={idx} variant="outline" className="border-primary/20 text-primary">
                        {specialty}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Preferred Routes - Highlighted */}
            <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-background">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <MapPinned className="w-5 h-5 text-primary" />
                    <span>Para Onde Quer Ir</span>
                  </CardTitle>
                  <Badge className="bg-primary text-primary-foreground">
                    Rotas Publicadas
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground mb-4">
                  O motorista publicou essas rotas indicando interesse em fretes nessas direções
                </p>
                {driver.preferredRoutes.length > 0 ? (
                  <div className="space-y-3">
                    {driver.preferredRoutes.map((route, idx) => (
                      <div key={idx} className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-primary/20 hover:border-primary/40 transition-all">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Navigation className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{route}</p>
                          <p className="text-xs text-muted-foreground">Rota de preferência</p>
                        </div>
                        <Badge variant="outline" className="border-green-500 text-green-700 bg-green-50">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Ativo
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Motorista ainda não publicou rotas preferidas</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Coverage Area */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MapPin className="w-5 h-5" />
                  <span>Área de Cobertura</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <div className="text-sm text-muted-foreground mb-2">Estados de Atuação</div>
                  <div className="flex flex-wrap gap-2">
                    {driver.operatingStates.map((state, idx) => (
                      <Badge key={idx} variant="secondary" className="bg-blue-50 text-blue-700">
                        {state}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Phone className="w-5 h-5" />
                  <span>Contato</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-3 bg-surface-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                      <Phone className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="font-medium">{driver.phone}</div>
                      <div className="text-sm text-muted-foreground">Telefone principal</div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="ghost" size="sm" onClick={handleCopyPhone}>
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleWhatsAppContact} className="text-green-600">
                      <MessageCircle className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="mt-3 text-sm text-muted-foreground">
                  Membro desde {new Date(driver.memberSince).toLocaleDateString('pt-BR', { 
                    year: 'numeric', 
                    month: 'long' 
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="location" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MapPinned className="w-5 h-5" />
                  <span>Localização Atual</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <DriverLocationMap
                  coordinates={driver.location.coordinates}
                  cityName={`${driver.location.city}, ${driver.location.state}`}
                  driverName={driver.name}
                  className="h-64 rounded-b-lg"
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span>Localização Atual</span>
                    </div>
                    <span className="font-medium">{driver.location.city}, {driver.location.state}</span>
                  </div>
                  
                  {driver.destination && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Navigation className="w-4 h-4 text-blue-500" />
                        <span>Destino</span>
                      </div>
                      <span className="font-medium text-blue-600">
                        {formatLocation(driver.destination)}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Eye className="w-4 h-4 text-muted-foreground" />
                      <span>Última visualização</span>
                    </div>
                    <span className="font-medium">{driver.lastSeen}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reviews" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Star className="w-5 h-5" />
                    <span>Avaliações</span>
                  </div>
                  <Badge variant="secondary">{driver.reviewCount} avaliações</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4 mb-6">
                  <div className="text-center">
                    <div className="text-3xl font-medium">{driver.rating}</div>
                    <div className="flex items-center justify-center space-x-1 text-yellow-500">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-4 h-4 ${i < Math.floor(driver.rating) ? 'fill-current' : ''}`} />
                      ))}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="space-y-1">
                      {ratingDistribution.map(rating => (
                        <div key={rating.rating} className="flex items-center space-x-2">
                          <span className="text-sm w-3">{rating.rating}</span>
                          <Star className="w-3 h-3 text-yellow-500" />
                          <Progress value={rating.percentage} className="h-2" />
                          <span className="text-xs text-muted-foreground w-8">
                            {rating.percentage.toFixed(0)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              {ratings.length > 0 ? (
                ratings.map((review) => (
                  <Card key={review.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="font-medium">{review.evaluatorName}</div>
                          <div className="text-sm text-muted-foreground">{review.freightCode}</div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center space-x-1">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={`w-3 h-3 text-yellow-500 ${i < review.overallRating ? 'fill-current' : ''}`} />
                            ))}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(review.createdAt).toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                      </div>
                      {review.comment && <p className="text-sm">{review.comment}</p>}
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Star className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
                    <p className="text-muted-foreground">Nenhuma avaliação ainda</p>
                    <p className="text-sm text-muted-foreground mt-1">Este motorista ainda não recebeu avaliações</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Package className="w-5 h-5" />
                  <span>Histórico de Viagens</span>
                </CardTitle>
              </CardHeader>
            </Card>

            <div className="space-y-3">
              {completedFreights.length > 0 ? (
                completedFreights.map((trip) => (
                  <Card key={trip.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          </div>
                          <div>
                            <div className="font-medium">
                              {trip.origin} → {trip.destination}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(trip.deliveryDate || trip.createdAt).toLocaleDateString('pt-BR')}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-primary">
                            R$ {trip.price?.toLocaleString('pt-BR')}
                          </div>
                          <div className="text-xs text-muted-foreground">{trip.freightCode}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Package className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
                    <p className="text-muted-foreground">Nenhuma viagem completada</p>
                    <p className="text-sm text-muted-foreground mt-1">Este motorista ainda não completou viagens</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Bottom Spacing */}
      <div className="h-8" />
    </div>
  );
}