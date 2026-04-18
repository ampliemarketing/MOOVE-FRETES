import React, { useEffect, useState } from 'react';
import { Users, Truck, Package, DollarSign, MessageSquare, Star, AlertTriangle, Activity, TrendingUp, Clock, Ban, UserCheck, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import {
  fetchAdminKPI,
  fetchUserGrowthData,
  fetchFreightStatusData,
  fetchUserTypeDistribution,
  type AdminKPI,
  type ChartPoint,
  type FreightStatusPoint,
  type UserTypePoint,
} from '../../utils/admin-supabase-service';

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
  const [kpi, setKpi] = useState<AdminKPI | null>(null);
  const [userGrowth, setUserGrowth] = useState<ChartPoint[]>([]);
  const [freightStatus, setFreightStatus] = useState<FreightStatusPoint[]>([]);
  const [userTypes, setUserTypes] = useState<UserTypePoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchAdminKPI(),
      fetchUserGrowthData(),
      fetchFreightStatusData(),
      fetchUserTypeDistribution(),
    ]).then(([kpiData, growth, fStatus, uTypes]) => {
      setKpi(kpiData);
      setUserGrowth(growth);
      setFreightStatus(fStatus);
      setUserTypes(uTypes);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20 text-[var(--muted-foreground)]">Carregando dashboard...</div>;
  if (!kpi) return null;

  return (
    <div className="space-y-6">
      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Usuários Totais" value={kpi.totalUsers.toLocaleString('pt-BR')} icon={Users} />
        <KPICard label="Fretes Ativos" value={kpi.activeFreights} icon={Package} />
        <KPICard label="Usuários Pendentes" value={kpi.pendingUsers} icon={Clock} />
        <KPICard label="Usuários Bloqueados" value={kpi.blockedUsers} icon={Ban} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Total de Fretes" value={kpi.totalFreights.toLocaleString('pt-BR')} icon={Truck} />
        <KPICard label="Fretes Concluídos" value={kpi.completedFreights.toLocaleString('pt-BR')} icon={UserCheck} />
        <KPICard label="Rating Médio Global" value={kpi.avgRating > 0 ? kpi.avgRating.toFixed(1) : '—'} icon={Star} />
        <KPICard label="Usuários Ativos" value={kpi.activeUsers.toLocaleString('pt-BR')} icon={Activity} />
      </div>

      {/* Alerts */}
      <div className="bg-white rounded-[0.75rem] border border-[var(--border)] p-5">
        <h3 className="font-[500] text-[var(--foreground)] mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          Alertas
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <AlertCard title="Usuários pendentes de aprovação" count={kpi.pendingUsers} severity="warning" />
          <AlertCard title="Denúncias pendentes" count={kpi.pendingReports} severity="warning" />
          <AlertCard title="Fretes cancelados" count={kpi.cancelledFreights} severity="info" />
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {userGrowth.length > 0 && (
          <div className="bg-white rounded-[0.75rem] border border-[var(--border)] p-5">
            <h3 className="font-[500] text-[var(--foreground)] mb-4">Crescimento de Usuários</h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={userGrowth}>
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
        )}

        {freightStatus.length > 0 && (
          <div className="bg-white rounded-[0.75rem] border border-[var(--border)] p-5">
            <h3 className="font-[500] text-[var(--foreground)] mb-4">Fretes por Status</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={freightStatus} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">
                  {freightStatus.map((entry, index) => (
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
        )}
      </div>

      {userTypes.length > 0 && (
        <div className="bg-white rounded-[0.75rem] border border-[var(--border)] p-5">
          <h3 className="font-[500] text-[var(--foreground)] mb-4">Tipo de Usuário</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={userTypes} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">
                {userTypes.map((entry, index) => (
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
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-[0.75rem] border border-[var(--border)] p-4 text-center">
          <p className="text-[2rem] font-[500] text-[#253663]">{kpi.totalFreights.toLocaleString('pt-BR')}</p>
          <p className="text-[0.8rem] text-[var(--muted-foreground)]">Fretes Totais</p>
        </div>
        <div className="bg-white rounded-[0.75rem] border border-[var(--border)] p-4 text-center">
          <p className="text-[2rem] font-[500] text-green-600">{kpi.completedFreights.toLocaleString('pt-BR')}</p>
          <p className="text-[0.8rem] text-[var(--muted-foreground)]">Concluídos</p>
        </div>
        <div className="bg-white rounded-[0.75rem] border border-[var(--border)] p-4 text-center">
          <p className="text-[2rem] font-[500] text-red-500">{kpi.cancelledFreights.toLocaleString('pt-BR')}</p>
          <p className="text-[0.8rem] text-[var(--muted-foreground)]">Cancelados</p>
        </div>
        <div className="bg-white rounded-[0.75rem] border border-[var(--border)] p-4 text-center">
          <p className="text-[2rem] font-[500] text-amber-500">{kpi.scheduledFreights.toLocaleString('pt-BR')}</p>
          <p className="text-[0.8rem] text-[var(--muted-foreground)]">Agendados</p>
        </div>
      </div>
    </div>
  );
}
