import React from 'react';
import { FreightManagement } from './FreightManagement';
import type { User } from './contexts/AppContext';

interface AllFreightsScreenProps {
  user: User;
  onNavigateToChat?: (freightId: string) => void;
  onOpenChat?: (userId: string, userName: string) => void;
  selectedFreightId?: string | null;
}

export function AllFreightsScreen({
  user,
  onNavigateToChat,
  onOpenChat,
  selectedFreightId
}: AllFreightsScreenProps) {
  return (
    <FreightManagement
      user={user}
      initialView="all-freights"
      onNavigateToChat={onNavigateToChat}
      onOpenChat={onOpenChat}
      selectedFreightId={selectedFreightId}
    />
  );
}