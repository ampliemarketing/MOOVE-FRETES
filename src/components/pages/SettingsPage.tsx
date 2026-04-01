import React from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { SystemSettings } from '../SystemSettings';

export function SettingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;
  return <SystemSettings user={user} onBack={() => navigate('/')} />;
}
