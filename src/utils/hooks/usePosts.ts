/**
 * Custom hook for social posts
 */

import { useState, useEffect, useCallback } from 'react';
import { database } from '../database';
import { toast } from 'sonner@2.0.3';

export interface Post {
  id: string;
  userId: string;
  userName?: string;
  userAvatar?: string;
  userType?: string;
  type: 'route' | 'freight' | 'general' | 'achievement';
  content: string;
  images?: string[];
  route?: {
    origin: string;
    destination: string;
    availableDate?: string;
  };
  freight?: {
    id: string;
    origin: string;
    destination: string;
  };
  likes: string[];
  comments: Array<{
    id: string;
    userId: string;
    userName?: string;
    text: string;
    createdAt: string;
  }>;
  createdAt: string;
}

export function usePosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Carregar do database local
      const response = await database.social.getAllPosts();
      
      if (response.success && response.data) {
        // Mapear dados do database para o formato esperado
        const mappedPosts: Post[] = response.data.map(post => ({
          id: post.id,
          userId: post.authorId,
          userName: post.authorName,
          userAvatar: post.authorAvatar,
          userType: post.authorType,
          type: 'general',
          content: post.content,
          images: post.images || [],
          likes: post.likedBy || [],
          comments: (post.commentsList || []).map(c => ({
            id: c.id || '',
            userId: c.userId || '',
            userName: c.userName || '',
            text: c.text || '',
            createdAt: c.createdAt || new Date().toISOString()
          })),
          createdAt: post.createdAt
        }));
        
        setPosts(mappedPosts);
      } else {
        setPosts([]);
      }
    } catch (err) {
      // Silenciar completamente - sistema offline usa array vazio
      setPosts([]);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const createPost = useCallback(async (post: Partial<Post>) => {
    try {
      // Criar no database local
      const newPost = {
        id: crypto.randomUUID(),
        authorId: post.userId || '',
        authorName: post.userName || '',
        authorAvatar: post.userAvatar || '',
        authorType: post.userType || 'caminhoneiro',
        content: post.content || '',
        images: post.images || [],
        tags: [],
        location: '',
        likes: 0,
        comments: 0,
        shares: 0,
        likedBy: [],
        commentsList: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const response = await database.social.createPost(newPost);
      
      if (response.success && response.data) {
        // Atualizar lista local
        await loadPosts();
        toast.success('Post criado com sucesso!');
        return { success: true, data: response.data };
      }
      return { success: false, error: 'Erro ao criar post' };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar post';
      toast.error(message);
      return { success: false, error: message };
    }
  }, [loadPosts]);

  const likePost = useCallback(async (postId: string, userId: string) => {
    try {
      // Optimistic update
      setPosts(prev => prev.map(post => {
        if (post.id === postId) {
          const likes = post.likes.includes(userId)
            ? post.likes.filter(id => id !== userId)
            : [...post.likes, userId];
          return { ...post, likes };
        }
        return post;
      }));

      // Atualizar no database
      const response = await database.social.likePost(postId, userId);
      
      if (response.success) {
        // Recarregar posts
        await loadPosts();
        return { success: true };
      }
      return { success: false };
    } catch (err) {
      // Revert optimistic update
      await loadPosts();
      return { success: false, error: 'Erro ao curtir post' };
    }
  }, [loadPosts]);

  const commentPost = useCallback(async (postId: string, text: string) => {
    try {
      const comment = {
        id: crypto.randomUUID(),
        userId: '', // Será preenchido pelo database
        userName: '',
        text,
        createdAt: new Date().toISOString()
      };
      
      const response = await database.social.commentPost(postId, comment);
      
      if (response.success) {
        await loadPosts();
        toast.success('Comentário adicionado!');
        return { success: true, data: response.data };
      }
      return { success: false, error: 'Erro ao comentar' };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao comentar';
      toast.error(message);
      return { success: false, error: message };
    }
  }, [loadPosts]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  return {
    posts,
    loading,
    error,
    loadPosts,
    createPost,
    likePost,
    commentPost,
  };
}