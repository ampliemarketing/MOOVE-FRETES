/**
 * MaisFrete API Client
 * Handles all communication with Supabase backend
 * 
 * NOTE: Edge Functions are DISABLED in this application.
 * This file is kept for backward compatibility but API calls will fail.
 * The application uses direct Supabase client SDK instead.
 */

import { supabase, supabaseUrl, publicAnonKey } from './supabase/client';

// ⚠️ DEPRECATED: Edge Functions are disabled
// This API_BASE is kept for reference only
// All actual operations use direct Supabase client SDK
const API_BASE = `${supabaseUrl}/functions/v1/make-server-24200374`; // DISABLED - DO NOT USE

// Get auth headers
async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error('No active session');
  }
  
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
  };
}

// Generic API call helper
async function apiCall(endpoint: string, options: RequestInit = {}) {
  const headers = await getAuthHeaders();
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `API call failed: ${response.statusText}`);
  }

  return response.json();
}

// ============================================
// FREIGHT API
// ============================================

export const freightAPI = {
  getAll: async () => {
    return apiCall('/freights');
  },

  create: async (freight: any) => {
    return apiCall('/freights', {
      method: 'POST',
      body: JSON.stringify(freight),
    });
  },

  update: async (id: string, updates: any) => {
    return apiCall(`/freights/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  delete: async (id: string) => {
    return apiCall(`/freights/${id}`, {
      method: 'DELETE',
    });
  },
};

// ============================================
// QUOTE API
// ============================================

export const quoteAPI = {
  getAll: async () => {
    return apiCall('/quotes');
  },

  create: async (quote: any) => {
    return apiCall('/quotes', {
      method: 'POST',
      body: JSON.stringify(quote),
    });
  },

  update: async (id: string, updates: any) => {
    return apiCall(`/quotes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },
};

// ============================================
// NOTIFICATION API
// ============================================

export const notificationAPI = {
  getAll: async () => {
    return apiCall('/notifications');
  },

  create: async (notification: any) => {
    return apiCall('/notifications', {
      method: 'POST',
      body: JSON.stringify(notification),
    });
  },

  markAsRead: async (id: string) => {
    return apiCall(`/notifications/${id}/read`, {
      method: 'PUT',
    });
  },
};

// ============================================
// SOCIAL POST API
// ============================================

export const postAPI = {
  getAll: async () => {
    return apiCall('/posts');
  },

  create: async (post: any) => {
    return apiCall('/posts', {
      method: 'POST',
      body: JSON.stringify(post),
    });
  },

  like: async (id: string) => {
    return apiCall(`/posts/${id}/like`, {
      method: 'POST',
    });
  },

  comment: async (id: string, text: string) => {
    return apiCall(`/posts/${id}/comment`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  },
};

// ============================================
// CONVERSATION/MESSAGE API
// ============================================

export const chatAPI = {
  getConversations: async () => {
    return apiCall('/conversations');
  },

  createConversation: async (participantId: string, freightId?: string) => {
    return apiCall('/conversations', {
      method: 'POST',
      body: JSON.stringify({ participantId, freightId }),
    });
  },

  sendMessage: async (conversationId: string, text: string) => {
    return apiCall(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  },
};

// ============================================
// USER PROFILE API
// ============================================

export const userAPI = {
  getProfile: async () => {
    return apiCall('/user/profile');
  },
};

// ============================================
// KV STORE API (for generic data storage)
// ============================================

export const kvAPI = {
  get: async (key: string) => {
    return apiCall('/kv/get', {
      method: 'POST',
      body: JSON.stringify({ key }),
    });
  },

  set: async (key: string, value: any) => {
    return apiCall('/kv/set', {
      method: 'POST',
      body: JSON.stringify({ key, value }),
    });
  },

  delete: async (key: string) => {
    return apiCall('/kv/delete', {
      method: 'POST',
      body: JSON.stringify({ key }),
    });
  },

  getByPrefix: async (prefix: string) => {
    return apiCall('/kv/getByPrefix', {
      method: 'POST',
      body: JSON.stringify({ prefix }),
    });
  },
};

// Export supabase client for auth operations
export { supabase };