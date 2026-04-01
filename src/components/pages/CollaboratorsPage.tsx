import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { CollaboratorManagement } from '../CollaboratorManagement';

export function CollaboratorsPage() {
  const { user } = useAuth();
  if (!user) return null;
  const resolvedCompanyId = user.collaborator?.companyId || user.id;
  return <CollaboratorManagement user={user} companyId={resolvedCompanyId} />;
}
