import React, { useState, useEffect } from 'react';
import { Star, MapPin, Phone, Mail, Building2, Package, CheckCircle, MessageCircle, Shield, Globe, Calendar, TrendingUp, Award, Loader2, Copy, Eye, FileText, MapPinned, Activity, RefreshCw, Heart, Truck, DollarSign, Share2 } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Progress } from './ui/progress';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { database } from '../utils/database';
import type { Freight, Rating } from '../utils/database/schema';
import type { User } from './contexts/AppContext';
import { LoadingSpinner } from './LoadingSpinner';
import { copyToClipboard } from '../utils/clipboard-helper';
import { ImageWithFallback } from './ImageWithFallback';
import { toast } from 'sonner';
import { RatingDialog } from './RatingDialog';
import { formatLocation, isValidLocation } from '../utils/location-helpers';
import { generateDeepLinkUrl } from '../utils/deep-link';

// Função para gerar código de frete no padrão de placa brasileira Mercosul (AAA0A00) - FALLBACK
const generateFreightCode = (id: string): string => {
  const chars = id.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  const letters = chars.replace(/[0-9]/g, '');
  const numbers = chars.replace(/[A-Z]/g, '');
  const l1 = letters[0] || 'A';
  const l2 = letters[1] || 'B';
  const l3 = letters[2] || 'C';
  const l4 = letters[3] || 'D';
  const n1 = numbers[0] || '0';
  const n2 = numbers[1] || '0';
  const n3 = numbers[2] || '0';
  return `#${l1}${l2}${l3}${n1}${l4}${n2}${n3}`;
};

interface CompanyStats {
  totalFreights: number;
  activeFreights: number;
  completedFreights: number;
  inTransitFreights: number;
  averageRating: number;
  reviewCount: number;
  successRate: number;
}

interface Company {
  id: string;
  userId: string;
  name: string;
  type: 'transportadora' | 'embarcador' | 'agenciador';
  cnpj: string;
  phone: string;
  email: string;
  logo?: string;
  location: {
    city: string;
    state: string;
  };
  address?: {
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    cep?: string;
  };
  verified: boolean;
  memberSince: string;
  description?: string;
  website?: string;
  stats: CompanyStats;
}

interface CompanyDetailContentProps {
  company: Company;
  user: User;
  onSendMessage: (freightId?: string) => void;
  onViewFreight?: (freightId: string) => void;
  onWhatsAppContact?: () => void;
}

export function CompanyDetailContent({ company, user, onSendMessage, onViewFreight, onWhatsAppContact }: CompanyDetailContentProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isFavorited, setIsFavorited] = useState(false);
  const [freights, setFreights] = useState<Freight[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showRatingDialog, setShowRatingDialog] = useState(false);

  // Carregar dados da empresa do Supabase
  useEffect(() => {
    loadCompanyData();
  }, [company.userId]);

  const loadCompanyData = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {

      // Buscar fretes e avaliações em paralelo
      const [freightsResponse, ratingsResponse] = await Promise.all([
        database.freights.getByCustomer(company.userId, { limit: 100 }),
        database.ratings.getByDriver(company.userId, { limit: 100 })
      ]);

      // Processar fretes
      if (freightsResponse.success && freightsResponse.data) {
        setFreights(freightsResponse.data);
      } else {
        setFreights([]);
      }

      // Processar avaliações
      if (ratingsResponse.success && ratingsResponse.data) {
        setRatings(ratingsResponse.data);
      } else {
        setRatings([]);
      }

      if (isRefresh) {
        toast.success('Dados atualizados!');
      }
    } catch (error) {
      console.error('❌ Erro ao carregar dados da empresa:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Filtrar fretes ativos, excluindo inativos (a menos que seja o próprio dono ou colaborador)
  const activeFreights = freights.filter(f => {
    // Mostrar apenas fretes ativos
    if (f.status !== 'active') return false;
    
    // Se o frete está com status 'inactive', não mostrar (já filtrado acima, mas garantindo)
    // A API já filtra fretes inativos para outros usuários
    return true;
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

    const resolvedId = user?.collaborator?.companyId || user.id;
    const driverName = user?.collaborator?.companyName || user.name;
    const driverId = resolvedId;
    const companyId = company.userId;
    
    const today = new Date().toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
    
    const message = `*Olá ${company.name}, sou ${driverName} e trabalho com transporte de cargas.*

🚛 *Meu perfil:*
${generateDeepLinkUrl('profile', driverId)}

🏢 *Perfil da empresa:*
${generateDeepLinkUrl('profile', companyId)}

*Podemos conversar sobre fretes?* 📦`;

    const phone = company.phone.replace(/\D/g, '');
    const url = `https://api.whatsapp.com/send?phone=55${phone}&text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    toast.success(`Abrindo WhatsApp para ${company.name}`);
  };

  const handleCopyPhone = () => {
    copyToClipboard(company.phone, 'Telefone copiado para a área de transferência');
  };

  const handleCopyEmail = () => {
    copyToClipboard(company.email, 'E-mail copiado para a área de transferência');
  };

  const handleToggleFavorite = () => {
    setIsFavorited(!isFavorited);
    toast.success(isFavorited ? 
      `${company.name} removido dos favoritos` : 
      `${company.name} adicionado aos favoritos!`
    );
  };

  const handleShareProfile = async () => {
    const shareUrl = generateDeepLinkUrl('profile', company.userId);
    const shareText = `Veja este perfil no MooveFretes:\n\n🏢 ${company.name}\n\n🔗 ${shareUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: `Perfil - ${company.name}`, text: shareText, url: shareUrl });
      } catch {
        copyToClipboard(shareUrl, 'Link do perfil copiado!');
      }
    } else {
      copyToClipboard(shareUrl, 'Link do perfil copiado!');
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'transportadora': return 'Transportadora';
      case 'embarcador': return 'Embarcador';
      case 'agenciador': return 'Agenciador';
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'transportadora': return 'from-blue-500 to-cyan-500';
      case 'embarcador': return 'from-green-500 to-emerald-500';
      case 'agenciador': return 'from-purple-500 to-pink-500';
      default: return 'from-gray-500 to-slate-500';
    }
  };

  // Calcular distribuição de ratings
  const getRatingDistribution = () => {
    if (ratings.length === 0) return [0, 0, 0, 0, 0];
    
    const distribution = [0, 0, 0, 0, 0];
    ratings.forEach(rating => {
      const index = Math.floor(rating.overallRating) - 1;
      if (index >= 0 && index < 5) {
        distribution[index]++;
      }
    });
    
    return distribution.map(count => (count / ratings.length) * 100);
  };

  const ratingDistribution = getRatingDistribution();

  return (
    <div className="flex flex-col h-full">
      {/* Header Hero */}
      <div className="relative bg-gradient-to-br from-primary/5 via-background to-background p-6 pb-4 border-b">
        <div className="flex items-start space-x-4">
          {/* Logo/Avatar */}
          <div className="relative flex-shrink-0">
            {company.logo ? (
              <ImageWithFallback
                src={company.logo}
                alt={company.name}
                className="w-16 h-16 rounded-lg object-cover border-4 border-white shadow-lg"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-surface-100 border-4 border-white shadow-lg flex items-center justify-center">
                <Building2 className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
            {company.verified && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                <CheckCircle className="w-3 h-3 text-white" />
              </div>
            )}
          </div>

          {/* Profile Info */}
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <h2 className="text-lg font-medium">{company.name}</h2>
                  {company.verified && (
                    <CheckCircle className="w-4 h-4 text-blue-500" />
                  )}
                </div>
                
                <div className="flex items-center space-x-3 text-sm text-muted-foreground mb-2">
                  <div className="flex items-center space-x-1">
                    <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                    <span>{(company.stats.averageRating ?? 0).toFixed(1)}</span>
                  </div>
                  <span>•</span>
                  <span>{company.stats.reviewCount} {company.stats.reviewCount === 1 ? 'avaliação' : 'avaliações'}</span>
                  <span>•</span>
                  <span>{company.stats.totalFreights} fretes</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className={`bg-gradient-to-r ${getTypeColor(company.type)} text-white border-0 text-xs`}>
                    <Building2 className="w-3 h-3 mr-1" />
                    {getTypeLabel(company.type)}
                  </Badge>
                  {company.verified && (
                    <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-xs">
                      <Shield className="w-3 h-3 mr-1" />
                      Verificada
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => loadCompanyData(true)} disabled={refreshing}>
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleToggleFavorite}>
                  <Heart className={`w-5 h-5 ${isFavorited ? 'fill-red-500 text-red-500' : ''}`} />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="bg-white rounded-lg p-2 text-center border">
            <div className="flex items-center justify-center space-x-1 mb-1">
              <Activity className="w-3 h-3 text-blue-500" />
              <span className="text-sm font-medium">{company.stats.activeFreights}</span>
            </div>
            <div className="text-xs text-muted-foreground">Fretes Ativos</div>
          </div>
          <div className="bg-white rounded-lg p-2 text-center border">
            <div className="flex items-center justify-center space-x-1 mb-1">
              <CheckCircle className="w-3 h-3 text-green-500" />
              <span className="text-sm font-medium">{company.stats.completedFreights}</span>
            </div>
            <div className="text-xs text-muted-foreground">Concluídos</div>
          </div>
          <div className="bg-white rounded-lg p-2 text-center border">
            <div className="flex items-center justify-center space-x-1 mb-1">
              <TrendingUp className="w-3 h-3 text-purple-500" />
              <span className="text-sm font-medium">{company.stats.successRate}%</span>
            </div>
            <div className="text-xs text-muted-foreground">Taxa Sucesso</div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-4 border-b bg-white">
        <div className="grid grid-cols-5 gap-2 mb-3">
          <Button 
            variant="default"
            size="sm"
            onClick={() => onSendMessage()}
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Mensagem
          </Button>
          <Button 
            variant="outline" 
            onClick={handleWhatsAppContact}
            className="border-green-200 text-green-600 hover:bg-green-50 text-sm h-9"
            size="sm"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            WhatsApp
          </Button>
          <Button 
            variant="outline"
            onClick={handleCopyPhone}
            className="text-sm h-9"
            size="sm"
          >
            <Phone className="w-4 h-4 mr-2" />
            Ligar
          </Button>
          <Button 
            variant="outline"
            onClick={() => setShowRatingDialog(true)}
            className="text-sm h-9 border-yellow-200 text-yellow-600 hover:bg-yellow-50"
            size="sm"
          >
            <Star className="w-4 h-4 mr-2" />
            Avaliar
          </Button>
          <Button 
            variant="outline"
            onClick={handleShareProfile}
            className="text-sm h-9 border-blue-200 text-blue-600 hover:bg-blue-50"
            size="sm"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Compartilhar
          </Button>
        </div>
      </div>

      {/* Rating Dialog */}
      <RatingDialog
        open={showRatingDialog}
        onOpenChange={setShowRatingDialog}
        targetUser={{
          id: company.userId,
          name: company.name,
          type: company.type
        }}
        currentUser={user}
        onSuccess={() => loadCompanyData(true)}
      />

      {/* Tabs Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <LoadingSpinner message="Carregando dados..." />
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              <TabsTrigger value="freights">
                Fretes
                {activeFreights.length > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">{activeFreights.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="reviews">
                Avaliações
                {ratings.length > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">{ratings.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="about">Sobre</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {/* Company Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Building2 className="w-5 h-5" />
                    <span>Informações da Empresa</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex items-center justify-between p-3 bg-surface-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">CNPJ</div>
                          <div className="font-medium">{company.cnpj}</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-surface-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                          <Phone className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Telefone</div>
                          <div className="font-medium">{company.phone}</div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={handleCopyPhone}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-surface-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <Mail className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">E-mail</div>
                          <div className="font-medium">{company.email}</div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={handleCopyEmail}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>

                    {company.website && (
                      <div className="flex items-center justify-between p-3 bg-surface-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                            <Globe className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">Website</div>
                            <div className="font-medium">{company.website}</div>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => window.open(`https://${company.website}`, '_blank')}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Location */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <MapPinned className="w-5 h-5" />
                    <span>Localização</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start space-x-3 p-4 bg-surface-50 rounded-lg">
                    <MapPin className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <div className="font-medium mb-1">
                        {company.location.city} - {company.location.state}
                      </div>
                      {company.address && (
                        <div className="text-sm text-muted-foreground space-y-0.5">
                          {company.address.street && company.address.number && (
                            <div>
                              {company.address.street}, {company.address.number}
                              {company.address.complement && ` - ${company.address.complement}`}
                            </div>
                          )}
                          {company.address.neighborhood && (
                            <div>{company.address.neighborhood}</div>
                          )}
                          {company.address.cep && (
                            <div>CEP: {company.address.cep}</div>
                          )}
                        </div>
                      )}
                      {!company.address?.street && (
                        <div className="text-sm text-muted-foreground">Endereço não informado</div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="freights" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Package className="w-5 h-5" />
                      <span>Fretes Disponíveis</span>
                    </div>
                    <Badge variant="secondary">{activeFreights.length} ativos</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {activeFreights.length === 0 ? (
                    <div className="text-center py-8">
                      <Package className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                      <p className="text-sm text-muted-foreground">Nenhum frete ativo no momento</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Esta empresa não possui fretes disponíveis para cotação
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activeFreights.map((freight) => (
                        <div
                          key={freight.id}
                          className="border rounded-lg p-4 hover:border-primary transition-colors"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-xs">
                                  {freight.freight_code || generateFreightCode(freight.id)}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {typeof freight.cargo === 'string' ? freight.cargo : freight.cargo.type}
                                </Badge>
                                {freight.type === 'plus' && (
                                  <Badge className="text-xs bg-yellow-100 text-yellow-800">
                                    PLUS
                                  </Badge>
                                )}
                              </div>
                              <div className="font-medium mb-1">
                                {freight.origin?.city || 'N/A'}/{freight.origin?.state || 'N/A'} → {freight.destination?.city || 'N/A'}/{freight.destination?.state || 'N/A'}
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Package className="w-3 h-3" />
                                  {freight.weight}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Truck className="w-3 h-3" />
                                  {freight.truckType}
                                </div>
                                {freight.price && freight.price !== 'A combinar' && (
                                  <div className="flex items-center gap-1 col-span-2">
                                    <DollarSign className="w-3 h-3" />
                                    R$ {freight.price}
                                  </div>
                                )}
                              </div>
                            </div>
                            {onViewFreight && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onViewFreight(freight.id)}
                              >
                                Ver
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
                    <Badge variant="secondary">{ratings.length} {ratings.length === 1 ? 'avaliação' : 'avaliações'}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {ratings.length === 0 ? (
                    <div className="text-center py-8">
                      <Star className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                      <p className="text-sm text-muted-foreground">Nenhuma avaliação ainda</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Esta empresa ainda não recebeu avaliações
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center space-x-4 mb-6">
                        <div className="text-center">
                          <div className="text-3xl font-medium">{(company.stats.averageRating ?? 0).toFixed(1)}</div>
                          <div className="flex items-center justify-center space-x-1 text-yellow-500">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={`w-4 h-4 ${i < Math.floor(company.stats.averageRating ?? 0) ? 'fill-current' : ''}`} />
                            ))}
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="space-y-1">
                            {[5, 4, 3, 2, 1].map((rating, index) => (
                              <div key={rating} className="flex items-center space-x-2">
                                <span className="text-sm w-3">{rating}</span>
                                <Star className="w-3 h-3 text-yellow-500" />
                                <Progress value={ratingDistribution[4 - index]} className="h-2" />
                                <span className="text-xs text-muted-foreground w-12">
                                  {ratingDistribution[4 - index].toFixed(0)}%
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <Separator className="my-4" />

                      <div className="space-y-3">
                        {ratings.map((rating) => (
                          <Card key={rating.id}>
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <div className="font-medium">{rating.evaluatorName}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {rating.evaluatorType === 'embarcador' ? 'Embarcador' : 
                                     rating.evaluatorType === 'transportadora' ? 'Transportadora' : 'Caminhoneiro'}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="flex items-center space-x-1">
                                    {[...Array(5)].map((_, i) => (
                                      <Star key={i} className={`w-3 h-3 text-yellow-500 ${i < rating.overallRating ? 'fill-current' : ''}`} />
                                    ))}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {new Date(rating.createdAt).toLocaleDateString('pt-BR')}
                                  </div>
                                </div>
                              </div>
                              <p className="text-sm">{rating.comment}</p>
                              
                              {/* Detalhes da avaliação */}
                              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t">
                                <div className="text-xs">
                                  <div className="text-muted-foreground">Pontualidade</div>
                                  <div className="flex items-center gap-1">
                                    {[...Array(5)].map((_, i) => (
                                      <Star key={i} className={`w-2 h-2 text-yellow-500 ${i < rating.punctualityRating ? 'fill-current' : ''}`} />
                                    ))}
                                  </div>
                                </div>
                                <div className="text-xs">
                                  <div className="text-muted-foreground">Comunicação</div>
                                  <div className="flex items-center gap-1">
                                    {[...Array(5)].map((_, i) => (
                                      <Star key={i} className={`w-2 h-2 text-yellow-500 ${i < rating.communicationRating ? 'fill-current' : ''}`} />
                                    ))}
                                  </div>
                                </div>
                                <div className="text-xs">
                                  <div className="text-muted-foreground">Profissionalismo</div>
                                  <div className="flex items-center gap-1">
                                    {[...Array(5)].map((_, i) => (
                                      <Star key={i} className={`w-2 h-2 text-yellow-500 ${i < rating.professionalismRating ? 'fill-current' : ''}`} />
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="about" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="w-5 h-5" />
                    <span>Sobre a Empresa</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {company.description ? (
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {company.description}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhuma descrição disponível
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Calendar className="w-5 h-5" />
                    <span>Histórico</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-surface-50 rounded-lg">
                      <span className="text-sm">Membro desde</span>
                      <span className="font-medium">
                        {new Date(company.memberSince).toLocaleDateString('pt-BR', { 
                          year: 'numeric', 
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-surface-50 rounded-lg">
                      <span className="text-sm">Total de fretes</span>
                      <span className="font-medium">{company.stats.totalFreights}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-surface-50 rounded-lg">
                      <span className="text-sm">Fretes ativos</span>
                      <span className="font-medium">{company.stats.activeFreights}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-surface-50 rounded-lg">
                      <span className="text-sm">Fretes concluídos</span>
                      <span className="font-medium">{company.stats.completedFreights}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-surface-50 rounded-lg">
                      <span className="text-sm">Fretes em trânsito</span>
                      <span className="font-medium">{company.stats.inTransitFreights}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-surface-50 rounded-lg">
                      <span className="text-sm">Taxa de sucesso</span>
                      <span className="font-medium">{company.stats.successRate}%</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-surface-50 rounded-lg">
                      <span className="text-sm">Status</span>
                      <Badge variant={company.verified ? 'default' : 'secondary'}>
                        {company.verified ? 'Verificada' : 'Não verificada'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}