import React from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { ActivityLogsScreen } from '../ActivityLogsScreen';

export function ActivityLogsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;
  const resolvedCompanyId = user.collaborator?.companyId || user.id;
  return <ActivityLogsScreen user={user} companyId={resolvedCompanyId} onBack={() => navigate('/')} />;
}
