/**
 * Supabase sync for collaborators system
 * 
 * NOTE: Edge Functions are DISABLED in this application.
 * This file is kept for backward compatibility.
 * All operations fall back to local storage.
 */

import { getSupabaseClient } from '../supabase/client';
import { projectId } from '../supabase/info';
import type { Collaborator, CollaboratorRole, CollaboratorInvite } from '../collaborator-types';

// ⚠️ DEPRECATED: Edge Functions are disabled
// This URL is kept for reference only - all operations use local storage
const SERVER_URL = `https://${projectId}.supabase.co/functions/v1/make-server-24200374`; // DISABLED - DO NOT USE

interface SyncResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export const supabaseCollaborators = {
  /**
   * Sync collaborator to Supabase
   */
  async syncCollaborator(collaborator: Collaborator, accessToken?: string): Promise<SyncResponse> {
    try {
      const response = await fetch(`${SERVER_URL}/collaborators`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken || publicAnonKey}`
        },
        body: JSON.stringify(collaborator)
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: errorText };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error('Error syncing collaborator to Supabase:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  },

  /**
   * Get collaborators for a company from Supabase
   */
  async getCompanyCollaborators(companyId: string, accessToken?: string): Promise<SyncResponse> {
    try {
      const response = await fetch(`${SERVER_URL}/collaborators/company/${companyId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken || publicAnonKey}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: errorText };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching collaborators from Supabase:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  },

  /**
   * Sync custom role to Supabase
   */
  async syncCustomRole(companyId: string, role: CollaboratorRole, accessToken?: string): Promise<SyncResponse> {
    try {
      const response = await fetch(`${SERVER_URL}/collaborators/roles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken || publicAnonKey}`
        },
        body: JSON.stringify({ companyId, role })
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: errorText };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error('Error syncing custom role to Supabase:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  },

  /**
   * Sync invite to Supabase
   */
  async syncInvite(invite: CollaboratorInvite, accessToken?: string): Promise<SyncResponse> {
    try {
      const response = await fetch(`${SERVER_URL}/collaborators/invites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken || publicAnonKey}`
        },
        body: JSON.stringify(invite)
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: errorText };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error('Error syncing invite to Supabase:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  },

  /**
   * Get pending invite by email
   */
  async getPendingInviteByEmail(email: string): Promise<SyncResponse> {
    try {
      const response = await fetch(`${SERVER_URL}/collaborators/invites/email/${encodeURIComponent(email)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: errorText };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching invite from Supabase:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  },

  /**
   * Accept invite and create collaborator
   */
  async acceptInvite(inviteId: string, userId: string, accessToken: string): Promise<SyncResponse> {
    try {
      const response = await fetch(`${SERVER_URL}/collaborators/invites/${inviteId}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ userId })
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: errorText };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error('Error accepting invite:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
};