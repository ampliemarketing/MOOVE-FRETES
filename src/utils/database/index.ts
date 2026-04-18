/**
 * MaisFrete Database - Main Export
 * Centralized access to all database operations
 */

// Import Supabase client
import { supabase } from '../supabase/client';

// Export database client
export { db, DatabaseClient } from './db-client';
export type { DBResponse } from './db-client';

// Export schema types
export * from './schema';

// Export hooks
export * from './hooks';

// Import repositories
import { userRepository, UserRepository } from './repositories/user-repository';
import { freightRepository, FreightRepository } from './repositories/freight-repository';
import { notificationRepository, NotificationRepository } from './repositories/notification-repository';
import { driverRepository, DriverRepository } from './repositories/driver-repository';
import { companyRepository, CompanyRepository } from './repositories/company-repository';
import { chatRepository, messageRepository, MessageRepository } from './repositories/chat-repository';
import type { ChatRepository } from './repositories/chat-repository';
import { socialPostRepository, commentRepository, SocialPostRepository } from './repositories/social-repository';
import type { CommentRepository } from './repositories/social-repository';
import { transactionRepository, TransactionRepository } from './repositories/transaction-repository';
import { ratingRepository, RatingRepository } from './repositories/rating-repository';
import { preferredRouteRepository, PreferredRouteRepository } from './repositories/preferred-route-repository';
import { collaborators } from './collaborators'; // Legacy LocalStorage implementation
import { collaboratorRepository, CollaboratorRepository } from './repositories/collaborator-repository';
import { activityLogRepository, ActivityLogRepository } from './repositories/activity-log-repository';
import { favoriteRepository, FavoriteRepository } from './repositories/favorite-repository';
import { savedContactRepository, SavedContactRepository, freightContactRepository, FreightContactRepository } from './repositories/saved-contact-repository';

// Re-export repositories
export { userRepository, UserRepository };
export { freightRepository, FreightRepository };
export { notificationRepository, NotificationRepository };
export { driverRepository, DriverRepository };
export { companyRepository, CompanyRepository };
export { chatRepository, messageRepository, MessageRepository };
export type { ChatRepository };
export { socialPostRepository, commentRepository, SocialPostRepository };
export type { CommentRepository };
export { transactionRepository, TransactionRepository };
export { ratingRepository, RatingRepository };
export { preferredRouteRepository, PreferredRouteRepository };
export { collaborators };
export { collaboratorRepository, CollaboratorRepository };
export { activityLogRepository, ActivityLogRepository };
export { favoriteRepository, FavoriteRepository };
export { savedContactRepository, SavedContactRepository, freightContactRepository, FreightContactRepository };

// Create unified database object for convenient access
export const database = {
  users: userRepository,
  freights: freightRepository,
  notifications: notificationRepository,
  drivers: driverRepository,
  companies: companyRepository,
  chats: chatRepository,
  messages: messageRepository,
  socialPosts: socialPostRepository,
  comments: commentRepository,
  transactions: transactionRepository,
  ratings: ratingRepository,
  preferredRoutes: preferredRouteRepository,
  // ⚠️ Usando a implementação legada de collaborators (LocalStorage) 
  // que tem todos os métodos necessários (getInvitesByCompany, getCustomRoles, etc)
  // O CollaboratorRepository (Supabase) será usado diretamente onde necessário
  collaborators: {
    ...collaborators,
    // Adicionar métodos do CollaboratorRepository que não estão no legacy
    getByCompany: (companyId: string) => collaboratorRepository.getByCompany(companyId),
  },
  activityLogs: activityLogRepository,
  favorites: favoriteRepository,
  savedContacts: savedContactRepository,
  freightContacts: freightContactRepository,
  
  // Helper methods para disponibilidade de motoristas
  getDriverAvailability: (userId: string) => driverRepository.getDriverAvailability(userId),
  updateDriverAvailability: (userId: string, updates: any) => driverRepository.updateDriverAvailability(userId, updates),
  
  // Alias para compatibilidade - buscar motoristas disponíveis por localização
  getAvailableDriversByLocation: (city?: string, state?: string) => {
    if (city && state) {
      // Retornar dados RAW com profiles para compatibilidade com UI
      return driverRepository.getAvailableByLocationWithProfiles(city, state);
    }
    // Se não passar city/state, retornar todos os drivers disponíveis
    return driverRepository.getAll().then(result => {
      if (!result.success || !result.data) return result;
      const now = new Date().toISOString();
      const availableDrivers = result.data.filter((driver: any) => 
        driver.available && 
        driver.availabilityExpiresAt && 
        driver.availabilityExpiresAt > now
      );
      return { success: true, data: availableDrivers };
    });
  },
};

// Re-export unifiedUsers from unified-database for compatibility
import { database as unifiedDatabase } from '../unified-database';
(database as any).unifiedUsers = unifiedDatabase.unifiedUsers;
(database as any).profiles = unifiedDatabase.profiles;

// Garantir que o objeto está completamente inicializado antes de exportar