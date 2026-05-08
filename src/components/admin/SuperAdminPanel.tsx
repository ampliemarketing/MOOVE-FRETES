import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Users, Building2, Truck, Package, MessageSquare,
  Star, DollarSign, Settings, ScrollText, Bell, Wrench, ChevronLeft,
  Menu, Search, LogOut, Shield, X, ChevronDown, FileCheck, LifeBuoy, AlertCircle
} from 'lucide-react';
import { AdminDashboard } from './AdminDashboard';
import { AdminUsers } from './AdminUsers';
import { AdminCompanies } from './AdminCompanies';
import { AdminDrivers } from './AdminDrivers';
import { AdminFreights } from './AdminFreights';
import { AdminMessages } from './AdminMessages';
import { AdminReviews } from './AdminReviews';
import { AdminFinancial } from './AdminFinancial';
import { AdminSettings } from './AdminSettings';
import { AdminLogs } from './AdminLogs';
import { AdminNotifications } from './AdminNotifications';
import { AdminTools } from './AdminTools';
import { AdminApprovals } from './AdminApprovals';
import { AdminSupport } from './AdminSupport';
import { AdminCriticalFreights } from './AdminCriticalFreights';
import { fetchAdminKPI, type AdminKPI } from '../../utils/admin-supabase-service';
import { supabase } from '../../utils/supabase/client';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

interface SuperAdminPanelProps {
  onExit: () => void;
  userEmail?: string;
}

export function SuperAdminPanel({ onExit, userEmail }: SuperAdminPanelProps) {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [kpi, setKpi] = useState<AdminKPI | null>(null);

  const loadData = async () => {
    const data = await fetchAdminKPI();
    setKpi(data);
  };

  useEffect(() => {
    loadData();

    // Subscribe to all relevant tables for real-time updates
    const channel = supabase
      .channel('admin-realtime-badges')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'freights' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'companies' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ratings' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, loadData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const menuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Dashboard Geral', icon: LayoutDashboard },
    { id: 'users', label: 'Usuários', icon: Users, badge: kpi?.totalUsers },
    { id: 'approvals', label: 'Verificação & Documentos', icon: FileCheck, badge: kpi?.pendingUsers },
    { id: 'companies', label: 'Empresas', icon: Building2, badge: kpi?.pendingCompanies },
    { id: 'drivers', label: 'Motoristas', icon: Truck },
    { id: 'freights', label: 'Fretes & Cotações', icon: Package },
    { id: 'critical', label: 'Fretes Críticos', icon: AlertCircle, badge: kpi?.criticalFreights },
    { id: 'messages', label: 'Monitoramento Chat', icon: MessageSquare, badge: kpi?.reportedMessages },
    { id: 'support', label: 'Tickets de Suporte', icon: LifeBuoy, badge: kpi?.openTickets },
    { id: 'reviews', label: 'Avaliações & Denúncias', icon: Star, badge: kpi?.pendingReports },
    { id: 'financial', label: 'Financeiro Global', icon: DollarSign },
    { id: 'settings', label: 'Configurações Master', icon: Settings },
    { id: 'logs', label: 'Logs & Auditoria', icon: ScrollText },
    { id: 'notifications', label: 'Notificações Broadcast', icon: Bell },
    { id: 'tools', label: 'Ferramentas Avançadas', icon: Wrench },
  ];

  // Close mobile menu on section change
  const handleSectionChange = (id: string) => {
    setActiveSection(id);
    setMobileMenuOpen(false);
  };

  // Responsive sidebar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const activeItem = menuItems.find(m => m.id === activeSection);

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard': return <AdminDashboard />;
      case 'users': return <AdminUsers />;
      case 'approvals': return <AdminApprovals />;
      case 'companies': return <AdminCompanies />;
      case 'drivers': return <AdminDrivers />;
      case 'freights': return <AdminFreights />;
      case 'critical': return <AdminCriticalFreights />;
      case 'messages': return <AdminMessages />;
      case 'support': return <AdminSupport />;
      case 'reviews': return <AdminReviews />;
      case 'financial': return <AdminFinancial />;
      case 'settings': return <AdminSettings />;
      case 'logs': return <AdminLogs />;
      case 'notifications': return <AdminNotifications />;
      case 'tools': return <AdminTools />;
      default: return <AdminDashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-[var(--background)] overflow-hidden">
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        ${sidebarOpen ? 'w-64' : 'w-16'}
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        bg-[#1a2340] text-white flex flex-col transition-all duration-300
      `}>
        {/* Sidebar Header */}
        <div className={`flex items-center gap-3 p-4 border-b border-white/10 ${sidebarOpen ? '' : 'justify-center'}`}>
          {sidebarOpen ? (
            <>
              <div className="w-8 h-8 rounded-[0.5rem] bg-white/20 flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-[500] text-[0.9rem] truncate">MooveFretes</p>
                <p className="text-[0.7rem] text-white/60">Super Admin</p>
              </div>
              <button onClick={() => { setSidebarOpen(false); setMobileMenuOpen(false); }} className="p-1 hover:bg-white/10 rounded-[0.5rem] lg:block hidden">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setMobileMenuOpen(false)} className="p-1 hover:bg-white/10 rounded-[0.5rem] lg:hidden">
                <X className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button onClick={() => setSidebarOpen(true)} className="p-1 hover:bg-white/10 rounded-[0.5rem]">
              <Shield className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Menu Items */}
        <nav className="flex-1 py-2 overflow-y-auto">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => handleSectionChange(item.id)}
              className={`
                w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors relative
                ${activeSection === item.id ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'}
                ${sidebarOpen ? '' : 'justify-center px-0'}
              `}
              title={!sidebarOpen ? item.label : undefined}
            >
              {activeSection === item.id && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-white rounded-r" />
              )}
              <item.icon className={`w-4.5 h-4.5 flex-shrink-0 ${sidebarOpen ? '' : 'w-5 h-5'}`} />
              {sidebarOpen && (
                <>
                  <span className="text-[0.85rem] flex-1 truncate">{item.label}</span>
                  {item.badge && item.badge > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[0.65rem] min-w-[18px] text-center">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
              {!sidebarOpen && item.badge && item.badge > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
              )}
            </button>
          ))}
        </nav>

        {/* Sidebar Footer */}
        {sidebarOpen && (
          <div className="p-4 border-t border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-[0.75rem] font-[500]">
                SA
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[0.8rem] font-[500] truncate">{userEmail || 'admin@moovefretes.com.br'}</p>
                <p className="text-[0.65rem] text-white/50">SUPER_ADMIN</p>
              </div>
            </div>
            <button onClick={onExit} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-[0.75rem] bg-white/10 hover:bg-white/20 transition-colors text-[0.85rem]">
              <LogOut className="w-4 h-4" />
              Voltar ao App
            </button>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-[var(--border)] px-4 sm:px-6 py-3 flex items-center gap-4 flex-shrink-0">
          <button
            onClick={() => { if (window.innerWidth < 1024) setMobileMenuOpen(true); else setSidebarOpen(!sidebarOpen); }}
            className="p-1.5 rounded-[0.5rem] hover:bg-[var(--background)] text-[var(--muted-foreground)] transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            {activeItem && <activeItem.icon className="w-4.5 h-4.5 text-[#253663]" />}
            <h1 className="font-[500] text-[1rem] text-[var(--foreground)] hidden sm:block">{activeItem?.label || 'Dashboard'}</h1>
          </div>

          <div className="flex-1" />

          {/* Global Search */}
          <div className="relative max-w-xs hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
            <input
              type="text"
              value={globalSearch}
              onChange={e => setGlobalSearch(e.target.value)}
              placeholder="Busca global..."
              className="pl-9 pr-3 py-1.5 w-56 rounded-[0.75rem] border border-[var(--border)] bg-[var(--background)] text-[0.85rem] outline-none focus:border-[#253663] transition-colors"
            />
          </div>

          {/* Admin badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-[0.75rem] bg-red-50 border border-red-200">
            <Shield className="w-3.5 h-3.5 text-red-600" />
            <span className="text-[0.75rem] font-[500] text-red-700 hidden sm:inline">SUPER ADMIN</span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
