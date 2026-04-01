/**
 * Activity Logs Screen
 * Dashboard completo para visualização e análise de logs de atividades
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  Filter,
  Download,
  Calendar,
  User,
  Clock,
  Search,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info,
  ChevronLeft,
  FileText,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Avatar, AvatarFallback } from './ui/avatar';
import { toast } from 'sonner@2.0.3';
import type { User as AppUser } from './contexts/AppContext';
import type { ActivityLog } from '../utils/database/repositories/activity-log-repository';
import { database } from '../utils/database';
import { 
  ACTIVITY_TYPES, 
  ACTIVITY_CATEGORIES,
  getActivityTypeLabel,
  getActivityCategoryLabel 
} from '../utils/database/repositories/activity-log-repository';
import { LoadingSpinner } from './LoadingSpinner';

interface ActivityLogsScreenProps {
  user: AppUser;
  companyId: string;
  onBack: () => void;
}

export function ActivityLogsScreen({ user, companyId, onBack }: ActivityLogsScreenProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('week');
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    byCategory: {} as Record<string, number>,
    byType: {} as Record<string, number>
  });

  useEffect(() => {
    loadLogs();
  }, [companyId, dateRange]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      // Calcular data de início baseado no range
      let startDate: Date | undefined;
      const now = new Date();
      
      if (dateRange === 'today') {
        startDate = new Date(now.setHours(0, 0, 0, 0));
      } else if (dateRange === 'week') {
        startDate = new Date(now.setDate(now.getDate() - 7));
      } else if (dateRange === 'month') {
        startDate = new Date(now.setMonth(now.getMonth() - 1));
      }

      const result = await database.activityLogs.getByCompany(
        companyId,
        startDate,
        undefined,
        100
      );

      if (result.success && result.data) {
        setLogs(result.data);
        calculateStats(result.data);
      } else {
        // Não exibir erro se simplesmente não há logs
        setLogs([]);
        calculateStats([]);
      }
    } catch (error) {
      console.error('Error loading logs:', error);
      toast.error('Erro ao carregar logs');
    } finally {
      setLoading(false);
    }
  };

  // Helper: extrair nome do usuário do log (metadata ou fallback)
  const getLogUserName = (log: ActivityLog): string => {
    return log.metadata?.userName || log.metadata?.collaboratorName || user.name || 'Usuário';
  };

  const calculateStats = (logData: ActivityLog[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());

    const byCategory: Record<string, number> = {};
    const byType: Record<string, number> = {};
    let todayCount = 0;
    let weekCount = 0;
    let monthCount = 0;

    logData.forEach(log => {
      const logDate = new Date(log.createdAt);
      
      // Count by date
      if (logDate >= today) todayCount++;
      if (logDate >= weekAgo) weekCount++;
      if (logDate >= monthAgo) monthCount++;

      // Count by category
      byCategory[log.category] = (byCategory[log.category] || 0) + 1;

      // Count by type — usar log.action (campo correto)
      byType[log.action] = (byType[log.action] || 0) + 1;
    });

    setStats({
      total: logData.length,
      today: todayCount,
      thisWeek: weekCount,
      thisMonth: monthCount,
      byCategory,
      byType
    });
  };

  const exportToCSV = () => {
    const headers = ['Data/Hora', 'Usuário', 'Categoria', 'Ação', 'Descrição'];
    const rows = filteredLogs.map(log => [
      new Date(log.createdAt).toLocaleString('pt-BR'),
      getLogUserName(log),
      getActivityCategoryLabel(log.category),
      getActivityTypeLabel(log.action),
      log.description
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `logs-atividade-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast.success('Relatório CSV exportado com sucesso!');
  };

  const exportToJSON = () => {
    const data = JSON.stringify(filteredLogs, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `logs-atividade-${new Date().toISOString().split('T')[0]}.json`;
    link.click();

    toast.success('Relatório JSON exportado com sucesso!');
  };

  // Filtros
  const filteredLogs = logs.filter(log => {
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const logUserName = getLogUserName(log);
      if (
        !(log.description || '').toLowerCase().includes(search) &&
        !logUserName.toLowerCase().includes(search)
      ) {
        return false;
      }
    }

    // Category filter
    if (categoryFilter !== 'all' && log.category !== categoryFilter) {
      return false;
    }

    // Type filter
    if (typeFilter !== 'all' && log.action !== typeFilter) {
      return false;
    }

    return true;
  });

  const getActivityIcon = (type: string) => {
    if (type.includes('created') || type.includes('invited')) return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (type.includes('deleted') || type.includes('deactivated')) return <XCircle className="w-4 h-4 text-red-600" />;
    if (type.includes('updated') || type.includes('changed')) return <AlertCircle className="w-4 h-4 text-blue-600" />;
    return <Info className="w-4 h-4 text-gray-600" />;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      collaborators: 'bg-blue-100 text-blue-800',
      freights: 'bg-green-100 text-green-800',
      financials: 'bg-purple-100 text-purple-800',
      settings: 'bg-gray-100 text-gray-800',
      auth: 'bg-red-100 text-red-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-background overflow-y-auto">
      {/* Header */}
      <div className="bg-card border-b sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-semibold text-foreground mb-1">
                Logs de Atividades
              </h1>
              <p className="text-sm text-muted-foreground">
                Histórico completo de ações realizadas no sistema
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadLogs}
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Atualizar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportToCSV}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportToJSON}
                className="gap-2"
              >
                <FileText className="w-4 h-4" />
                JSON
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {Object.values(ACTIVITY_CATEGORIES).map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {getActivityCategoryLabel(cat)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo de ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {Object.values(ACTIVITY_TYPES).map(type => (
                  <SelectItem key={type} value={type}>
                    {getActivityTypeLabel(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={dateRange} onValueChange={(v: any) => setDateRange(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="week">Últimos 7 dias</SelectItem>
                <SelectItem value="month">Último mês</SelectItem>
                <SelectItem value="all">Todo o período</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-semibold">{stats.total}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Hoje</p>
                  <p className="text-2xl font-semibold">{stats.today}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Esta Semana</p>
                  <p className="text-2xl font-semibold">{stats.thisWeek}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-yellow-50 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Este Mês</p>
                  <p className="text-2xl font-semibold">{stats.thisMonth}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="timeline" className="space-y-4">
          <TabsList className="bg-surface-100">
            <TabsTrigger value="timeline">
              Timeline ({filteredLogs.length})
            </TabsTrigger>
            <TabsTrigger value="stats">
              Estatísticas
            </TabsTrigger>
          </TabsList>

          {/* Timeline */}
          <TabsContent value="timeline" className="space-y-3">
            {loading ? (
              <LoadingSpinner message="Carregando logs..." />
            ) : filteredLogs.length === 0 ? (
              <Card className="shadow-card">
                <CardContent className="p-12 text-center">
                  <Activity className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Nenhum log encontrado com os filtros aplicados
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredLogs.map((log, index) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="shadow-card hover:shadow-card-hover transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <Avatar className="w-10 h-10 flex-shrink-0">
                          <AvatarFallback className="bg-primary text-white">
                            {getLogUserName(log).charAt(0)}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-medium">{getLogUserName(log)}</span>
                            <Badge className={getCategoryColor(log.category)}>
                              {getActivityCategoryLabel(log.category)}
                            </Badge>
                            {getActivityIcon(log.action)}
                          </div>

                          <p className="text-sm text-foreground mb-2">
                            {log.description}
                          </p>

                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(log.createdAt).toLocaleString('pt-BR')}
                            </span>
                            {log.ipAddress && (
                              <span>IP: {log.ipAddress}</span>
                            )}
                          </div>

                          {log.metadata && Object.keys(log.metadata).length > 0 && (
                            <details className="mt-2">
                              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                                Ver detalhes
                              </summary>
                              <pre className="mt-2 p-2 bg-surface-100 rounded text-xs overflow-auto">
                                {JSON.stringify(log.metadata, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </TabsContent>

          {/* Statistics */}
          <TabsContent value="stats" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* By Category */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>Por Categoria</CardTitle>
                  <CardDescription>Distribuição de ações por categoria</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(stats.byCategory)
                    .sort((a, b) => b[1] - a[1])
                    .map(([category, count]) => (
                      <div key={category} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>{getActivityCategoryLabel(category)}</span>
                          <span className="font-medium">{count}</span>
                        </div>
                        <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{
                              width: `${(count / stats.total) * 100}%`
                            }}
                          />
                        </div>
                      </div>
                    ))}
                </CardContent>
              </Card>

              {/* By Type */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>Por Tipo de Ação</CardTitle>
                  <CardDescription>Ações mais frequentes</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(stats.byType)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 10)
                    .map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {getActivityIcon(type)}
                          <span className="truncate">{getActivityTypeLabel(type)}</span>
                        </div>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}