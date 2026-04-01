import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { TransactionScreen } from '../TransactionScreen';

export function TransactionsPage() {
  const { user } = useAuth();
  if (!user) return null;
  return <TransactionScreen user={user} />;
}
