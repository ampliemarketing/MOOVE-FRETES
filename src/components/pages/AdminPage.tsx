import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { SuperAdminPanel } from '../admin/SuperAdminPanel';
import { Toaster } from '../ui/sonner';
import { SUPER_ADMIN_EMAILS } from '../admin/admin-mock-data';
import { AdminLoginScreen } from '../admin/AdminLoginScreen';

export function AdminPage() {
  const { user, authenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Não logar e-mail do usuário nem a lista de admins: em produção qualquer
    // visitante de /admin veria isso no console e teria alvos de phishing.
    if (import.meta.env.DEV) {
      console.log('🛡️ AdminPage: Monitorando estado de auth', { loading, authenticated });
    }
    if (!loading && authenticated && user?.email) {
      const authorized = SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase().trim());
      setIsAdmin(authorized);
    } else {
      setIsAdmin(false);
    }
  }, [loading, authenticated, user]);

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#1a2340] text-white">
        <div className="w-16 h-16 border-4 border-t-primary border-white/20 rounded-full animate-spin mb-4" />
        <p className="text-lg font-medium">Verificando credenciais administrativas...</p>
      </div>
    );
  }

  // Se a lista de emails estiver vazia, pode ser um erro de configuração de ambiente
  if (SUPER_ADMIN_EMAILS.length === 0) {
    console.error('❌ CRÍTICO: VITE_ADMIN_EMAILS não está definida ou está vazia no ambiente de produção.');
  }

  if (!isAdmin) {
    return (
      <>
        <AdminLoginScreen 
          onSuccess={() => setIsAdmin(true)} 
          onExit={() => navigate('/')} 
        />
        <Toaster position="top-right" />
      </>
    );
  }

  return (
    <>
      <SuperAdminPanel
        onExit={() => navigate('/')}
        userEmail={user?.email}
      />
      <Toaster position="top-right" />
    </>
  );
}

