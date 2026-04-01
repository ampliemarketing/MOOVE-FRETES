import React from 'react';
import { FreightManagement } from './FreightManagement';
import type { User } from './contexts/AppContext';

interface MyFreightsScreenProps {
  user: User;
  onNavigateToChat?: (freightId: string) => void;
  onOpenChat?: (userId: string, userName: string) => void;
  shouldOpenFreightForm?: boolean;
  setShouldOpenFreightForm?: (value: boolean) => void;
}

export function MyFreightsScreen({
  user,
  onNavigateToChat,
  onOpenChat,
  shouldOpenFreightForm = false,
  setShouldOpenFreightForm
}: MyFreightsScreenProps) {
  return (
    <FreightManagement
      user={user}
      initialView="my-freights"
      onNavigateToChat={onNavigateToChat}
      onOpenChat={onOpenChat}
      shouldOpenFreightForm={shouldOpenFreightForm}
      setShouldOpenFreightForm={setShouldOpenFreightForm}
    />
  );
}