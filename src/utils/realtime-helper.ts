/**
 * Real-time Helper - Subscriptions para atualizações em tempo real
 * Usado principalmente para Chat, Notificações e Status de Fretes
 */

import { getSupabaseClient } from './supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Subscribe to new messages in a conversation
 */
export function subscribeToMessages(
  conversationId: string,
  callback: (message: any) => void
): RealtimeChannel {
  const supabase = getSupabaseClient();
  
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        callback(payload.new);
      }
    )
    .subscribe((status) => {
    });

  return channel;
}

/**
 * Subscribe to message read status updates
 */
export function subscribeToMessageUpdates(
  conversationId: string,
  callback: (message: any) => void
): RealtimeChannel {
  const supabase = getSupabaseClient();
  
  const channel = supabase
    .channel(`messages-updates:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        callback(payload.new);
      }
    )
    .subscribe();

  return channel;
}

/**
 * Subscribe to new notifications for a user
 */
export function subscribeToNotifications(
  userId: string,
  callback: (notification: any) => void
): RealtimeChannel {
  const supabase = getSupabaseClient();
  
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        callback(payload.new);
      }
    )
    .subscribe((status) => {
    });

  return channel;
}

/**
 * Subscribe to freight status changes
 */
export function subscribeToFreightUpdates(
  freightId: string,
  callback: (freight: any) => void
): RealtimeChannel {
  const supabase = getSupabaseClient();
  
  const channel = supabase
    .channel(`freight:${freightId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'freights',
        filter: `id=eq.${freightId}`,
      },
      (payload) => {
        callback(payload.new);
      }
    )
    .subscribe();

  return channel;
}

/**
 * Subscribe to all freights in a specific route
 */
export function subscribeToFreightsByRoute(
  originState: string,
  destinationState: string,
  callback: (freight: any) => void
): RealtimeChannel {
  const supabase = getSupabaseClient();
  
  const channel = supabase
    .channel(`freights:${originState}:${destinationState}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'freights',
      },
      (payload) => {
        const freight = payload.new as any;
        
        // Filter by route
        if (
          freight.origin_state === originState &&
          freight.destination_state === destinationState &&
          freight.status === 'active'
        ) {
          callback(freight);
        }
      }
    )
    .subscribe();

  return channel;
}

/**
 * Subscribe to driver availability changes in a region
 */
export function subscribeToDriverAvailability(
  city: string,
  state: string,
  callback: (driver: any) => void
): RealtimeChannel {
  const supabase = getSupabaseClient();
  
  const channel = supabase
    .channel(`drivers:${city}:${state}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'drivers',
      },
      (payload) => {
        const driver = payload.new as any;
        const location = driver.current_location;
        
        // Filter by location
        if (location?.city === city && location?.state === state && driver.available) {
          callback(driver);
        }
      }
    )
    .subscribe();

  return channel;
}

/**
 * Subscribe to new ratings for a user
 */
export function subscribeToRatings(
  targetId: string,
  callback: (rating: any) => void
): RealtimeChannel {
  const supabase = getSupabaseClient();
  
  const channel = supabase
    .channel(`ratings:${targetId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'ratings',
        filter: `target_id=eq.${targetId}`,
      },
      (payload) => {
        callback(payload.new);
      }
    )
    .subscribe();

  return channel;
}

/**
 * Subscribe to transaction status changes
 */
export function subscribeToTransactions(
  userId: string,
  callback: (transaction: any) => void
): RealtimeChannel {
  const supabase = getSupabaseClient();
  
  const channel = supabase
    .channel(`transactions:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'transactions',
      },
      (payload) => {
        const transaction = payload.new as any;
        
        // Filter by user (payer or receiver)
        if (transaction.payer_id === userId || transaction.receiver_id === userId) {
          callback(transaction);
        }
      }
    )
    .subscribe();

  return channel;
}

/**
 * Subscribe to user's conversations updates
 */
export function subscribeToConversations(
  userId: string,
  callback: (conversation: any) => void
): RealtimeChannel {
  const supabase = getSupabaseClient();
  
  const channel = supabase
    .channel(`conversations:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'conversations',
      },
      (payload) => {
        const conversation = payload.new as any;
        
        // Filter by participant
        if (conversation.participant1_id === userId || conversation.participant2_id === userId) {
          callback(conversation);
        }
      }
    )
    .subscribe();

  return channel;
}

/**
 * Subscribe to social feed updates (new posts)
 */
export function subscribeToSocialFeed(
  callback: (post: any) => void
): RealtimeChannel {
  const supabase = getSupabaseClient();
  
  const channel = supabase
    .channel('social-feed')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'social_posts',
      },
      (payload) => {
        const post = payload.new as any;
        
        // Only public posts
        if (post.visibility === 'public') {
          callback(post);
        }
      }
    )
    .subscribe();

  return channel;
}

/**
 * Subscribe to post likes/comments updates
 */
export function subscribeToPostUpdates(
  postId: string,
  callback: (data: { type: 'like' | 'comment'; payload: any }) => void
): RealtimeChannel {
  const supabase = getSupabaseClient();
  
  const channel = supabase
    .channel(`post:${postId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'social_likes',
        filter: `post_id=eq.${postId}`,
      },
      (payload) => {
        callback({ type: 'like', payload: payload.new });
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'social_comments',
        filter: `post_id=eq.${postId}`,
      },
      (payload) => {
        callback({ type: 'comment', payload: payload.new });
      }
    )
    .subscribe();

  return channel;
}

/**
 * Unsubscribe from a channel
 */
export async function unsubscribe(channel: RealtimeChannel): Promise<void> {
  if (channel) {
    await channel.unsubscribe();
  }
}

/**
 * Unsubscribe from all channels
 */
export async function unsubscribeAll(): Promise<void> {
  const supabase = getSupabaseClient();
  await supabase.removeAllChannels();
}

/**
 * Get active channels count
 */
export function getActiveChannelsCount(): number {
  const supabase = getSupabaseClient();
  return supabase.getChannels().length;
}

/**
 * Check if channel is subscribed
 */
export function isChannelSubscribed(channel: RealtimeChannel): boolean {
  return channel?.state === 'joined';
}
