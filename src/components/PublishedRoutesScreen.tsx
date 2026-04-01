/**
 * Tela de Rotas Publicadas
 * Componente independente acessado apenas pela sidebar
 */

import React from 'react';
import { AvailableDriversTab } from './AvailableDriversTab';
import { toast } from 'sonner@2.0.3';
import type { User } from './contexts/AppContext';

interface PublishedRoutesScreenProps {
  user: User;
  onOpenChat?: (userId: string, userName: string, prefilledMessage?: string) => void;
}

export function PublishedRoutesScreen({ user, onOpenChat }: PublishedRoutesScreenProps) {
  console.log('🚀 [PublishedRoutesScreen] Renderizado com:', {
    hasOnOpenChat: !!onOpenChat,
    userId: user.id,
    userName: user.name,
  });
  
  return (
    <div className="h-full bg-background">
      <AvailableDriversTab 
        currentUser={user} 
        onOpenChat={(driverId, driverName, prefilledMessage) => {
          console.log('📞 [PublishedRoutesScreen] onOpenChat chamado no wrapper!', {
            hasParentCallback: !!onOpenChat,
            driverId,
            driverName,
          });
          
          if (onOpenChat) {
            onOpenChat(driverId, driverName, prefilledMessage);
          } else {
            console.warn('⚠️ [PublishedRoutesScreen] onOpenChat não está definido!');
            toast.info('Abrindo chat...');
          }
        }}
      />
    </div>
  );
}
