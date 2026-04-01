import React from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { AllDriversScreen } from '../AllDriversScreen';
import { CompaniesScreen } from '../CompaniesScreen';
import { PublishedRoutesScreen } from '../PublishedRoutesScreen';
import { MyPreferredRoutes } from '../MyPreferredRoutes';
import { toast } from 'sonner@2.0.3';

export function DriversPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const initialSelectedId = location.state?.selectedDriverId || location.state?.selectedCompanyId || null;

  if (!user) return null;

  const handleOpenChat = (userId: string, userName: string, prefilledMessage?: string) => {
    navigate('/chat', { state: { userId, userName, initialMessage: prefilledMessage } });
    toast.success(`Abrindo chat com ${userName}`);
  };

  const handleViewFreight = (freightId: string) => {
    navigate(`/fretes/${freightId}`);
    toast.success('Abrindo detalhes do frete');
  };

  // Caminhoneiros veem empresas, outros veem motoristas
  if (user.userType === 'caminhoneiro') {
    return (
      <CompaniesScreen
        user={user}
        onOpenChat={handleOpenChat}
        onViewFreight={handleViewFreight}
        initialSelectedId={initialSelectedId}
      />
    );
  }

  return (
    <AllDriversScreen
      user={user}
      onOpenChat={handleOpenChat}
      initialSelectedId={initialSelectedId}
    />
  );
}

export function PublishedRoutesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const handleOpenChat = (userId: string, userName: string, prefilledMessage?: string) => {
    navigate('/chat', { state: { userId, userName, initialMessage: prefilledMessage } });
    toast.success(`Abrindo chat com ${userName}`);
  };

  // Caminhoneiros veem rotas publicadas no modo público
  if (user.userType === 'caminhoneiro') {
    return <MyPreferredRoutes user={user} viewMode="public" />;
  }

  return <PublishedRoutesScreen user={user} onOpenChat={handleOpenChat} />;
}

export function CompaniesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const initialSelectedId = location.state?.selectedCompanyId || null;

  if (!user) return null;

  const handleOpenChat = (userId: string, userName: string, prefilledMessage?: string) => {
    navigate('/chat', { state: { userId, userName, initialMessage: prefilledMessage } });
    toast.success(`Abrindo chat com ${userName}`);
  };

  const handleViewFreight = (freightId: string) => {
    navigate(`/fretes/${freightId}`);
    toast.success('Abrindo detalhes do frete');
  };

  return (
    <CompaniesScreen
      user={user}
      onOpenChat={handleOpenChat}
      onViewFreight={handleViewFreight}
      initialSelectedId={initialSelectedId}
    />
  );
}