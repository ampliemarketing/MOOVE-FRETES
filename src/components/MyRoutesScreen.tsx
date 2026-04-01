import React, { useState, useEffect, useMemo } from 'react';
import { 
  MapPin, 
  Package, 
  Calendar, 
  DollarSign, 
  Clock, 
  Navigation,
  Phone,
  MessageSquare,
  MessageCircle,
  CheckCircle,
  Truck,
  ArrowRight,
  Eye,
  Filter,
  Search,
  Building2,
  TrendingUp,
  Star,
  Route,
  PlayCircle,
  FileText,
  AlertCircle,
  Award,
  PackageCheck,
  XCircle,
} from 'lucide-react';
import { getAvatarUrl } from '../utils/storage-helper';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Progress } from './ui/progress';
import { FreightDetailScreen } from './FreightDetailScreen';
import { motion } from 'motion/react';
import { toast } from 'sonner@2.0.3';
import type { User } from './contexts/AppContext';
import { database } from '../utils/database';
import type { Freight } from '../utils/database';
import { supabase } from '../utils/supabase/client';
import { LoadingSpinner } from './LoadingSpinner';
import { useMyQuotes } from '../hooks/useMyQuotes';
import type { MyRoute } from '../hooks/useMyQuotes';

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

interface MyRoutesScreenProps {
  user: User;
  onNavigateToChat?: (freightId: string, freightData?: any) => void;
  onNavigateToQuote?: (freightId: string) => void;
}

export function MyRoutesScreen({ user, onNavigateToChat, onNavigateToQuote }: MyRoutesScreenProps) {
  const [activeTab, setActiveTab] = useState<'pendentes' | 'timeline' | 'concluidas'>('timeline');
  const [selectedFreight, setSelectedFreight] = useState<Freight | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // ✅ USAR NOVO HOOK QUE BUSCA DIRETO DO SUPABASE
  const { myRoutes, loading, error, reload } = useMyQuotes(user?.id);

  // Converter MyRoute para Freight (para compatibilidade com FreightDetailScreen)
  const convertToFreight = (route: MyRoute): Freight => {
    return {
      id: route.freightId,
      freight_code: route.freight_code,
      customerId: '',
      customerName: '',
      type: 'regular',
      exposureLevel: 'Média exposição',
      origin: route.origin,
      destination: route.destination,
      cargo: route.cargo,
      cargoType: route.cargoType,
      weight: route.weight,
      truckType: '',
      category: '',
      price: route.price,
      pickupDate: route.pickupDate,
      deliveryDate: route.deliveryDate,
      status: route.status as any,
      observations: route.observations || '',
      views: 0,
      quotesCount: route.quotesCount || 0,
      createdAt: route.createdAt,
      updatedAt: route.createdAt,
      deadline: route.deadline
    } as Freight;
  };

  const getFilteredRoutes = () => {
    return myRoutes.filter(route => {
      // Filtro de busca
      const matchesSearch = 
        route.origin.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        route.destination.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        route.cargo.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      // Filtro por tab/status da cotação
      switch (activeTab) {
        case 'pendentes':
          return route.quoteStatus === 'pending';
        case 'timeline':
          // Timeline mostra rotas aceitas (em andamento + agendadas)
          return route.quoteStatus === 'accepted' && 
                 (route.status === 'in_transit' || route.status === 'in-transit' || 
                  route.status === 'accepted' || route.status === 'scheduled' || 
                  route.status === 'open');
        case 'concluidas':
          return route.quoteStatus === 'rejected' || 
                 route.status === 'completed' || 
                 route.status === 'delivered';
        default:
          return true;
      }
    });
  };

  const filteredRoutes = getFilteredRoutes();

  // Ordenar rotas da timeline por data (mais próxima primeiro)
  const sortedTimelineRoutes = [...filteredRoutes].sort((a, b) => {
    const dateA = new Date(a.pickupDate || a.createdAt).getTime();
    const dateB = new Date(b.pickupDate || b.createdAt).getTime();
    return dateA - dateB;
  });

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
      'in-transit': { label: 'Em Trânsito', variant: 'default', className: 'bg-blue-500 text-white border-blue-600' },
      'contracted': { label: 'Contratado', variant: 'secondary', className: 'bg-green-50 text-green-700 border-green-200' },
      'accepted': { label: 'Aceita', variant: 'secondary', className: 'bg-green-50 text-green-700 border-green-200' },
      'scheduled': { label: 'Agendado', variant: 'outline', className: 'bg-orange-50 text-orange-700 border-orange-200' },
      'completed': { label: 'Concluído', variant: 'secondary', className: 'bg-gray-100 text-gray-600 border-gray-200' },
    };

    const statusInfo = statusMap[status] || { label: status, variant: 'outline' };
    return <Badge variant={statusInfo.variant} className={statusInfo.className}>{statusInfo.label}</Badge>;
  };

  const getStatusCounts = () => {
    const pendingCount = myRoutes.filter(r => r.quoteStatus === 'pending').length;
    const timelineCount = myRoutes.filter(r => 
      r.quoteStatus === 'accepted' && 
      (r.status === 'in_transit' || r.status === 'in-transit' || 
       r.status === 'accepted' || r.status === 'scheduled' || 
       r.status === 'open')
    ).length;
    const completedCount = myRoutes.filter(r => 
      r.quoteStatus === 'rejected' || r.status === 'completed' || r.status === 'delivered'
    ).length;

    return {
      'pendentes': pendingCount,
      'timeline': timelineCount,
      'concluidas': completedCount,
    };
  };

  const statusCounts = getStatusCounts();

  // Verificar se a rota está em andamento (data de coleta passou ou não tem data)
  const isInProgress = (route: MyRoute) => {
    if (!route.pickupDate) return true; // Sem data = em andamento
    const pickupDate = new Date(route.pickupDate);
    pickupDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return pickupDate <= today; // Data chegou ou passou = em andamento
  };

  // ✅ ABRIR WHATSAPP COM MENSAGEM FORMATADA
  const openWhatsApp = (route: MyRoute) => {
    if (!route.publisherPhone) {
      toast.error('Telefone da empresa não disponível');
      return;
    }

    // Formatar telefone (remover caracteres não numéricos)
    const phone = route.publisherPhone.replace(/\D/g, '');
    
    // Criar mensagem personalizada
    const freightCode = route.freight_code || generateFreightCode(route.freightId);
    const companyName = route.publisherName || 'Empresa';
    const message = `Olá ${companyName}! Vi o frete ${freightCode} de ${route.origin.city}/${route.origin.state} para ${route.destination.city}/${route.destination.state} e gostaria de conversar sobre os detalhes.`;
    
    // Codificar mensagem para URL
    const encodedMessage = encodeURIComponent(message);
    
    // Abrir WhatsApp (funciona em mobile e desktop)
    const whatsappUrl = `https://wa.me/55${phone}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
    
    console.log('📱 [WhatsApp] Abrindo:', { phone, message });
  };

  // ✅ MARCAR ENTREGA COMO CONCLUÍDA (Motorista)
  const handleMarkAsCompleted = async (route: MyRoute) => {
    try {
      console.log('🚚 [MyRoutesScreen] Marcando entrega como concluída:', {
        routeId: route.id,
        freightId: route.freightId,
        currentStatus: route.status,
        quoteStatus: route.quoteStatus
      });
      
      // Atualizar o frete para status "completed" diretamente
      const result = await database.freights.update(route.freightId, {
        status: 'completed' as any
      });

      console.log('🔄 [MyRoutesScreen] Resultado da atualização:', result);

      if (result.success) {
        toast.success('Entrega marcada como concluída com sucesso!');
        
        // Criar notificação para o embarcador/transportadora
        await database.notifications.create({
          userId: route.publisherId, // ID do dono do frete
          type: 'delivery',
          title: 'Entrega concluída',
          message: `${user.name} concluiu a entrega do frete.`,
          icon: 'PackageCheck',
          read: false,
          actionUrl: `/freights/${route.freightId}`,
        });

        // ⏳ Aguardar um pouco para garantir que o Supabase processou
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Recarregar lista
        console.log('🔄 [MyRoutesScreen] Recarregando rotas...');
        await reload();
        
        // ✅ MUDAR AUTOMATICAMENTE PARA ABA "CONCLUÍDAS"
        setActiveTab('concluidas');
      } else {
        console.error('❌ [MyRoutesScreen] Erro ao marcar como concluída:', result.error);
        toast.error('Erro ao marcar como concluída');
      }
    } catch (error) {
      console.error('❌ [MyRoutesScreen] Erro ao marcar entrega:', error);
      toast.error('Erro ao marcar entrega como concluída');
    }
  };

  // Se mostrar detalhe de frete
  if (selectedFreight) {
    return (
      <FreightDetailScreen
        freight={selectedFreight}
        user={user}
        onBack={() => setSelectedFreight(null)}
        onUpdate={async () => {
          await reload();
          setSelectedFreight(null);
        }}
        onQuote={(freightId) => {
          setSelectedFreight(null);
          if (onNavigateToQuote) {
            onNavigateToQuote(freightId);
          } else {
            toast.success('Preparando cotação...');
          }
        }}
        onChat={(freightId, freightData) => {
          setSelectedFreight(null);
          if (onNavigateToChat) {
            onNavigateToChat(freightId, freightData);
          } else {
            toast.success('Abrindo chat...');
          }
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card">
        {/* Header removido */}
      </div>

      {/* Content */}
      <div className="px-0 py-0">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="w-full">
          <TabsList className="w-full justify-start bg-card/50 backdrop-blur-sm rounded-none h-auto p-0 border-b border-border sticky top-0 z-10">
            <div className="w-full px-4 py-3 flex gap-2 overflow-x-auto scrollbar-hide">
              <TabsTrigger 
                value="pendentes" 
                className="
                  rounded-lg px-4 py-2
                  data-[state=active]:bg-yellow-500/10 data-[state=active]:text-yellow-700 data-[state=active]:border data-[state=active]:border-yellow-500/30
                  data-[state=inactive]:bg-transparent data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-muted/50
                  transition-all duration-200
                  font-medium text-sm
                  whitespace-nowrap
                "
              >
                <Clock className="w-4 h-4 mr-2" />
                Pendentes
                {statusCounts['pendentes'] > 0 && (
                  <Badge 
                    variant="secondary" 
                    className="ml-2 bg-yellow-500 text-white border-0 h-5 min-w-5 flex items-center justify-center px-1.5"
                  >
                    {statusCounts['pendentes']}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="timeline" 
                className="
                  rounded-lg px-4 py-2
                  data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border data-[state=active]:border-primary/30
                  data-[state=inactive]:bg-transparent data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-muted/50
                  transition-all duration-200
                  font-medium text-sm
                  whitespace-nowrap
                "
              >
                <Navigation className="w-4 h-4 mr-2" />
                Minhas Rotas
                {statusCounts['timeline'] > 0 && (
                  <Badge 
                    variant="secondary" 
                    className="ml-2 bg-primary text-primary-foreground border-0 h-5 min-w-5 flex items-center justify-center px-1.5"
                  >
                    {statusCounts['timeline']}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="concluidas"
                className="
                  rounded-lg px-4 py-2
                  data-[state=active]:bg-green-500/10 data-[state=active]:text-green-700 data-[state=active]:border data-[state=active]:border-green-500/30
                  data-[state=inactive]:bg-transparent data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-muted/50
                  transition-all duration-200
                  font-medium text-sm
                  whitespace-nowrap
                "
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Concluídas
                {statusCounts['concluidas'] > 0 && (
                  <Badge 
                    variant="secondary" 
                    className="ml-2 bg-green-500 text-white border-0 h-5 min-w-5 flex items-center justify-center px-1.5"
                  >
                    {statusCounts['concluidas']}
                  </Badge>
                )}
              </TabsTrigger>
            </div>
          </TabsList>

          <TabsContent value={activeTab} className="mt-0">
            {loading ? (
              <LoadingSpinner message="Carregando rotas..." />
            ) : filteredRoutes.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-20 px-4"
              >
                <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center shadow-sm">
                  <Route className="w-12 h-12 text-muted-foreground/60" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {searchTerm 
                    ? 'Nenhuma rota encontrada' 
                    : activeTab === 'pendentes'
                      ? 'Nenhuma cotação pendente'
                      : activeTab === 'timeline' 
                      ? 'Nenhuma rota ativa'
                      : 'Nenhuma rota concluída'
                  }
                </h3>
                <p className="text-sm text-muted-foreground mb-8 max-w-md mx-auto">
                  {searchTerm 
                    ? 'Tente ajustar os filtros de busca'
                    : activeTab === 'pendentes'
                      ? 'Quando você enviar uma cotação, ela aparecerá aqui aguardando aprovação'
                      : activeTab === 'timeline' 
                      ? 'Suas rotas ativas e agendadas aparecerão aqui em ordem cronológica'
                      : 'Suas rotas finalizadas aparecerão aqui'
                  }
                </p>
                {!searchTerm && activeTab === 'timeline' && (
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-md">
                    <Search className="w-4 h-4 mr-2" />
                    Buscar Fretes Disponíveis
                  </Button>
                )}
              </motion.div>
            ) : activeTab === 'timeline' ? (
              // TIMELINE VIEW - Rotas em ordem cronológica
              <div className="relative p-4">
                
                <div className="space-y-6">
                  {sortedTimelineRoutes.map((route, index) => {
                    const inProgress = isInProgress(route);

                    // ✅ Converter publisherAvatar PATH → URL dinamicamente
                    const publisherAvatarUrl = getAvatarUrl(route.publisherAvatar);

                    return (
                      <motion.div
                        key={route.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                      >
                        <Card 
                          className="hover:shadow-xl transition-all duration-300 cursor-pointer border-l-4 group overflow-hidden relative"
                          style={{
                            borderLeftColor: inProgress ? '#22c55e' : '#9ca3af'
                          }}
                          onClick={() => setSelectedFreight(convertToFreight(route))}
                        >
                          {/* Hover effect overlay */}
                          <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/0 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                          
                          <CardContent className="p-0">
                            {/* Header com badges e data */}
                            <div className="flex items-start justify-between p-4 pb-3 bg-gradient-to-r from-muted/30 to-transparent border-b border-border/50">
                              <div className="flex items-center gap-2 flex-wrap self-center">
                                <Badge variant="outline" className="text-xs font-medium">
                                  {route.freight_code || generateFreightCode(route.freightId)}
                                </Badge>
                                {inProgress ? (
                                  <Badge className="bg-green-500/10 text-green-700 border border-green-500/30 font-medium">
                                    <PlayCircle className="w-3 h-3 mr-1" />
                                    Em Andamento
                                  </Badge>
                                ) : (
                                  <Badge className="bg-gray-500/10 text-gray-700 border border-gray-500/30 font-medium">
                                    <Calendar className="w-3 h-3 mr-1" />
                                    Agendada
                                  </Badge>
                                )}
                                {route.type === 'plus' && (
                                  <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-sm font-medium">
                                    <Star className="w-3 h-3 mr-1 fill-current" />
                                    Plus
                                  </Badge>
                                )}
                              </div>
                              
                              {/* Avatar e Data */}
                              <div className="flex items-center gap-3">
                                {/* Nome da Empresa */}
                                {route.publisherName && (
                                  <div className="text-right flex-shrink-0">
                                    <p className="text-sm font-semibold text-foreground">{route.publisherName}</p>
                                  </div>
                                )}
                                
                                {publisherAvatarUrl ? (
                                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border border-primary/20 shadow-sm overflow-hidden bg-white">
                                    <img 
                                      src={publisherAvatarUrl} 
                                      alt={route.publisherName || 'Empresa'}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        e.currentTarget.parentElement!.innerHTML = '<div class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6 text-primary"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg></div>';
                                      }}
                                    />
                                  </div>
                                ) : (
                                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 border border-primary/20 shadow-sm">
                                    <Building2 className="w-6 h-6 text-primary" />
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Conteúdo principal */}
                            <div className="p-4">
                              <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 items-center">
                                
                                {/* Coluna 1 - Rota */}
                                <div>
                                  <div className="space-y-1.5">
                                    {/* Origem */}
                                    <div className="flex items-center gap-2.5">
                                      <div className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0"></div>
                                      <span className="font-medium text-base text-foreground">
                                        {route.origin.city ? `${route.origin.city}, ${route.origin.state}` : `Origem, ${route.origin.state || 'UF'}`}
                                      </span>
                                    </div>
                                    
                                    {/* Destino */}
                                    <div className="flex items-center gap-2.5">
                                      <div className="w-2.5 h-2.5 rounded-full border-2 border-primary flex-shrink-0"></div>
                                      <span className="font-medium text-base text-foreground">
                                        {route.destination.city ? `${route.destination.city}, ${route.destination.state}` : `Destino, ${route.destination.state || 'UF'}`}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Coluna 2 - Valor */}
                                <div>
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1">Valor</p>
                                    <p className="text-lg font-bold text-green-600">
                                      {route.proposedPrice || route.price}
                                    </p>
                                  </div>
                                </div>

                                {/* Coluna 3 - Datas */}
                                <div>
                                  {(route.pickupDate || route.deliveryDate) && (
                                    <div className="flex flex-col gap-2">
                                      {route.pickupDate && (
                                        <div>
                                          <p className="text-xs text-muted-foreground">Coleta</p>
                                          <p className="text-sm font-semibold text-foreground mt-0.5">
                                            {new Date(route.pickupDate).toLocaleDateString('pt-BR', { 
                                              day: '2-digit', 
                                              month: 'short' 
                                            })}
                                          </p>
                                        </div>
                                      )}
                                      {route.deliveryDate && (
                                        <div>
                                          <p className="text-xs text-muted-foreground">Entrega</p>
                                          <p className="text-sm font-semibold text-foreground mt-0.5">
                                            {new Date(route.deliveryDate).toLocaleDateString('pt-BR', { 
                                              day: '2-digit', 
                                              month: 'short' 
                                            })}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* Coluna 4 - Botões de Ação */}
                                <div>
                                  <div className="flex flex-col gap-2 lg:min-w-[140px]">
                                    <Button
                                      className="w-full bg-white border-2 border-green-600 text-green-600 hover:bg-green-50 h-9"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openWhatsApp(route);
                                      }}
                                    >
                                      <MessageCircle className="w-4 h-4 mr-1.5" />
                                      WhatsApp
                                    </Button>
                                    <Button
                                      variant="outline"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toast.success('Abrindo chat...');
                                      }}
                                      className="w-full h-9"
                                    >
                                      <MessageCircle className="w-4 h-4 mr-1.5" />
                                      Chat
                                    </Button>
                                    
                                    {/* Botão Concluir Entrega - Apenas para caminhoneiros */}
                                    {user.userType === 'caminhoneiro' && inProgress && (
                                      <Button
                                        variant="default"
                                        className="w-full bg-green-600 hover:bg-green-700 text-white shadow-md h-9"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleMarkAsCompleted(route);
                                        }}
                                      >
                                        <PackageCheck className="w-4 h-4 mr-1.5" />
                                        Concluir Entrega
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ) : (
              // OUTRAS TABS - Layout normal de cards
              <div className="space-y-3 p-4">
                {filteredRoutes.map((route, index) => {
                  // ✅ Converter publisherAvatar PATH → URL dinamicamente
                  const publisherAvatarUrl = getAvatarUrl(route.publisherAvatar);

                  return (
                  <motion.div
                    key={route.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <Card 
                      className="hover:shadow-xl transition-all duration-300 cursor-pointer border-l-4 group overflow-hidden relative"
                      style={{
                        borderLeftColor: route.quoteStatus === 'pending' ? '#eab308' : 
                                        route.quoteStatus === 'rejected' ? '#ef4444' : 
                                        route.quoteStatus === 'accepted' ? '#22c55e' : '#253663'
                      }}
                      onClick={() => setSelectedFreight(convertToFreight(route))}
                    >
                      {/* Hover effect overlay */}
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/0 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                      
                      <CardContent className="p-0">
                        {/* Header com badges e logo */}
                        <div className="flex items-start justify-between p-4 pb-3 bg-gradient-to-r from-muted/30 to-transparent border-b border-border/50">
                          <div className="flex items-center gap-2 flex-wrap">
                            {route.quoteStatus === 'pending' && (
                              <Badge className="bg-yellow-500/10 text-yellow-700 border border-yellow-500/30 font-medium">
                                <Clock className="w-3 h-3 mr-1" />
                                Aguardando Aprovação
                              </Badge>
                            )}
                            {route.quoteStatus === 'rejected' && (
                              <Badge className="bg-red-500/10 text-red-700 border border-red-500/30 font-medium">
                                <XCircle className="w-3 h-3 mr-1" />
                                Recusada
                              </Badge>
                            )}
                            {route.quoteStatus === 'accepted' && (route.status === 'completed' || route.status === 'delivered') && (
                              <Badge className="bg-green-500/10 text-green-700 border border-green-500/30 font-medium">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Concluída
                              </Badge>
                            )}
                            {route.type === 'plus' && (
                              <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-sm font-medium">
                                <Star className="w-3 h-3 mr-1 fill-current" />
                                Plus
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs font-mono bg-background/50">
                              #{route.id.slice(0, 8)}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            {/* Nome da Empresa */}
                            {route.publisherName && (
                              <div className="text-right flex-shrink-0">
                                <p className="text-sm font-semibold text-foreground">{route.publisherName}</p>
                              </div>
                            )}
                            
                            {publisherAvatarUrl ? (
                              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border border-primary/20 shadow-sm overflow-hidden bg-white">
                                <img 
                                  src={publisherAvatarUrl} 
                                  alt={route.publisherName || 'Empresa'}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.parentElement!.innerHTML = '<div class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6 text-primary"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg></div>';
                                  }}
                                />
                              </div>
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 border border-primary/20 shadow-sm">
                                <Building2 className="w-6 h-6 text-primary" />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Conteúdo principal */}
                        <div className="p-4">
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-center">
                            
                            {/* Coluna 1: Origem e Destino */}
                            <div className="lg:col-span-1">
                              <div className="space-y-2">
                                {/* Origem */}
                                <div className="flex items-center gap-2.5">
                                  <div className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0"></div>
                                  <span className="font-medium text-base text-foreground">
                                    {route.origin.city ? `${route.origin.city}, ${route.origin.state}` : `Origem, ${route.origin.state || 'UF'}`}
                                  </span>
                                </div>
                                
                                {/* Destino */}
                                <div className="flex items-center gap-2.5">
                                  <div className="w-2.5 h-2.5 rounded-full border-2 border-primary flex-shrink-0"></div>
                                  <span className="font-medium text-base text-foreground">
                                    {route.destination.city ? `${route.destination.city}, ${route.destination.state}` : `Destino, ${route.destination.state || 'UF'}`}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Coluna 2: Sua Oferta */}
                            <div className="lg:col-span-1">
                              <div className="flex flex-col">
                                <p className="text-xs text-muted-foreground mb-1">
                                  {route.quoteStatus === 'pending' ? 'Sua Oferta' : 'Valor'}
                                </p>
                                <p className={`text-lg font-bold ${
                                  route.quoteStatus === 'rejected' 
                                    ? 'text-red-600 line-through' 
                                    : 'text-green-600'
                                }`}>
                                  {route.proposedPrice || route.price}
                                </p>
                                {route.deliveryDate && (
                                  <div className="mt-2">
                                    <p className="text-xs text-muted-foreground mb-1">Prazo</p>
                                    <p className="text-sm font-semibold text-foreground">
                                      {new Date(route.deliveryDate).toLocaleDateString('pt-BR', { 
                                        day: '2-digit', 
                                        month: 'short' 
                                      })}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Coluna 3: Botões de Ação */}
                            <div className="lg:col-span-1">
                              <div className="flex flex-col gap-2">
                                <Button
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toast.success('Abrindo chat...');
                                  }}
                                  className="w-full hover:bg-primary/5 hover:text-primary hover:border-primary/30"
                                >
                                  <MessageSquare className="w-4 h-4 mr-1.5" />
                                  Chat
                                </Button>
                                <Button
                                  size="sm"
                                  className="w-full bg-green-600 hover:bg-green-700 text-white shadow-sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openWhatsApp(route);
                                  }}
                                >
                                  <MessageCircle className="w-4 h-4 mr-1.5" />
                                  WhatsApp
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}