/**
 * PublicProfileView - Visualização pública do perfil de qualquer usuário
 * Acessível via /perfil/:id com URL compartilhável
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Separator } from './ui/separator';
import {
  ArrowLeft,
  Star,
  MapPin,
  Phone,
  MessageCircle,
  Copy,
  CheckCircle,
  Package,
  Truck,
  Award,
  Eye,
  Share2,
  Building,
  Calendar,
  Users,
  Shield,
  Heart,
  User as UserIcon,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { database } from '../utils/database';
import { getAvatarUrl } from '../utils/storage-helper';
import { generateDeepLinkUrl } from '../utils/deep-link';
import { copyToClipboard } from '../utils/clipboard-helper';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { PublicProfile } from '../utils/hooks/useProfileById';
import type { Rating } from '../utils/database/schema';
import type { User } from './contexts/AppContext';

interface PublicProfileViewProps {
  profile: PublicProfile;
  currentUser: User;
  onBack: () => void;
}

// User type labels
const USER_TYPE_LABELS: Record<string, string> = {
  caminhoneiro: 'Caminhoneiro',
  transportadora: 'Transportadora',
  embarcador: 'Embarcador',
  agenciador: 'Agenciador',
  shipper: 'Embarcador',
  carrier: 'Transportadora',
  driver: 'Motorista',
};

const USER_TYPE_ICONS: Record<string, React.ReactNode> = {
  caminhoneiro: <Truck className="w-3 h-3" />,
  transportadora: <Building className="w-3 h-3" />,
  embarcador: <Package className="w-3 h-3" />,
  agenciador: <Users className="w-3 h-3" />,
};

export function PublicProfileView({ profile, currentUser, onBack }: PublicProfileViewProps) {
  const navigate = useNavigate();
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loadingRatings, setLoadingRatings] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);

  const avatarUrl = useMemo(() => getAvatarUrl(profile.avatarUrl), [profile.avatarUrl]);
  const isOwnProfile = currentUser.id === profile.id;
  const isDriver = profile.userType === 'caminhoneiro';

  // Load ratings
  useEffect(() => {
    const loadRatings = async () => {
      setLoadingRatings(true);
      try {
        const response = await database.ratings.getByTarget(profile.id);
        if (response.success && response.data) {
          setRatings(response.data);
        }
      } catch (error) {
        console.error('❌ [PublicProfileView] Erro ao carregar avaliações:', error);
      } finally {
        setLoadingRatings(false);
      }
    };
    loadRatings();
  }, [profile.id]);

  // Load favorites status
  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const result = await database.favorites.isFavorite(currentUser.id, profile.id);
        if (result.success) {
          setIsFavorited(!!result.data);
        }
      } catch (error) {
        // Ignore
      }
    };
    if (!isOwnProfile) loadFavorites();
  }, [currentUser.id, profile.id, isOwnProfile]);

  // Record profile view
  useEffect(() => {
    const recordView = async () => {
      if (!isOwnProfile && currentUser.id && profile.id) {
        try {
          await database.profileViews.recordView(currentUser.id, profile.id);
        } catch (error) {
          console.error('❌ [PublicProfileView] Erro ao registrar visita:', error);
        }
      }
    };
    recordView();
  }, [profile.id, currentUser.id, isOwnProfile]);

  const handleOpenChat = () => {
    navigate('/chat', {
      state: {
        userId: profile.id,
        userName: profile.name,
      },
    });
    toast.success(`Abrindo chat com ${profile.name}`);
  };

  const handleWhatsApp = () => {
    if (!profile.phone) {
      toast.error('Telefone não disponível');
      return;
    }
    const phone = profile.phone.replace(/\D/g, '');
    const fullPhone = phone.startsWith('55') ? phone : `55${phone}`;
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
    const message = encodeURIComponent(
      `${greeting}, ${profile.name}! Vi seu perfil no MooveFretes e gostaria de conversar sobre uma oportunidade.`
    );
    window.open(`https://wa.me/${fullPhone}?text=${message}`, '_blank');
  };

  const handleCopyPhone = () => {
    if (profile.phone) {
      copyToClipboard(profile.phone, 'Telefone copiado!');
    } else {
      toast.error('Telefone não disponível');
    }
  };

  const handleShare = async () => {
    const deepLinkType = isDriver ? 'profile' : 'profile';
    const shareUrl = generateDeepLinkUrl(deepLinkType, profile.id);
    const shareText = `Perfil no MooveFretes:\n\n👤 ${profile.name}\n\n🔗 ${shareUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: `Perfil - ${profile.name}`, text: shareText, url: shareUrl });
      } catch {
        copyToClipboard(shareUrl, 'Link copiado!');
      }
    } else {
      copyToClipboard(shareUrl, 'Link do perfil copiado!');
    }
  };

  const handleToggleFavorite = async () => {
    if (isOwnProfile) return;

    try {
      if (isFavorited) {
        const result = await database.favorites.removeFavorite(currentUser.id, profile.id);
        if (result.success) {
          setIsFavorited(false);
          toast.success(`${profile.name} removido dos favoritos`);
        }
      } else {
        const result = await database.favorites.addFavorite(currentUser.id, profile.id);
        if (result.success) {
          setIsFavorited(true);
          toast.success(`${profile.name} adicionado aos favoritos!`);
        }
      }
    } catch {
      toast.error('Erro ao atualizar favoritos');
    }
  };

  const getTimeAgo = (date: string | null) => {
    if (!date) return 'Desconhecido';
    try {
      return formatDistanceToNow(new Date(date), { locale: ptBR, addSuffix: false });
    } catch {
      return 'Desconhecido';
    }
  };

  const memberSinceFormatted = profile.memberSince
    ? new Date(profile.memberSince).toLocaleDateString('pt-BR', {
        month: 'long',
        year: 'numeric',
      })
    : 'Desconhecido';

  // Rating stats
  const avgRating =
    ratings.length > 0
      ? ratings.reduce((sum, r) => sum + (r.overallRating ?? 0), 0) / ratings.length
      : profile.rating || 0;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header with back button */}
      <div className="sticky top-0 z-10 bg-white border-b px-4 py-3 flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
          <span style={{ fontSize: '14px' }}>Voltar</span>
        </button>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleShare} className="h-8 w-8">
            <Share2 className="w-4 h-4" />
          </Button>
          {!isOwnProfile && (
            <Button variant="ghost" size="icon" onClick={handleToggleFavorite} className="h-8 w-8">
              <Heart className={`w-4 h-4 ${isFavorited ? 'fill-red-500 text-red-500' : ''}`} />
            </Button>
          )}
        </div>
      </div>

      {/* Profile Hero */}
      <div className="relative bg-gradient-to-br from-primary/5 via-background to-background p-6 pb-4 border-b">
        <div className="flex items-start space-x-4">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={profile.name}
                className="w-20 h-20 rounded-full object-cover bg-gray-100 shadow-lg"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  if (e.currentTarget.nextElementSibling) {
                    (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                  }
                }}
              />
            ) : null}
            <div
              className="w-20 h-20 bg-primary rounded-full flex items-center justify-center text-white shadow-lg"
              style={{ display: avatarUrl ? 'none' : 'flex' }}
            >
              <UserIcon className="w-10 h-10" />
            </div>
            {/* Online indicator */}
            <div
              className={`absolute -bottom-1 -right-1 w-5 h-5 ${
                profile.isOnline ? 'bg-green-500' : 'bg-gray-400'
              } rounded-full border-2 border-white`}
            >
              <div className="w-2 h-2 bg-white rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Profile Info */}
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <h1 style={{ fontSize: '18px', fontWeight: 500 }}>{profile.name}</h1>
              {profile.verificationStatus === 'verified' && (
                <CheckCircle className="w-4 h-4 text-blue-500" />
              )}
            </div>

            <div className="flex items-center space-x-3 text-sm text-muted-foreground mb-2">
              <div className="flex items-center space-x-1">
                <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                <span>{avgRating.toFixed(1)}</span>
              </div>
              <span>•</span>
              <span>{profile.completedFreights} fretes</span>
              {profile.totalRatings > 0 && (
                <>
                  <span>•</span>
                  <span>{profile.totalRatings} avaliações</span>
                </>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="bg-primary/10 text-primary border-0 text-xs">
                {USER_TYPE_ICONS[profile.userType] || <UserIcon className="w-3 h-3" />}
                <span className="ml-1">
                  {USER_TYPE_LABELS[profile.userType] || profile.userType}
                </span>
              </Badge>
              {isDriver && profile.driver?.available && (
                <Badge className="bg-green-500 hover:bg-green-600 text-xs text-white">
                  Disponível
                </Badge>
              )}
              {isDriver && profile.driver && !profile.driver.available && (
                <Badge variant="secondary" className="text-xs">
                  Indisponível
                </Badge>
              )}
              {profile.verificationStatus === 'verified' && (
                <Badge variant="outline" className="text-xs border-green-200 text-green-700">
                  <Shield className="w-3 h-3 mr-1" />
                  Verificado
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="bg-white rounded-lg p-2 text-center border">
            <div className="flex items-center justify-center space-x-1 mb-1">
              <Package className="w-3 h-3 text-blue-500" />
              <span className="text-sm" style={{ fontWeight: 500 }}>
                {profile.completedFreights}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">Fretes</div>
          </div>
          <div className="bg-white rounded-lg p-2 text-center border">
            <div className="flex items-center justify-center space-x-1 mb-1">
              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
              <span className="text-sm" style={{ fontWeight: 500 }}>
                {avgRating.toFixed(1)}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">Nota</div>
          </div>
          <div className="bg-white rounded-lg p-2 text-center border">
            <div className="flex items-center justify-center space-x-1 mb-1">
              <Award className="w-3 h-3 text-purple-500" />
              <span className="text-sm" style={{ fontWeight: 500 }}>
                {ratings.length}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">Avaliações</div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {!isOwnProfile && (
        <div className="p-4 border-b bg-white">
          <div className="grid grid-cols-4 gap-2">
            <Button
              onClick={handleOpenChat}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm h-9"
              size="sm"
            >
              <MessageCircle className="w-3 h-3 mr-1" />
              Chat
            </Button>
            <Button
              variant="outline"
              onClick={handleWhatsApp}
              className="border-green-200 text-green-600 hover:bg-green-50 text-sm h-9"
              size="sm"
            >
              <MessageCircle className="w-3 h-3 mr-1" />
              WhatsApp
            </Button>
            <Button
              variant="outline"
              onClick={handleCopyPhone}
              className="text-sm h-9"
              size="sm"
            >
              <Phone className="w-3 h-3 mr-1" />
              Ligar
            </Button>
            <Button
              variant="outline"
              onClick={handleShare}
              className="text-sm h-9 border-blue-200 text-blue-600 hover:bg-blue-50"
              size="sm"
            >
              <Share2 className="w-3 h-3 mr-1" />
              Compartilhar
            </Button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview" className="flex-1 flex flex-col">
        <TabsList className="w-full bg-white justify-start px-4 h-12 gap-2 border-b">
          <TabsTrigger value="overview">
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="reviews">
            Avaliações ({ratings.length})
          </TabsTrigger>
          <TabsTrigger value="about">
            Sobre
          </TabsTrigger>
        </TabsList>

        {/* Tab: Visão Geral */}
        <TabsContent value="overview" className="flex-1 overflow-y-auto p-4 space-y-4 bg-background m-0">
          {/* Location */}
          {(profile.city || profile.state) && (
            <Card>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2 text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    <span>Localização</span>
                  </div>
                  <span style={{ fontWeight: 500 }}>
                    {[profile.city, profile.state].filter(Boolean).join(', ')}
                  </span>
                </div>

                {profile.lastSeen && (
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2 text-muted-foreground">
                      <Eye className="w-3 h-3" />
                      <span>Última vez ativo</span>
                    </div>
                    <span style={{ fontWeight: 500 }}>Há {getTimeAgo(profile.lastSeen)}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2 text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    <span>Membro desde</span>
                  </div>
                  <span style={{ fontWeight: 500 }}>{memberSinceFormatted}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Driver Vehicle Info */}
          {isDriver && profile.driver && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center space-x-2">
                  <Truck className="w-4 h-4" />
                  <span>Informações do Veículo</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {profile.driver.vehicleModel && (
                    <div>
                      <div className="text-xs text-muted-foreground">Modelo</div>
                      <div style={{ fontWeight: 500 }}>{profile.driver.vehicleModel}</div>
                    </div>
                  )}
                  {profile.driver.vehiclePlate && (
                    <div>
                      <div className="text-xs text-muted-foreground">Placa</div>
                      <div style={{ fontWeight: 500 }}>{profile.driver.vehiclePlate}</div>
                    </div>
                  )}
                  {profile.driver.vehicleYear && (
                    <div>
                      <div className="text-xs text-muted-foreground">Ano</div>
                      <div style={{ fontWeight: 500 }}>{profile.driver.vehicleYear}</div>
                    </div>
                  )}
                  {profile.driver.cnhCategory && (
                    <div>
                      <div className="text-xs text-muted-foreground">CNH</div>
                      <div style={{ fontWeight: 500 }}>{profile.driver.cnhCategory}</div>
                    </div>
                  )}
                </div>

                {profile.driver.specializations.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <div className="text-xs text-muted-foreground mb-2">Especialidades</div>
                      <div className="flex flex-wrap gap-1">
                        {profile.driver.specializations.map((spec, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs border-primary/20 text-primary">
                            {spec}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {profile.driver.vehicleTypes && profile.driver.vehicleTypes.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <div className="text-xs text-muted-foreground mb-2">Tipos de veículo</div>
                      <div className="flex flex-wrap gap-1">
                        {profile.driver.vehicleTypes.map((vt, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs bg-blue-50 text-blue-700">
                            {vt}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Company Info */}
          {!isDriver && profile.company && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center space-x-2">
                  <Building className="w-4 h-4" />
                  <span>Informações da Empresa</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {profile.company.tradeName && (
                    <div>
                      <div className="text-xs text-muted-foreground">Nome fantasia</div>
                      <div style={{ fontWeight: 500 }}>{profile.company.tradeName}</div>
                    </div>
                  )}
                  {profile.company.legalName && (
                    <div>
                      <div className="text-xs text-muted-foreground">Razão social</div>
                      <div style={{ fontWeight: 500 }}>{profile.company.legalName}</div>
                    </div>
                  )}
                  {profile.company.totalFleet > 0 && (
                    <div>
                      <div className="text-xs text-muted-foreground">Frota</div>
                      <div style={{ fontWeight: 500 }}>{profile.company.totalFleet} veículos</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Performance Stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center space-x-2">
                <TrendingUp className="w-4 h-4" />
                <span>Performance</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 bg-green-50 rounded-lg text-center">
                  <div className="text-lg text-green-700" style={{ fontWeight: 500 }}>
                    {profile.completedFreights}
                  </div>
                  <div className="text-xs text-green-600">Fretes concluídos</div>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg text-center">
                  <div className="text-lg text-blue-700" style={{ fontWeight: 500 }}>
                    {profile.totalFreights}
                  </div>
                  <div className="text-xs text-blue-600">Total de fretes</div>
                </div>
                {profile.cancelledFreights > 0 && (
                  <div className="p-3 bg-red-50 rounded-lg text-center">
                    <div className="text-lg text-red-700" style={{ fontWeight: 500 }}>
                      {profile.cancelledFreights}
                    </div>
                    <div className="text-xs text-red-600">Cancelados</div>
                  </div>
                )}
                {profile.totalFreights > 0 && (
                  <div className="p-3 bg-purple-50 rounded-lg text-center">
                    <div className="text-lg text-purple-700" style={{ fontWeight: 500 }}>
                      {profile.totalFreights > 0
                        ? Math.round((profile.completedFreights / profile.totalFreights) * 100)
                        : 0}
                      %
                    </div>
                    <div className="text-xs text-purple-600">Taxa de conclusão</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Contact */}
          {profile.phone && !isOwnProfile && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center space-x-2">
                  <Phone className="w-4 h-4" />
                  <span>Contato</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                      <Phone className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <div className="text-sm" style={{ fontWeight: 500 }}>
                        {profile.phone}
                      </div>
                      <div className="text-xs text-muted-foreground">Telefone principal</div>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <Button variant="ghost" size="sm" onClick={handleCopyPhone} className="h-7 w-7 p-0">
                      <Copy className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleWhatsApp}
                      className="h-7 w-7 p-0 text-green-600"
                    >
                      <MessageCircle className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
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
                <p className="text-sm text-muted-foreground mt-2">
                  Este usuário ainda não recebeu avaliações
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Rating Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Resumo das Avaliações</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                        <span className="text-2xl" style={{ fontWeight: 500 }}>
                          {avgRating.toFixed(1)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">Nota Média</p>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl mb-1" style={{ fontWeight: 500 }}>
                        {ratings.length}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {ratings.length === 1 ? 'Avaliação' : 'Avaliações'}
                      </p>
                    </div>
                  </div>

                  {/* Category averages */}
                  <div className="space-y-2">
                    {[
                      {
                        label: 'Pontualidade',
                        key: 'punctualityRating' as keyof Rating,
                      },
                      {
                        label: 'Comunicação',
                        key: 'communicationRating' as keyof Rating,
                      },
                      {
                        label: 'Profissionalismo',
                        key: 'professionalismRating' as keyof Rating,
                      },
                    ].map(({ label, key }) => {
                      const avg =
                        ratings.length > 0
                          ? ratings.reduce((sum, r) => sum + ((r as any)[key] ?? 0), 0) / ratings.length
                          : 0;
                      return (
                        <div key={label} className="flex justify-between items-center">
                          <span className="text-sm">{label}</span>
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm" style={{ fontWeight: 500 }}>
                              {avg.toFixed(1)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Ratings list */}
              <div className="space-y-4">
                <h3 className="text-sm px-1" style={{ fontWeight: 500 }}>
                  Avaliações Recebidas
                </h3>
                {ratings.map((rating) => (
                  <Card key={rating.id}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p style={{ fontWeight: 500 }}>{rating.evaluatorName}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(rating.createdAt).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span style={{ fontWeight: 500 }}>{(rating.overallRating ?? 0).toFixed(1)}</span>
                        </div>
                      </div>

                      {rating.comment && (
                        <p className="text-sm text-muted-foreground italic">"{rating.comment}"</p>
                      )}

                      <div className="grid grid-cols-3 gap-2 pt-2 border-t text-center">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Pontualidade</p>
                          <div className="flex items-center justify-center gap-0.5">
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-xs" style={{ fontWeight: 500 }}>
                              {(rating.punctualityRating ?? 0).toFixed(1)}
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Comunicação</p>
                          <div className="flex items-center justify-center gap-0.5">
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-xs" style={{ fontWeight: 500 }}>
                              {(rating.communicationRating ?? 0).toFixed(1)}
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Profissionalismo</p>
                          <div className="flex items-center justify-center gap-0.5">
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-xs" style={{ fontWeight: 500 }}>
                              {(rating.professionalismRating ?? 0).toFixed(1)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Badge variant="outline" className="text-xs">
                          {rating.evaluatorType === 'transportadora'
                            ? 'Transportadora'
                            : rating.evaluatorType === 'embarcador'
                            ? 'Embarcador'
                            : rating.evaluatorType === 'agenciador'
                            ? 'Agenciador'
                            : 'Motorista'}
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
          {/* Bio */}
          {profile.bio && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Sobre</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{profile.bio}</p>
              </CardContent>
            </Card>
          )}

          {/* General Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Informações Gerais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Tipo de conta</span>
                <span style={{ fontWeight: 500 }}>
                  {USER_TYPE_LABELS[profile.userType] || profile.userType}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Membro desde</span>
                <span style={{ fontWeight: 500 }}>{memberSinceFormatted}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Verificação</span>
                <Badge
                  variant={profile.verificationStatus === 'verified' ? 'default' : 'secondary'}
                  className={`text-xs ${
                    profile.verificationStatus === 'verified'
                      ? 'bg-green-100 text-green-700 hover:bg-green-100'
                      : ''
                  }`}
                >
                  {profile.verificationStatus === 'verified'
                    ? 'Verificado'
                    : profile.verificationStatus === 'pending'
                    ? 'Pendente'
                    : 'Rejeitado'}
                </Badge>
              </div>
              {(profile.city || profile.state) && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Localização</span>
                    <span style={{ fontWeight: 500 }}>
                      {[profile.city, profile.state].filter(Boolean).join(', ')}
                    </span>
                  </div>
                </>
              )}
              {isDriver && profile.driver && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Experiência</span>
                    <span style={{ fontWeight: 500 }}>
                      {profile.driver.experienceYears} anos
                    </span>
                  </div>
                  {profile.driver.rntrc && (
                    <>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">RNTRC</span>
                        <span style={{ fontWeight: 500 }}>{profile.driver.rntrc}</span>
                      </div>
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* If no bio or details */}
          {!profile.bio && (
            <Card>
              <CardContent className="p-8 text-center">
                <UserIcon className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Este usuário ainda não adicionou uma descrição ao perfil
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}