import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Navigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { getSupabaseClient } from '../../utils/supabase/client';
import { database } from '../../utils/database';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Package, Users, DollarSign, Calculator, TrendingUp, ChevronRight, Plus, MessageSquare } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface DashboardStats {
  activeFreights: number;
  connectedDrivers: number;
  monthlyRevenue: number;
  loading: boolean;
}

export function DashboardPage() {
  const { user } = useAuth();
  const { state } = useApp();
  const navigate = useNavigate();

  const resolvedCompanyId = user?.collaborator?.companyId || user?.id;

  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    activeFreights: 0,
    connectedDrivers: 0,
    monthlyRevenue: 0,
    loading: true,
  });

  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);

  useEffect(() => {
    if (state.notifications && state.notifications.length > 0) {
      const recent = state.notifications.slice(0, 4);
      setRecentActivity(recent);
      setActivityLoading(false);
    }
  }, [state.notifications]);

  useEffect(() => {
    loadDashboardStats();
    loadRecentActivity();
  }, [resolvedCompanyId]);

  const loadRecentActivity = async () => {
    try {
      setActivityLoading(true);
      const response = await database.notifications.getByUser(resolvedCompanyId!, { limit: 4, offset: 0 });
      setRecentActivity(response.data || []);
    } catch (error) {
      console.error('❌ Erro ao carregar atividade recente:', error);
    } finally {
      setActivityLoading(false);
    }
  };

  const loadDashboardStats = async () => {
    try {
      setDashboardStats(prev => ({ ...prev, loading: true }));
      const freightsResponse = await database.freights.getAll();
      const freightsRaw = freightsResponse.data || [];
      const freights = freightsRaw.filter((f: any) => f.status !== 'inactive');
      const activeFreights = freights.filter((f: any) =>
        f.customerId === resolvedCompanyId &&
        f.status !== 'cancelled' &&
        f.status !== 'inactive'
      ).length;

      let connectedDrivers = 0;
      try {
        const supabase = getSupabaseClient();
        const { data: driversData, error } = await supabase.from('drivers').select('*');
        if (!error) connectedDrivers = driversData?.length || 0;
      } catch {
        const driversResponse = await database.drivers.getAll();
        connectedDrivers = (driversResponse.data || []).length;
      }

      setDashboardStats({ activeFreights, connectedDrivers, monthlyRevenue: 0, loading: false });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
      setDashboardStats(prev => ({ ...prev, loading: false }));
    }
  };

  if (!user) return null;

  // Redirect caminhoneiros to /fretes
  if (user.userType === 'caminhoneiro') {
    return <Navigate to="/fretes" replace />;
  }

  return (
    <div className="space-y-6 px-[21px] py-[0px]">
      {/* Welcome Section */}
      <div className="bg-gradient-to-br from-primary to-primary/80 rounded-[0px] p-6 sm:p-8 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold mb-2">
              Bem-vindo, {user.name && !user.name.includes('@') ? user.name : user.email?.split('@')[0] || 'Usuário'}! 👋
            </h2>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-1">
            <span className="text-sm text-white/80">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
            <span className="text-sm text-white/80">
              {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="border-0 shadow-card hover:shadow-lg transition-all duration-300 group cursor-pointer" onClick={() => navigate('/fretes/meus')}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-1">Fretes Ativos</p>
                <h3 className="text-3xl font-semibold mb-2">{dashboardStats.activeFreights}</h3>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-card hover:shadow-lg transition-all duration-300 group cursor-pointer" onClick={() => navigate('/motoristas')}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-1">Motoristas Conectados</p>
                <h3 className="text-3xl font-semibold mb-2">{dashboardStats.connectedDrivers}</h3>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center group-hover:bg-green-100 transition-colors">
                <Users className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-card hover:shadow-lg transition-all duration-300 group cursor-pointer">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-1">Receita Mensal</p>
                <h3 className="text-3xl font-semibold mb-2">
                  R$ {dashboardStats.monthlyRevenue.toLocaleString('pt-BR')}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-xl bg-yellow-50 flex items-center justify-center group-hover:bg-yellow-100 transition-colors">
                <DollarSign className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-card hover:shadow-lg transition-all duration-300 group cursor-pointer" onClick={() => navigate('/fretes')}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-1">Buscar Fretes</p>
                <p className="text-sm text-muted-foreground">Ver todos os fretes disponíveis</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                <ChevronRight className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-0 shadow-card">
        <CardHeader className="pb-4">
          <CardTitle>Ações Rápidas</CardTitle>
          <CardDescription>Acesse rapidamente as funcionalidades mais utilizadas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <button
              onClick={() => navigate('/fretes/novo')}
              className="group relative overflow-hidden rounded-xl border-2 border-primary bg-primary/5 p-6 text-left transition-all duration-300 hover:bg-[#e9742b] hover:border-[#e9742b] hover:shadow-lg hover:scale-[1.02]"
            >
              <div className="relative z-10">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-sm transition-all duration-300 group-hover:bg-white">
                  <Plus className="h-6 w-6 text-white transition-colors duration-300 group-hover:text-[#e9742b]" />
                </div>
                <h3 className="font-medium mb-1 text-foreground transition-colors duration-300 group-hover:text-white">Criar Frete</h3>
                <p className="text-sm text-muted-foreground transition-colors duration-300 group-hover:text-white/90">Crie um novo frete agora</p>
              </div>
            </button>
            <button
              onClick={() => navigate('/motoristas')}
              className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 text-left transition-all duration-200 hover:border-primary/40 hover:shadow-md"
            >
              <div className="relative z-10">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50 group-hover:bg-primary/10 transition-colors">
                  <Users className="h-6 w-6 text-gray-600 group-hover:text-primary transition-colors" />
                </div>
                <h3 className="font-medium mb-1">Buscar Motoristas</h3>
                <p className="text-sm text-muted-foreground">Encontre motoristas disponíveis</p>
              </div>
            </button>
            <button
              onClick={() => navigate('/chat')}
              className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 text-left transition-all duration-200 hover:border-primary/40 hover:shadow-md"
            >
              <div className="relative z-10">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50 group-hover:bg-primary/10 transition-colors">
                  <MessageSquare className="h-6 w-6 text-gray-600 group-hover:text-primary transition-colors" />
                </div>
                <h3 className="font-medium mb-1">Mensagens</h3>
                <p className="text-sm text-muted-foreground">Acesse o chat</p>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="border-0 shadow-card">
        <CardHeader className="pb-4">
          <CardTitle>Atividade Recente</CardTitle>
          <CardDescription>Últimas movimentações da sua conta</CardDescription>
        </CardHeader>
        <CardContent className="space-y-0">
          {activityLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-start gap-4 p-3 rounded-lg animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Calculator className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium mb-1">{activity.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {(() => {
                        const dateStr = activity.timestamp || activity.createdAt;
                        if (!dateStr) return 'Data não disponível';
                        try {
                          const date = new Date(dateStr);
                          if (isNaN(date.getTime())) return 'Data inválida';
                          return formatDistanceToNow(date, { locale: ptBR, addSuffix: true });
                        } catch { return 'Data inválida'; }
                      })()}
                    </p>
                  </div>
                </div>
              ))}
              {recentActivity.length === 0 && (
                <p className="text-center text-muted-foreground py-6">Nenhuma atividade recente</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}