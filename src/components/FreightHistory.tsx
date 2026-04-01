import React, { useState, useMemo, useEffect } from 'react';
import { 
  Package, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  Filter,
  Search,
  TrendingUp,
  Star,
  FileText
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { motion, AnimatePresence } from 'motion/react';
import type { User } from './contexts/AppContext';
import { getSupabaseClient } from '../utils/supabase/client';
import { toast } from 'sonner@2.0.3';

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

interface FreightHistoryProps {
  user: User;
}

interface HistoricalFreight {
  id: string;
  freight_code?: string; // Código único no padrão placa brasileira (AAA0A00)
  title: string;
  origin: { city: string; state: string };
  destination: { city: string; state: string };
  value: number;
  status: 'completed' | 'cancelled' | 'in-transit';
  startDate: string;
  completionDate?: string;
  rating?: number;
  driverName?: string;
  carrierName?: string;
  distance: number;
  weight: number;
  type: string;
}

export function FreightHistory({ user }: FreightHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'cancelled'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'value' | 'rating'>('date');
  const [timeRange, setTimeRange] = useState<'30d' | '90d' | '1y' | 'all'>('90d');
  const [historicalFreights, setHistoricalFreights] = useState<HistoricalFreight[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ Resolver companyId: se for colaborador, usar o companyId da empresa vinculada
  const resolvedCompanyId = user?.collaborator?.companyId || user?.id || '';

  // 🔥 CARREGAR HISTÓRICO REAL DO SUPABASE
  useEffect(() => {
    loadHistoricalFreights();
  }, [resolvedCompanyId]);

  const loadHistoricalFreights = async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      
      // Buscar fretes concluídos ou cancelados do usuário
      const { data: freightsData, error } = await supabase
        .from('freights')
        .select(`
          id,
          freight_code,
          title,
          description,
          cargo_type,
          weight_kg,
          origin_city,
          origin_state,
          destination_city,
          destination_state,
          value_estimate,
          status,
          created_at,
          completed_at,
          cancelled_at,
          accepted_driver_id,
          accepted_driver_name,
          distance_km,
          publisher_id,
          metadata,
          pickup_date,
          delivery_date
        `)
        .eq('publisher_id', resolvedCompanyId)
        .in('status', ['completed', 'cancelled'])
        .order('completed_at', { ascending: false, nullsFirst: false });

      if (error) {
        console.error('Erro ao carregar histórico:', error);
        toast.error('Erro ao carregar histórico de fretes');
        return;
      }

      if (!freightsData || freightsData.length === 0) {
        setHistoricalFreights([]);
        return;
      }

      // Buscar ratings para os fretes
      const freightIds = freightsData.map(f => f.id);
      const { data: ratingsData } = await supabase
        .from('ratings')
        .select('freight_id, overall_rating')
        .in('freight_id', freightIds)
        .eq('target_id', user.id); // Ratings recebidos pelo usuário

      const ratingsMap = new Map(
        ratingsData?.map(r => [r.freight_id, r.overall_rating]) || []
      );

      // Transformar dados do Supabase para formato do componente
      const transformedFreights: HistoricalFreight[] = freightsData.map(f => {
        // Extrair valor: prioridade value_estimate > metadata.price (parseado)
        let value = f.value_estimate || 0;
        if (!value && f.metadata?.price) {
          const priceStr = String(f.metadata.price);
          // Parse "R$ 1.500,00" ou "1500" ou "1500.00"
          const cleaned = priceStr.replace(/[R$\s.]/g, '').replace(',', '.');
          const parsed = parseFloat(cleaned);
          if (!isNaN(parsed)) value = parsed;
        }

        // Extrair peso: prioridade weight_kg > metadata.weight (parseado)
        let weight = f.weight_kg || 0;
        if (!weight && f.metadata?.weight) {
          const weightStr = String(f.metadata.weight);
          const cleaned = weightStr.replace(/[^\d.,]/g, '').replace(',', '.');
          const parsed = parseFloat(cleaned);
          if (!isNaN(parsed)) {
            // Se string contém "ton", converter para kg
            weight = weightStr.toLowerCase().includes('ton') ? parsed * 1000 : parsed;
          }
        }

        // Extrair distância: prioridade distance_km > metadata.distance
        let distance = f.distance_km || 0;
        if (!distance && f.metadata?.distance) {
          const distStr = String(f.metadata.distance);
          const cleaned = distStr.replace(/[^\d.,]/g, '').replace(',', '.');
          const parsed = parseFloat(cleaned);
          if (!isNaN(parsed)) distance = parsed;
        }

        return {
          id: f.id,
          freight_code: f.freight_code,
          title: f.title || 'Sem título',
          origin: {
            city: f.origin_city,
            state: f.origin_state,
          },
          destination: {
            city: f.destination_city,
            state: f.destination_state,
          },
          value,
          status: f.status as 'completed' | 'cancelled' | 'in-transit',
          startDate: f.pickup_date || f.created_at,
          completionDate: f.completed_at || f.cancelled_at || undefined,
          rating: ratingsMap.get(f.id),
          driverName: f.accepted_driver_name || undefined,
          distance,
          weight,
          type: f.cargo_type || f.metadata?.category || 'Carga Geral',
        };
      });

      setHistoricalFreights(transformedFreights);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      toast.error('Erro ao carregar histórico de fretes');
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort freights
  const filteredFreights = useMemo(() => {
    let filtered = historicalFreights;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(f => 
        f.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.origin?.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.destination?.city?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(f => f.status === statusFilter);
    }

    // Time range filter
    const now = new Date();
    if (timeRange !== 'all') {
      const days = timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
      const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(f => new Date(f.startDate) >= cutoff);
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
      } else if (sortBy === 'value') {
        return b.value - a.value;
      } else if (sortBy === 'rating') {
        return (b.rating || 0) - (a.rating || 0);
      }
      return 0;
    });

    return filtered;
  }, [historicalFreights, searchTerm, statusFilter, timeRange, sortBy]);

  // Statistics
  const stats = useMemo(() => {
    const completed = filteredFreights.filter(f => f.status === 'completed');
    const cancelled = filteredFreights.filter(f => f.status === 'cancelled');
    const totalRevenue = completed.reduce((sum, f) => sum + f.value, 0);
    const avgRating = completed.reduce((sum, f) => sum + (f.rating || 0), 0) / (completed.length || 1);
    const totalDistance = completed.reduce((sum, f) => sum + f.distance, 0);

    return {
      total: filteredFreights.length,
      completed: completed.length,
      cancelled: cancelled.length,
      revenue: totalRevenue,
      avgRating,
      distance: totalDistance,
      avgValue: totalRevenue / (completed.length || 1)
    };
  }, [filteredFreights]);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const StatusBadge = ({ status }: { status: HistoricalFreight['status'] }) => {
    const config = {
      completed: { label: 'Concluído', className: 'bg-green-100 text-green-700', icon: CheckCircle },
      cancelled: { label: 'Cancelado', className: 'bg-red-100 text-red-700', icon: XCircle },
      'in-transit': { label: 'Em Trânsito', className: 'bg-blue-100 text-blue-700', icon: Truck }
    }[status];

    const Icon = config.icon;

    return (
      <Badge variant="outline" className={config.className}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const exportHistory = () => {
    // In production, this would generate a PDF or CSV
    const data = filteredFreights.map(f => ({
      ID: f.id,
      Título: f.title,
      Origem: `${f.origin?.city || 'N/A'}/${f.origin?.state || 'N/A'}`,
      Destino: `${f.destination?.city || 'N/A'}/${f.destination?.state || 'N/A'}`,
      Valor: `R$ ${f.value.toLocaleString('pt-BR')}`,
      Status: f.status,
      'Data Início': formatDate(f.startDate),
      'Data Conclusão': f.completionDate ? formatDate(f.completionDate) : '-',
      Avaliação: f.rating || '-'
    }));

    console.log('Exportar histórico:', data);
    alert('Funcionalidade de exportação será implementada em breve!');
  };

  return (
    <div className="space-y-6 p-6 bg-background">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-2">Histórico de Fretes</h1>
          <p className="text-muted-foreground">
            Acompanhe todos os seus fretes anteriores
          </p>
        </div>
        <Button onClick={exportHistory} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Exportar
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Total de Fretes</p>
                <p className="text-2xl font-semibold">{stats.total}</p>
                <p className="text-xs text-green-600">{stats.completed} concluídos</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Package className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Receita Total</p>
                <p className="text-2xl font-semibold">
                  {stats.revenue > 0 
                    ? `R$ ${stats.revenue >= 1000 ? (stats.revenue / 1000).toFixed(1) + 'k' : stats.revenue.toLocaleString('pt-BR')}`
                    : 'R$ 0'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Média: {stats.avgValue > 0 
                    ? `R$ ${stats.avgValue >= 1000 ? (stats.avgValue / 1000).toFixed(1) + 'k' : stats.avgValue.toLocaleString('pt-BR')}`
                    : 'R$ 0'}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Avaliação Média</p>
                <p className="text-2xl font-semibold">{stats.avgRating.toFixed(1)}</p>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star 
                      key={star} 
                      className={`w-3 h-3 ${star <= Math.round(stats.avgRating) ? 'fill-accent text-accent' : 'text-muted-foreground'}`} 
                    />
                  ))}
                </div>
              </div>
              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                <Star className="w-6 h-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Distância Total</p>
                <p className="text-2xl font-semibold">
                  {stats.distance > 0 
                    ? `${stats.distance >= 1000 ? (stats.distance / 1000).toFixed(1) + 'k' : stats.distance.toLocaleString('pt-BR')} km`
                    : '0 km'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {stats.completed} viagens
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <MapPin className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar fretes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="completed">Concluídos</SelectItem>
                <SelectItem value="cancelled">Cancelados</SelectItem>
              </SelectContent>
            </Select>

            <Select value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                <SelectItem value="90d">Últimos 90 dias</SelectItem>
                <SelectItem value="1y">Último ano</SelectItem>
                <SelectItem value="all">Todo o período</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Ordenar por data</SelectItem>
                <SelectItem value="value">Ordenar por valor</SelectItem>
                <SelectItem value="rating">Ordenar por avaliação</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Freight List */}
      <div className="space-y-4">
        {loading ? (
          <Card className="shadow-card">
            <CardContent className="p-12 text-center">
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="text-muted-foreground">Carregando histórico...</p>
              </div>
            </CardContent>
          </Card>
        ) : filteredFreights.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="p-12 text-center">
              <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-30" />
              <p className="text-muted-foreground">
                {historicalFreights.length === 0 
                  ? 'Você ainda não tem fretes concluídos ou cancelados' 
                  : 'Nenhum frete encontrado com os filtros aplicados'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredFreights.map((freight) => (
            <motion.div
              key={freight.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="shadow-card hover:shadow-card-hover transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge variant="outline" className="text-xs">
                          {freight.freight_code || generateFreightCode(freight.id)}
                        </Badge>
                        <h3 className="font-medium text-foreground">{freight.title}</h3>
                        <StatusBadge status={freight.status} />
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          <span>{freight.origin?.city}/{freight.origin?.state}</span>
                          <span>→</span>
                          <span>{freight.destination?.city}/{freight.destination?.state}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Package className="w-4 h-4" />
                          <span>{freight.type}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-semibold text-primary">
                        {freight.value > 0 
                          ? `R$ ${freight.value.toLocaleString('pt-BR')}`
                          : 'A combinar'}
                      </p>
                      {freight.rating && (
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="w-4 h-4 fill-accent text-accent" />
                          <span className="text-sm font-medium">{freight.rating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-light">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Data Início</p>
                      <p className="text-sm font-medium">{formatDate(freight.startDate)}</p>
                    </div>
                    {freight.completionDate && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Data Conclusão</p>
                        <p className="text-sm font-medium">{formatDate(freight.completionDate)}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Distância</p>
                      <p className="text-sm font-medium">{freight.distance > 0 ? `${freight.distance.toLocaleString('pt-BR')} km` : '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Peso</p>
                      <p className="text-sm font-medium">{freight.weight > 0 ? `${(freight.weight / 1000).toFixed(1)} ton` : '-'}</p>
                    </div>
                  </div>

                  {(freight.driverName || freight.carrierName) && (
                    <div className="mt-3 pt-3 border-t border-light">
                      <p className="text-xs text-muted-foreground">
                        {freight.driverName && `Motorista: ${freight.driverName}`}
                        {freight.carrierName && `Transportadora: ${freight.carrierName}`}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}