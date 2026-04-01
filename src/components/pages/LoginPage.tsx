import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { AuthScreen } from '../AuthScreen';
import { LoadingSpinner } from '../LoadingSpinner';
import logoMaisFrete from '../../assets/logo-moovefretes.png';
import { BackgroundPaths } from '../ui/background-paths';

export function LoginPage() {
  const { authenticated, loading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // If already authenticated, redirect to where they came from or home
  useEffect(() => {
    if (authenticated) {
      const from = (location.state as any)?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [authenticated, navigate, location]);

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

  if (authenticated) {
    return null; // Will redirect via useEffect
  }

  return (
    <BackgroundPaths>
      <AuthScreen onLogin={login} />
    </BackgroundPaths>
  );
}
