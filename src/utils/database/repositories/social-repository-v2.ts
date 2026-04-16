/**
 * Social Repository - 100% Integrado com Supabase
 * Gerencia Posts, Comments e Likes da rede social
 * 
 * ARQUITETURA:
 * 1. Supabase como fonte primária
 * 2. LocalStorage como cache opcional
 * 3. Queries com joins para autores e likes
 */

import { getSupabaseClient } from '../../supabase/client';
import { db, DBResponse } from '../db-client';
import { SocialPost, KeyPatterns, PaginationParams } from '../schema';
import { socialPostToSQL, sqlToSocialPost } from '../adapters';
import { generateId } from '../id-generator';

// ============================================
// SOCIAL POST REPOSITORY
// ============================================

export class SocialPostRepository {
  /**
   * Create a new post
   */
  async create(post: Omit<SocialPost, 'id' | 'createdAt' | 'updatedAt' | 'likes' | 'likedBy' | 'comments' | 'shares'>): Promise<DBResponse<SocialPost>> {
    try {
      const now = new Date().toISOString();

      // 1. SALVAR NO SUPABASE - deixar Supabase gerar UUID
      const supabase = getSupabaseClient();

      const { data, error } = await supabase
        .from('social_posts')
        .insert({
          // ❌ NÃO passar ID - deixar Supabase gerar UUID automaticamente
          author_id: post.authorId,
          content: post.content,
          type: post.type || 'text',
          attachments: post.attachments || [],
          visibility: post.visibility || 'public',
          likes_count: 0,
          comments_count: 0,
          shares_count: 0,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (error) throw error;

      const created = sqlToSocialPost(data);
      console.log('✅ Post criado no Supabase:', created.id);

      // 2. CACHE
      await db.set(KeyPatterns.post(created.id), created);

      return {
        success: true,
        data: created,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create post',
      };
    }
  }

  /**
   * Get post by ID
   */
  async getById(id: string): Promise<DBResponse<SocialPost>> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('social_posts')
        .select(`
          *,
          profiles:author_id (name, avatar_url)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      const post = sqlToSocialPost(data);
      
      // Add author info
      if (data.profiles) {
        post.authorName = data.profiles.name || '';
        post.authorAvatar = data.profiles.avatar_url;
      }

      // Get liked by
      const { data: likes } = await supabase
        .from('social_likes')
        .select('user_id')
        .eq('post_id', id);

      if (likes) {
        post.likedBy = likes.map(l => l.user_id);
      }

      await db.set(KeyPatterns.post(id), post);

      return {
        success: true,
        data: post,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get post',
      };
    }
  }

  /**
   * Get feed (all public posts)
   */
  async getFeed(params?: Partial<PaginationParams>): Promise<DBResponse<SocialPost[]>> {
    try {
      const { limit = 20, offset = 0 } = params || {};

      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('social_posts')
        .select(`
          *,
          profiles:author_id (name, avatar_url)
        `)
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      const posts = data.map((row: any) => {
        const post = sqlToSocialPost(row);
        if (row.profiles) {
          post.authorName = row.profiles.name || '';
          post.authorAvatar = row.profiles.avatar_url;
        }
        return post;
      });

      console.log(`✅ ${posts.length} posts carregados do feed`);

      return {
        success: true,
        data: posts,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get feed',
      };
    }
  }

  /**
   * Get posts by author
   */
  async getByAuthor(authorId: string, params?: Partial<PaginationParams>): Promise<DBResponse<SocialPost[]>> {
    try {
      const { limit = 20, offset = 0 } = params || {};

      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('social_posts')
        .select(`
          *,
          profiles:author_id (name, avatar_url)
        `)
        .eq('author_id', authorId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      const posts = data.map((row: any) => {
        const post = sqlToSocialPost(row);
        if (row.profiles) {
          post.authorName = row.profiles.name || '';
          post.authorAvatar = row.profiles.avatar_url;
        }
        return post;
      });

      return {
        success: true,
        data: posts,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get author posts',
      };
    }
  }

  /**
   * Update post
   */
  async update(id: string, updates: Partial<SocialPost>): Promise<DBResponse<SocialPost>> {
    try {
      const now = new Date().toISOString();

      const supabase = getSupabaseClient();
      const updateData: any = {
        updated_at: now,
      };

      if (updates.content !== undefined) updateData.content = updates.content;
      if (updates.images !== undefined) updateData.images = updates.images;
      if (updates.visibility !== undefined) updateData.visibility = updates.visibility;

      const { data, error } = await supabase
        .from('social_posts')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const post = sqlToSocialPost(data);
      await db.set(KeyPatterns.post(id), post);

      return {
        success: true,
        data: post,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update post',
      };
    }
  }

  /**
   * Delete post
   */
  async delete(id: string): Promise<DBResponse<boolean>> {
    try {
      const supabase = getSupabaseClient();
      
      // Delete likes and comments first
      await supabase.from('social_likes').delete().eq('post_id', id);
      await supabase.from('social_comments').delete().eq('post_id', id);
      
      // Delete post
      const { error } = await supabase
        .from('social_posts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await db.del(KeyPatterns.post(id));

      return { success: true, data: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete post',
      };
    }
  }

  /**
   * Like a post
   */
  async like(postId: string, userId: string): Promise<DBResponse<boolean>> {
    try {
      const supabase = getSupabaseClient();

      // Check if already liked
      const { data: existing } = await supabase
        .from('social_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        return { success: true, data: true };
      }

      // Add like - deixar Supabase gerar UUID
      const { error: likeError } = await supabase
        .from('social_likes')
        .insert({
          // ❌ NÃO passar ID - deixar Supabase gerar UUID automaticamente
          post_id: postId,
          user_id: userId,
          created_at: new Date().toISOString(),
        });

      if (likeError) throw likeError;

      // Increment likes count
      const { error: updateError } = await supabase.rpc('increment_post_likes', { post_id: postId });

      if (updateError) {
        // Fallback
        const { data } = await supabase
          .from('social_posts')
          .select('likes_count')
          .eq('id', postId)
          .single();

        if (data) {
          await supabase
            .from('social_posts')
            .update({ likes_count: (data.likes_count || 0) + 1 })
            .eq('id', postId);
        }
      }

      return { success: true, data: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to like post',
      };
    }
  }

  /**
   * Unlike a post
   */
  async unlike(postId: string, userId: string): Promise<DBResponse<boolean>> {
    try {
      const supabase = getSupabaseClient();

      // Remove like
      const { error: likeError } = await supabase
        .from('social_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId);

      if (likeError) throw likeError;

      // Decrement likes count
      const { data } = await supabase
        .from('social_posts')
        .select('likes_count')
        .eq('id', postId)
        .single();

      if (data && data.likes_count > 0) {
        await supabase
          .from('social_posts')
          .update({ likes_count: data.likes_count - 1 })
          .eq('id', postId);
      }

      return { success: true, data: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to unlike post',
      };
    }
  }

  /**
   * Add comment to post
   */
  async addComment(postId: string, authorId: string, content: string): Promise<DBResponse<any>> {
    try {
      const supabase = getSupabaseClient();
      const now = new Date().toISOString();

      // Insert comment - deixar Supabase gerar UUID
      const { data: comment, error: commentError } = await supabase
        .from('social_comments')
        .insert({
          // ❌ NÃO passar ID - deixar Supabase gerar UUID automaticamente
          post_id: postId,
          author_id: authorId,
          content,
          likes_count: 0,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (commentError) throw commentError;

      // Increment comments count
      const { data } = await supabase
        .from('social_posts')
        .select('comments_count')
        .eq('id', postId)
        .single();

      if (data) {
        await supabase
          .from('social_posts')
          .update({ comments_count: (data.comments_count || 0) + 1 })
          .eq('id', postId);
      }

      return { success: true, data: comment };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add comment',
      };
    }
  }

  /**
   * Get comments for a post
   */
  async getComments(postId: string, limit: number = 50): Promise<DBResponse<any[]>> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('social_comments')
        .select(`
          *,
          profiles:author_id (name, avatar_url)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) throw error;

      return { success: true, data: data || [] };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get comments',
      };
    }
  }

  /**
   * Delete comment
   */
  async deleteComment(commentId: string, postId: string): Promise<DBResponse<boolean>> {
    try {
      const supabase = getSupabaseClient();

      // Delete comment
      const { error: deleteError } = await supabase
        .from('social_comments')
        .delete()
        .eq('id', commentId);

      if (deleteError) throw deleteError;

      // Decrement comments count
      const { data } = await supabase
        .from('social_posts')
        .select('comments_count')
        .eq('id', postId)
        .single();

      if (data && data.comments_count > 0) {
        await supabase
          .from('social_posts')
          .update({ comments_count: data.comments_count - 1 })
          .eq('id', postId);
      }

      return { success: true, data: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete comment',
      };
    }
  }
}

export const socialPostRepository = new SocialPostRepository();

// Backward compatibility exports
export const commentRepository = {
  async getByPostId(postId: string) {
    return socialPostRepository.getComments(postId);
  },
  async create(postId: string, authorId: string, content: string) {
    return socialPostRepository.addComment(postId, authorId, content);
  },
  async delete(commentId: string, postId: string) {
    return socialPostRepository.deleteComment(commentId, postId);
  }
};

// Classes are already exported via 'export class' above
export type CommentRepositoryType = typeof commentRepository;

// Type alias for backward compatibility
export type CommentRepository = typeof commentRepository;