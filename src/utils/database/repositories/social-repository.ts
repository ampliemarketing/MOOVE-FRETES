/**
 * Social Repository - 100% Integrado com Supabase
 * VERSÃO FINAL - Posts + Comments + Likes
 */

// Re-export everything from v2
export {
  SocialPostRepository,
  socialPostRepository,
  commentRepository,
} from './social-repository-v2';

// Export type aliases separately
export type { CommentRepository, CommentRepositoryType } from './social-repository-v2';