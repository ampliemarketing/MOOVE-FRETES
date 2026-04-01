import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  Package, 
  DollarSign, 
  Users, 
  Clock,
  Calendar,
  BarChart3,
  PieChart,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Filter
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import type { User } from './contexts/AppContext';
import { database } from '../utils/database';
import { LoadingSpinner } from './LoadingSpinner';
import { getSupabaseClient } from '../utils/supabase/client';

interface AdvancedAnalyticsProps {
  user: User;
}

interface AnalyticsData {
  monthlyRevenue: { month: string; value: number }[];
  freightsByStatus: { name: string; value: number }[];
  performanceMetrics: {
    totalFreights: number;
    completedFreights: number;
    activeFreights: number;
    cancelledFreights: number;
    averageRevenue: number;
    totalRevenue: number;
    growthRate: number;
    completionRate: number;
  };
  weeklyActivity: { day: string; freights: number }[];
}

export function AdvancedAnalytics({ user }: AdvancedAnalyticsProps) {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');

  // ✅ Resolver companyId: se for colaborador, usar o companyId da empresa vinculada
  const resolvedCompanyId = user?.collaborator?.companyId || user?.id || '';

  useEffect(() => {
    loadAnalyticsData();
  }, [resolvedCompanyId, timeRange]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      const supabase = getSupabaseClient();

      // 🔥 BUSCAR DADOS REAIS DO SUPABASE
      
      // 1. Buscar fretes do usuário
      const { data: freightsData } = await supabase
        .from('freights')
        .select('*')
        .eq('publisher_id', resolvedCompanyId);

      const userFreights = freightsData || [];

      // 2. Buscar transações do usuário (para receita real)
      const { data: transactionsData } = await supabase
        .from('transactions')
        .select('*')
        .or(`payer_id.eq.${resolvedCompanyId},receiver_id.eq.${resolvedCompanyId}`)
        .eq('payment_status', 'completed');

      const transactions = transactionsData || [];

      // Calculate performance metrics com dados reais
      const totalFreights = userFreights.length;
      const completedFreights = userFreights.filter(f => f.status === 'completed').length;
      const activeFreights = userFreights.filter(f => f.status === 'active').length;
      const cancelledFreights = userFreights.filter(f => f.status === 'cancelled').length;
      const inTransitFreights = userFreights.filter(f => f.status === 'in-transit').length;

      // Receita real das transações
      const totalRevenue = transactions
        .filter(t => t.receiver_id === resolvedCompanyId)
        .reduce((sum, t) => sum + (t.net_amount || 0), 0);
      
      const totalPaid = transactions
        .filter(t => t.payer_id === resolvedCompanyId)
        .reduce((sum, t) => sum + (t.net_amount || 0), 0);

      const averageRevenue = completedFreights > 0 ? totalRevenue / completedFreights : 0;
      const completionRate = totalFreights > 0 ? (completedFreights / totalFreights) * 100 : 0;

      // 🔥 CALCULAR TAXA DE CRESCIMENTO REAL (comparar últimos 30 dias vs 30 dias anteriores)
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      const recentFreights = userFreights.filter(f => 
        new Date(f.created_at) >= thirtyDaysAgo
      ).length;

      const previousFreights = userFreights.filter(f => 
        new Date(f.created_at) >= sixtyDaysAgo && 
        new Date(f.created_at) < thirtyDaysAgo
      ).length;

      const growthRate = previousFreights > 0 
        ? ((recentFreights - previousFreights) / previousFreights) * 100 
        : recentFreights > 0 ? 100 : 0;

      // Freights by status (dados reais)
      const freightsByStatus = [
        { name: 'Ativos', value: activeFreights },
        { name: 'Em Trânsito', value: inTransitFreights },
        { name: 'Concluídos', value: completedFreights },
        { name: 'Cancelados', value: cancelledFreights },
      ].filter(item => item.value > 0);

      // 🔥 RECEITA MENSAL REAL (últimos 6 meses)
      const monthlyRevenue = [];
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date();
        monthDate.setMonth(monthDate.getMonth() - i);
        const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
        const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

        const monthTransactions = transactions.filter(t => {
          const tDate = new Date(t.created_at);
          return t.receiver_id === resolvedCompanyId && tDate >= monthStart && tDate <= monthEnd;
        });

        const monthValue = monthTransactions.reduce((sum, t) => sum + (t.net_amount || 0), 0);

        monthlyRevenue.push({
          month: monthNames[monthDate.getMonth()],
          value: monthValue,
        });
      }

      // 🔥 ATIVIDADE SEMANAL REAL (última semana)
      const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      const weeklyActivity = [];
      
      for (let i = 6; i >= 0; i--) {
        const dayDate = new Date();
        dayDate.setDate(dayDate.getDate() - i);
        dayDate.setHours(0, 0, 0, 0);
        
        const nextDay = new Date(dayDate);
        nextDay.setDate(nextDay.getDate() + 1);

        const dayFreights = userFreights.filter(f => {
          const fDate = new Date(f.created_at);
          return fDate >= dayDate && fDate < nextDay;
        }).length;

        weeklyActivity.push({
          day: weekDays[dayDate.getDay()],
          freights: dayFreights,
        });
      }

      setAnalyticsData({
        monthlyRevenue,
        freightsByStatus,
        performanceMetrics: {
          totalFreights,
          completedFreights,
          activeFreights,
          cancelledFreights,
          averageRevenue,
          totalRevenue,
          growthRate,
          completionRate,
        },
        weeklyActivity,
      });
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !analyticsData) {
    return <LoadingSpinner message="Carregando analytics..." />;
  }

  const COLORS = ['#253663', '#4a90e2', '#50c878', '#f0ad4e', '#d9534f'];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Analytics Avançado</h1>
          <p className="text-muted-foreground">
            Visualização detalhada do desempenho e métricas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
            <Button
              variant={timeRange === 'week' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTimeRange('week')}
              className="h-8"
            >
              Semana
            </Button>
            <Button
              variant={timeRange === 'month' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTimeRange('month')}
              className="h-8"
            >
              Mês
            </Button>
            <Button
              variant={timeRange === 'year' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTimeRange('year')}
              className="h-8"
            >
              Ano
            </Button>
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-card">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
              <Badge variant="secondary" className="bg-green-50 text-green-700 gap-1">
                <TrendingUp className="w-3 h-3" />
                +{analyticsData.performanceMetrics.growthRate}%
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Total de Fretes</p>
            <h3 className="text-2xl font-semibold">{analyticsData.performanceMetrics.totalFreights}</h3>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-card">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
                <Activity className="w-6 h-6 text-green-600" />
              </div>
              <Badge variant="secondary" className="bg-green-50 text-green-700 gap-1">
                <TrendingUp className="w-3 h-3" />
                {analyticsData.performanceMetrics.completionRate.toFixed(1)}%
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Taxa de Conclusão</p>
            <h3 className="text-2xl font-semibold">
              {analyticsData.performanceMetrics.completedFreights}/{analyticsData.performanceMetrics.totalFreights}
            </h3>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-card">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-emerald-600" />
              </div>
              <Badge variant="secondary" className="bg-green-50 text-green-700 gap-1">
                <TrendingUp className="w-3 h-3" />
                +15%
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Receita Total</p>
            <h3 className="text-2xl font-semibold">
              R$ {(analyticsData.performanceMetrics.totalRevenue / 1000).toFixed(1)}k
            </h3>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-card">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
              <Badge variant="secondary" className="bg-blue-50 text-blue-700 gap-1">
                <TrendingUp className="w-3 h-3" />
                +8%
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Média por Frete</p>
            <h3 className="text-2xl font-semibold">
              R$ {(analyticsData.performanceMetrics.averageRevenue / 1000).toFixed(1)}k
            </h3>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card className="border-0 shadow-card">
          <CardHeader>
            <CardTitle>Receita Mensal</CardTitle>
            <CardDescription>Evolução da receita nos últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analyticsData.monthlyRevenue}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#253663" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#253663" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12 }}
                  stroke="#666"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  stroke="#666"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '8px'
                  }}
                  formatter={(value: any) => [`R$ ${(value / 1000).toFixed(1)}k`, 'Receita']}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#253663" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card className="border-0 shadow-card">
          <CardHeader>
            <CardTitle>Distribuição por Status</CardTitle>
            <CardDescription>Fretes categorizados por status atual</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={analyticsData.freightsByStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analyticsData.freightsByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '8px'
                  }}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Weekly Activity */}
        <Card className="border-0 shadow-card lg:col-span-2">
          <CardHeader>
            <CardTitle>Atividade Semanal</CardTitle>
            <CardDescription>Fretes e cotações por dia da semana</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.weeklyActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="day" 
                  tick={{ fontSize: 12 }}
                  stroke="#666"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  stroke="#666"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '8px'
                  }}
                />
                <Legend />
                <Bar dataKey="freights" fill="#253663" name="Fretes" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Performance Summary */}
      <Card className="border-0 shadow-card">
        <CardHeader>
          <CardTitle>Resumo de Performance</CardTitle>
          <CardDescription>Indicadores chave de desempenho</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Fretes Ativos</span>
                <span className="text-sm font-semibold text-blue-600">
                  {analyticsData.performanceMetrics.activeFreights}
                </span>
              </div>
              <div className="relative w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="absolute top-0 left-0 h-full bg-blue-600 rounded-full transition-all"
                  style={{ 
                    width: `${(analyticsData.performanceMetrics.activeFreights / 
                             analyticsData.performanceMetrics.totalFreights * 100)}%` 
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Entregues</span>
                <span className="text-sm font-semibold text-green-600">
                  {analyticsData.performanceMetrics.completedFreights}
                </span>
              </div>
              <div className="relative w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="absolute top-0 left-0 h-full bg-green-600 rounded-full transition-all"
                  style={{ 
                    width: `${analyticsData.performanceMetrics.completionRate}%` 
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Cancelados</span>
                <span className="text-sm font-semibold text-red-600">
                  {analyticsData.performanceMetrics.cancelledFreights}
                </span>
              </div>
              <div className="relative w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="absolute top-0 left-0 h-full bg-red-600 rounded-full transition-all"
                  style={{ 
                    width: `${(analyticsData.performanceMetrics.cancelledFreights / 
                             analyticsData.performanceMetrics.totalFreights * 100)}%` 
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Crescimento</span>
                <span className="text-sm font-semibold text-purple-600">
                  +{analyticsData.performanceMetrics.growthRate}%
                </span>
              </div>
              <div className="relative w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="absolute top-0 left-0 h-full bg-purple-600 rounded-full transition-all"
                  style={{ width: `${analyticsData.performanceMetrics.growthRate * 5}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}