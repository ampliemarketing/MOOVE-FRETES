import { useState, useEffect } from 'react';
import { database } from '../database';
import type { Collaborator, PermissionKey } from '../collaborator-types';
import { hasPermission } from '../collaborator-types';

interface UseCollaboratorPermissionsResult {
  collaborator: Collaborator | null;
  loading: boolean;
  hasPermission: (permission: PermissionKey) => boolean;
  isCompanyOwner: boolean;
  isSuperAdmin: boolean;
  refresh: () => Promise<void>;
}

export function useCollaboratorPermissions(userId: string): UseCollaboratorPermissionsResult {
  const [collaborator, setCollaborator] = useState<Collaborator | null>(null);
  const [loading, setLoading] = useState(true);

  const loadCollaborator = async () => {
    setLoading(true);
    try {
      const result = await database.collaborators.getByUserId(userId);
      if (result.success && result.data) {
        setCollaborator(result.data);
        // Update last access
        await database.collaborators.updateLastAccess(result.data.id);
      } else {
        setCollaborator(null);
      }
    } catch (error) {
      console.error('Error loading collaborator:', error);
      setCollaborator(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCollaborator();
  }, [userId]);

  const checkPermission = (permission: PermissionKey): boolean => {
    if (!collaborator) return false;
    return hasPermission(collaborator, permission);
  };

  return {
    collaborator,
    loading,
    hasPermission: checkPermission,
    isCompanyOwner: collaborator?.isSuperAdmin || false,
    isSuperAdmin: collaborator?.isSuperAdmin || false,
    refresh: loadCollaborator
  };
}
