/**
 * Tela de Todos os Motoristas
 * Componente independente acessado apenas pela sidebar
 */

import React from 'react';
import { DriversScreen } from './DriversScreen';
import type { User } from './contexts/AppContext';

interface AllDriversScreenProps {
  user: User;
  onOpenChat?: (userId: string, userName: string, prefilledMessage?: string) => void;
  initialSelectedId?: string | null;
}

export function AllDriversScreen({ user, onOpenChat, initialSelectedId }: AllDriversScreenProps) {
  
  return (
    <DriversScreen
      onBack={() => {}} // Não precisa de onBack pois é navegação pela sidebar
      initialView="all-drivers"
      user={user}
      onOpenChat={onOpenChat}
      initialSelectedDriverId={initialSelectedId}
    />
  );
}
