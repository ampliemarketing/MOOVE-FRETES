/**
 * Migration Helper - Migra dados do LocalStorage para Supabase
 * Usado para usuários existentes que têm dados salvos localmente
 */

import { db } from './database/db-client';
import { driverRepository } from './database/repositories/driver-repository';
import { freightRepository } from './database/repositories/freight-repository';
import { notificationRepository } from './database/repositories/notification-repository-v2';
import { conversationRepository, messageRepository } from './database/repositories/chat-repository-v2';
import { preferredRouteRepository } from './database/repositories/preferred-route-repository-v2';
import { socialPostRepository } from './database/repositories/social-repository-v2';

export interface MigrationResult {
  drivers: number;
  freights: number;
  notifications: number;
  conversations: number;
  messages: number;
  preferredRoutes: number;
  socialPosts: number;
  errors: string[];
  totalItems: number;
  totalMigrated: number;
}

/**
 * Migrate all data from LocalStorage to Supabase
 */
export async function migrateAllData(userId: string): Promise<MigrationResult> {
  const result: MigrationResult = {
    drivers: 0,
    freights: 0,
    notifications: 0,
    conversations: 0,
    messages: 0,
    preferredRoutes: 0,
    socialPosts: 0,
    errors: [],
    totalItems: 0,
    totalMigrated: 0,
  };


  // 1. Migrate Drivers
  try {
    const driversMigrated = await migrateDrivers(userId);
    result.drivers = driversMigrated;
    result.totalMigrated += driversMigrated;
  } catch (error) {
    const errorMsg = `Drivers: ${error instanceof Error ? error.message : String(error)}`;
    result.errors.push(errorMsg);
    console.error('❌', errorMsg);
  }

  // 2. Migrate Freights
  try {
    const freightsMigrated = await migrateFreights(userId);
    result.freights = freightsMigrated;
    result.totalMigrated += freightsMigrated;
  } catch (error) {
    const errorMsg = `Freights: ${error instanceof Error ? error.message : String(error)}`;
    result.errors.push(errorMsg);
    console.error('❌', errorMsg);
  }

  // 3. Migrate Notifications
  try {
    const notificationsMigrated = await migrateNotifications(userId);
    result.notifications = notificationsMigrated;
    result.totalMigrated += notificationsMigrated;
  } catch (error) {
    const errorMsg = `Notifications: ${error instanceof Error ? error.message : String(error)}`;
    result.errors.push(errorMsg);
    console.error('❌', errorMsg);
  }

  // 4. Migrate Conversations & Messages
  try {
    const { conversations, messages } = await migrateChats(userId);
    result.conversations = conversations;
    result.messages = messages;
    result.totalMigrated += conversations + messages;
  } catch (error) {
    const errorMsg = `Chats: ${error instanceof Error ? error.message : String(error)}`;
    result.errors.push(errorMsg);
    console.error('❌', errorMsg);
  }

  // 5. Migrate Preferred Routes
  try {
    const routesMigrated = await migratePreferredRoutes(userId);
    result.preferredRoutes = routesMigrated;
    result.totalMigrated += routesMigrated;
  } catch (error) {
    const errorMsg = `Routes: ${error instanceof Error ? error.message : String(error)}`;
    result.errors.push(errorMsg);
    console.error('❌', errorMsg);
  }

  // 6. Migrate Social Posts
  try {
    const postsMigrated = await migrateSocialPosts(userId);
    result.socialPosts = postsMigrated;
    result.totalMigrated += postsMigrated;
  } catch (error) {
    const errorMsg = `Posts: ${error instanceof Error ? error.message : String(error)}`;
    result.errors.push(errorMsg);
    console.error('❌', errorMsg);
  }

  result.totalItems = result.totalMigrated + result.errors.length;

  return result;
}

/**
 * Migrate drivers
 */
async function migrateDrivers(userId: string): Promise<number> {
  const driversResponse = await db.get<string[]>('drivers:list');
  const driverIds = driversResponse.data || [];
  let migrated = 0;

  for (const driverId of driverIds) {
    try {
      const driverResponse = await db.get(`driver:${driverId}`);
      if (driverResponse.success && driverResponse.data) {
        const driver = driverResponse.data;
        
        // Only migrate if belongs to user
        if (driver.userId === userId) {
          await driverRepository.create(driver);
          migrated++;
        }
      }
    } catch (error) {
      console.error(`Erro ao migrar driver ${driverId}:`, error);
    }
  }

  return migrated;
}

/**
 * Migrate freights
 */
async function migrateFreights(userId: string): Promise<number> {
  const freightsResponse = await db.get<string[]>('freights:list');
  const freightIds = freightsResponse.data || [];
  let migrated = 0;

  for (const freightId of freightIds) {
    try {
      const freightResponse = await db.get(`freight:${freightId}`);
      if (freightResponse.success && freightResponse.data) {
        const freight = freightResponse.data;
        
        // Only migrate if belongs to user
        if (freight.customerId === userId) {
          await freightRepository.create(freight);
          migrated++;
        }
      }
    } catch (error) {
      console.error(`Erro ao migrar freight ${freightId}:`, error);
    }
  }

  return migrated;
}

/**
 * Migrate notifications
 */
async function migrateNotifications(userId: string): Promise<number> {
  const notificationsResponse = await db.get<string[]>(`notifications:user:${userId}`);
  const notificationIds = notificationsResponse.data || [];
  let migrated = 0;

  for (const notificationId of notificationIds) {
    try {
      const notificationResponse = await db.get(`notification:${notificationId}`);
      if (notificationResponse.success && notificationResponse.data) {
        await notificationRepository.create(notificationResponse.data);
        migrated++;
      }
    } catch (error) {
      console.error(`Erro ao migrar notification ${notificationId}:`, error);
    }
  }

  return migrated;
}

/**
 * Migrate chats (conversations + messages)
 */
async function migrateChats(userId: string): Promise<{ conversations: number; messages: number }> {
  const chatsResponse = await db.get<string[]>('chats:list');
  const chatIds = chatsResponse.data || [];
  let conversationsMigrated = 0;
  let messagesMigrated = 0;

  for (const chatId of chatIds) {
    try {
      const chatResponse = await db.get(`chat:${chatId}`);
      if (chatResponse.success && chatResponse.data) {
        const chat = chatResponse.data;
        
        // Only migrate if user is participant
        if (chat.participant1Id === userId || chat.participant2Id === userId) {
          // Create or get conversation
          await conversationRepository.getOrCreate(
            chat.participant1Id,
            chat.participant2Id,
            chat.freightId
          );
          conversationsMigrated++;

          // Migrate messages
          const messagesResponse = await db.get<string[]>(`messages:chat:${chatId}`);
          const messageIds = messagesResponse.data || [];

          for (const messageId of messageIds) {
            try {
              const messageResponse = await db.get(`message:${messageId}`);
              if (messageResponse.success && messageResponse.data) {
                await messageRepository.send(messageResponse.data);
                messagesMigrated++;
              }
            } catch (error) {
              console.error(`Erro ao migrar message ${messageId}:`, error);
            }
          }
        }
      }
    } catch (error) {
      console.error(`Erro ao migrar chat ${chatId}:`, error);
    }
  }

  return { conversations: conversationsMigrated, messages: messagesMigrated };
}

/**
 * Migrate preferred routes
 */
async function migratePreferredRoutes(userId: string): Promise<number> {
  const routesResponse = await db.get<string[]>('routes:list');
  const routeIds = routesResponse.data || [];
  let migrated = 0;

  for (const routeId of routeIds) {
    try {
      const routeResponse = await db.get(`route:${routeId}`);
      if (routeResponse.success && routeResponse.data) {
        const route = routeResponse.data;
        
        // Get driver to check ownership
        const driverResponse = await db.get(`driver:${route.driverId}`);
        if (driverResponse.success && driverResponse.data?.userId === userId) {
          await preferredRouteRepository.create(route);
          migrated++;
        }
      }
    } catch (error) {
      console.error(`Erro ao migrar route ${routeId}:`, error);
    }
  }

  return migrated;
}

/**
 * Migrate social posts
 */
async function migrateSocialPosts(userId: string): Promise<number> {
  const postsResponse = await db.get<string[]>('posts:list');
  const postIds = postsResponse.data || [];
  let migrated = 0;

  for (const postId of postIds) {
    try {
      const postResponse = await db.get(`post:${postId}`);
      if (postResponse.success && postResponse.data) {
        const post = postResponse.data;
        
        // Only migrate if belongs to user
        if (post.authorId === userId) {
          await socialPostRepository.create(post);
          migrated++;
        }
      }
    } catch (error) {
      console.error(`Erro ao migrar post ${postId}:`, error);
    }
  }

  return migrated;
}

/**
 * Clear LocalStorage after successful migration
 */
export async function clearLocalStorageData(): Promise<void> {
  const keysToRemove = [
    'drivers:list',
    'freights:list',
    'chats:list',
    'routes:list',
    'posts:list',
  ];

  for (const key of keysToRemove) {
    await db.del(key);
  }

}

/**
 * Check if user has data in LocalStorage
 */
export async function hasLocalData(userId: string): Promise<boolean> {
  const checks = [
    db.get<string[]>('drivers:list'),
    db.get<string[]>('freights:list'),
    db.get<string[]>(`notifications:user:${userId}`),
    db.get<string[]>('chats:list'),
  ];

  const results = await Promise.all(checks);
  
  return results.some(result => 
    result.success && result.data && result.data.length > 0
  );
}

/**
 * Estimate data to migrate
 */
export async function estimateMigrationSize(userId: string): Promise<number> {
  let totalItems = 0;

  const driversResponse = await db.get<string[]>('drivers:list');
  totalItems += driversResponse.data?.length || 0;

  const freightsResponse = await db.get<string[]>('freights:list');
  totalItems += freightsResponse.data?.length || 0;

  const notificationsResponse = await db.get<string[]>(`notifications:user:${userId}`);
  totalItems += notificationsResponse.data?.length || 0;

  const chatsResponse = await db.get<string[]>('chats:list');
  totalItems += chatsResponse.data?.length || 0;

  return totalItems;
}
