import React from 'react';
import { Users, Truck, Package, DollarSign, MessageSquare, Star, AlertTriangle, Activity, TrendingUp, Clock, Ban, UserCheck, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { kpiData, userGrowthData, freightStatusData, revenueData, freightsByRegion, userTypeDistribution } from './admin-mock-data';

function KPICard({ label, value, icon: Icon, change, changeType, color }: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  change?: string;
  changeType?: 'up' | 'down' | 'neutral';
  color?: string;
}) {
  return (
    <div className="bg-white rounded-[0.75rem] border border-[var(--border)] p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-[var(--muted-foreground)] text-[0.8rem] mb-1">{label}</p>
          <p className="text-[1.5rem] font-[500] text-[var(--foreground)]">{value}</p>
          {change && (
            <div className={`flex items-center gap-1 mt-1 text-[0.75rem] ${
              changeType === 'up' ? 'text-green-600' : changeType === 'down' ? 'text-red-500' : 'text-[var(--muted-foreground)]'
            }`}>
              {changeType === 'up' ? <ArrowUpRight className="w-3 h-3" /> : changeType === 'down' ? <ArrowDownRight className="w-3 h-3" /> : null}
              {change}
            </div>
          )}
        </div>
        <div className={`p-2.5 rounded-[0.75rem] ${color || 'bg-[#253663]/10'}`}>
          <Icon className={`w-5 h-5 ${color ? 'text-white' : 'text-[#253663]'}`} />
        </div>
      </div>
    </div>
  );
}

function AlertCard({ title, count, severity }: { title: string; count: number; severity: 'critical' | 'warning' | 'info' }) {
  const colors = {
    critical: 'bg-red-50 border-red-200 text-red-700',
    warning: 'bg-amber-50 border-amber-200 text-amber-700',
    info: 'bg-blue-50 border-blue-200 text-blue-700',
  };
  return (
    <div className={`flex items-center justify-between p-3 rounded-[0.75rem] border ${colors[severity]}`}>
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4" />
        <span className="text-[0.85rem]">{title}</span>
      </div>
      <span className="font-[500] text-[0.9rem]">{count}</span>
    </div>
  );
}

export function AdminDashboard() {
  return (
    <div className="space-y-6">
      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Usuários Totais" value={kpiData.totalUsers.toLocaleString('pt-BR')} icon={Users} change="+22% vs mês anterior" changeType="up" />
        <KPICard label="Fretes Ativos" value={kpiData.activeFreights} icon={Package} change="+15 hoje" changeType="up" />
        <KPICard label="Receita Mensal" value={`R$ ${kpiData.monthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon={DollarSign} change="-7% vs mês anterior" changeType="down" />
        <KPICard label="Online Agora" value={kpiData.onlineNow} icon={Activity} change="Pico: 234" changeType="neutral" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Usuários Pendentes" value={kpiData.pendingUsers} icon={Clock} change="Aguardando aprovação" changeType="neutral" />
        <KPICard label="Usuários Bloqueados" value={kpiData.blockedUsers} icon={Ban} change="+2 esta semana" changeType="up" />
        <KPICard label="Rating Médio Global" value={kpiData.avgRating.toFixed(1)} icon={Star} change="+0.1 vs mês anterior" changeType="up" />
        <KPICard label="Mensagens Enviadas" value={kpiData.totalMessages.toLocaleString('pt-BR')} icon={MessageSquare} change="+1.234 hoje" changeType="up" />
      </div>

      {/* Alerts */}
      <div className="bg-white rounded-[0.75rem] border border-[var(--border)] p-5">
        <h3 className="font-[500] text-[var(--foreground)] mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          Alertas Críticos
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <AlertCard title="Fretes atrasados > 3 dias" count={kpiData.delayedFreights} severity="critical" />
          <AlertCard title="Denúncias pendentes" count={kpiData.pendingReports} severity="warning" />
          <AlertCard title="Erros recentes (24h)" count={kpiData.recentErrors} severity="info" />
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth */}
        <div className="bg-white rounded-[0.75rem] border border-[var(--border)] p-5">
          <h3 className="font-[500] text-[var(--foreground)] mb-4">Crescimento de Usuários</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={userGrowthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e1e4e8" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#6c757d" />
              <YAxis tick={{ fontSize: 12 }} stroke="#6c757d" />
              <Tooltip
                contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e1e4e8', fontSize: '13px' }}
                formatter={(value: number) => [value.toLocaleString('pt-BR'), 'Usuários']}
              />
              <Line type="monotone" dataKey="users" stroke="#253663" strokeWidth={2.5} dot={{ fill: '#253663', r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue */}
        <div className="bg-white rounded-[0.75rem] border border-[var(--border)] p-5">
          <h3 className="font-[500] text-[var(--foreground)] mb-4">Receita Mensal (R$)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e1e4e8" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#6c757d" />
              <YAxis tick={{ fontSize: 12 }} stroke="#6c757d" tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e1e4e8', fontSize: '13px' }}
                formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Receita']}
              />
              <Bar dataKey="revenue" fill="#253663" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Freight Status Distribution */}
        <div className="bg-white rounded-[0.75rem] border border-[var(--border)] p-5">
          <h3 className="font-[500] text-[var(--foreground)] mb-4">Fretes por Status</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={freightStatusData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">
                {freightStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e1e4e8', fontSize: '13px' }}
                formatter={(value: number) => [value.toLocaleString('pt-BR'), '']}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Freights by Region */}
        <div className="bg-white rounded-[0.75rem] border border-[var(--border)] p-5">
          <h3 className="font-[500] text-[var(--foreground)] mb-4">Fretes por Região</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={freightsByRegion} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e1e4e8" />
              <XAxis type="number" tick={{ fontSize: 11 }} stroke="#6c757d" />
              <YAxis type="category" dataKey="region" tick={{ fontSize: 11 }} stroke="#6c757d" width={80} />
              <Tooltip
                contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e1e4e8', fontSize: '13px' }}
                formatter={(value: number) => [value.toLocaleString('pt-BR'), 'Fretes']}
              />
              <Bar dataKey="freights" fill="#3b82f6" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* User Type Distribution */}
        <div className="bg-white rounded-[0.75rem] border border-[var(--border)] p-5">
          <h3 className="font-[500] text-[var(--foreground)] mb-4">Tipo de Usuário</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={userTypeDistribution} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">
                {userTypeDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e1e4e8', fontSize: '13px' }}
                formatter={(value: number) => [value.toLocaleString('pt-BR'), '']}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-[0.75rem] border border-[var(--border)] p-4 text-center">
          <p className="text-[2rem] font-[500] text-[#253663]">{kpiData.totalFreights.toLocaleString('pt-BR')}</p>
          <p className="text-[0.8rem] text-[var(--muted-foreground)]">Fretes Totais</p>
        </div>
        <div className="bg-white rounded-[0.75rem] border border-[var(--border)] p-4 text-center">
          <p className="text-[2rem] font-[500] text-green-600">{kpiData.completedFreights.toLocaleString('pt-BR')}</p>
          <p className="text-[0.8rem] text-[var(--muted-foreground)]">Concluídos</p>
        </div>
        <div className="bg-white rounded-[0.75rem] border border-[var(--border)] p-4 text-center">
          <p className="text-[2rem] font-[500] text-amber-500">{kpiData.totalQuotes.toLocaleString('pt-BR')}</p>
          <p className="text-[0.8rem] text-[var(--muted-foreground)]">Cotações Enviadas</p>
        </div>
        <div className="bg-white rounded-[0.75rem] border border-[var(--border)] p-4 text-center">
          <p className="text-[2rem] font-[500] text-[#253663]">R$ {(kpiData.platformRevenue / 1000).toFixed(0)}k</p>
          <p className="text-[0.8rem] text-[var(--muted-foreground)]">Receita Total</p>
        </div>
      </div>
    </div>
  );
}
