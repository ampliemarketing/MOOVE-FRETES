import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from './contexts/AuthContext';
import { LoadingSpinner } from './LoadingSpinner';
import logoMaisFrete from '../assets/logo-moovefretes.png';

export function ProtectedRoute() {
  const { authenticated, loading, profileIncomplete, user, logout } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-64 h-32 mx-auto mb-8">
            <img src={logoMaisFrete} alt="MaisFrete Logo" className="w-full h-full object-contain" />
          </div>
          <LoadingSpinner message="Inicializando plataforma..." />
          <div className="mt-4 text-xs text-muted-foreground">
            Sistema de Produção • Pronto para uso real
          </div>
        </div>
      </div>
    );
  }

  if (!authenticated || !user) {
    // Save the current path so we can redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (profileIncomplete) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <img src={logoMaisFrete} alt="MooveFretes" className="h-16 w-auto mx-auto mb-6" />
          <div className="bg-white rounded-lg shadow-card p-8">
            <h2 className="text-xl text-foreground mb-4">Perfil Incompleto</h2>
            <p className="text-muted-foreground mb-6">
              Seu perfil está incompleto. Por favor, faça logout e complete seu cadastro.
            </p>
            <button
              onClick={logout}
              className="w-full bg-[#253663] hover:bg-[#253663]/90 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Fazer Logout
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
