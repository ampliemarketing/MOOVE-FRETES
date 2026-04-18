import React, { useState, useRef, useEffect } from 'react';
import { useApp } from './contexts/AppContext';
import { toast } from 'sonner@2.0.3';
import { usePosts } from '../utils/hooks/usePosts';
import type { Post } from '../utils/hooks/usePosts';
import { database } from '../utils/database';
import { uploadMultipleImages, getFreightImageUrl, getAvatarUrl } from '../utils/storage-helper';
import { LoadingSpinner } from './LoadingSpinner';
import { Alert } from './ui/enhanced-components';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  MoreHorizontal,
  Image as ImageIcon,
  Plus,
  X,
  Send,
  Truck,
  Package,
  User,
  MapPin,
  TrendingUp,
  Flame,
  Sparkles,
  Route,
  Coffee,
  Zap,
  Shield,
  Clock,
  Building,
  Hash,
  AtSign,
  Upload,
  RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
export function SocialFeed() {
  const { state } = useApp();
  const user = state.user;
  
  // ✅ Resolver companyId: se for colaborador, usar o companyId da empresa vinculada
  const resolvedCompanyId = user?.collaborator?.companyId || user?.id || '';
  const displayName = user?.collaborator ? (user?.collaborator?.companyName || user?.name || '') : (user?.name || '');
  
  // ✅ CONVERTER avatar PATH → URL dinamicamente
  const userAvatarUrl = React.useMemo(() => getAvatarUrl(user?.profile?.avatar), [user?.profile?.avatar]);
  
  const { posts, loading, error, loadPosts, createPost, likePost, commentPost } = usePosts();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // ✅ CORRETO: Guardar File[] em estado (NÃO base64!)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  
  const [uploadingImages, setUploadingImages] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [postTags, setPostTags] = useState('');
  const [postLocation, setPostLocation] = useState('');
  const [selectedFreight, setSelectedFreight] = useState<string>('');
  const [commenting, setCommenting] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [freights, setFreights] = useState<any[]>([]);

  // ✅ Cleanup de object URLs quando componente desmonta
  useEffect(() => {
    return () => {
      previewUrls.forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [previewUrls]);

  const loadPosts_DEPRECATED = async () => {
    // This function is deprecated - using usePosts hook instead
  };

  const loadFreights = async () => {
    if (!user) return;
    
    try {
      if (user.userType === 'embarcador') {
        const response = await database.freights.getByCustomer(resolvedCompanyId);
        if (response.success && response.data) {
          // Filtrar por status 'active' ao invés de 'published' (que não existe)
          setFreights(response.data.filter(f => f.status === 'active'));
        }
      }
    } catch (error) {
      console.error('Error loading freights:', error);
    }
  };

  // ✅ NOVO: Upload de imagens SEM base64
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Validar limite de 4 imagens
    const currentCount = uploadedFiles.length;
    const newCount = files.length;
    const totalCount = currentCount + newCount;

    if (totalCount > 4) {
      toast.error(`Máximo de 4 imagens. Você já tem ${currentCount}.`);
      return;
    }

    setUploadingImages(true);
    
    try {
      const validFiles: File[] = [];
      const newPreviews: string[] = [];

      for (const file of Array.from(files)) {
        // Validar tipo
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
          toast.error(`Tipo inválido: ${file.name}`);
          continue;
        }

        // Validar tamanho (5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} muito grande (máx 5MB)`);
          continue;
        }

        // ✅ CORRETO: Preview com URL.createObjectURL
        const objectUrl = URL.createObjectURL(file);
        
        validFiles.push(file);
        newPreviews.push(objectUrl);
      }

      if (validFiles.length > 0) {
        setUploadedFiles(prev => [...prev, ...validFiles].slice(0, 4));
        setPreviewUrls(prev => [...prev, ...newPreviews].slice(0, 4));
        toast.success(`${validFiles.length} imagem(ns) adicionada(s)`);
      }
    } catch (error) {
      console.error('❌ [SocialFeed] Error selecting images:', error);
      toast.error('Erro ao adicionar imagens');
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = (index: number) => {
    // ✅ Liberar object URL
    const urlToRevoke = previewUrls[index];
    if (urlToRevoke && urlToRevoke.startsWith('blob:')) {
      URL.revokeObjectURL(urlToRevoke);
    }

    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreatePost = async () => {
    if (!postContent.trim() || !user) return;

    setSubmitting(true);
    try {
      const tags = postTags
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const freightData = selectedFreight ? freights.find(f => f.id === selectedFreight) : undefined;
      
      // ✅ UPLOAD CORRETO: Files direto, sem base64!
      let imagePaths: string[] = [];
      
      if (uploadedFiles.length > 0) {
        
        // Upload direto dos Files para Storage
        const results = await uploadMultipleImages(uploadedFiles, 'posts');
        
        // ✅ COLETAR PATHS (NÃO URLs!)
        imagePaths = results
          .filter(r => r.success && r.path)
          .map(r => r.path!);
        
        if (imagePaths.length === 0 && uploadedFiles.length > 0) {
          toast.error('Erro ao fazer upload das imagens');
          setSubmitting(false);
          return;
        }
        
      }

      // ✅ SALVAR PATHS NO BANCO (NÃO URLs!)
      await createPost({
        content: postContent,
        tags,
        location: postLocation || undefined,
        freight_id: selectedFreight || undefined,
        freight_data: freightData ? {
          origin: freightData.origin,
          destination: freightData.destination,
          cargo_type: freightData.cargo_type,
          price: freightData.price,
        } : undefined,
        images: imagePaths, // ← PATHS!
      });

      toast.success('Post publicado com sucesso!');
      
      // ✅ Limpar previews
      previewUrls.forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
      
      // Reset form
      setPostContent('');
      setPostTags('');
      setPostLocation('');
      setSelectedFreight('');
      setUploadedFiles([]);
      setPreviewUrls([]);
      setShowCreatePost(false);
    } catch (error) {
      console.error('❌ [SocialFeed] Error creating post:', error);
      toast.error('Erro ao publicar post');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (postId: string) => {
    if (!user) return;

    try {
      const post = posts.find(p => p.id === postId);
      if (!post) return;

      const hasLiked = post.likedBy?.includes(resolvedCompanyId) || false;
      
      await database.socialPosts.toggleLike(postId, resolvedCompanyId);
      
      if (hasLiked) {
        toast.success('Curtida removida');
      } else {
        toast.success('Post curtido!');
      }

      // Posts will auto-refresh from the hook
    } catch (error) {
      console.error('Error liking post:', error);
      toast.error('Erro ao curtir post');
    }
  };

  const handleComment = async (postId: string) => {
    if (!commentText.trim() || !user) return;

    setSubmitting(true);
    try {
      const response = await database.comments.create({
        postId,
        authorId: resolvedCompanyId,
        authorName: displayName,
        content: commentText.trim(),
      });

      if (response.success) {
        toast.success('Comentário adicionado!');
        setCommentText('');
        setCommenting(null);
        // Posts will auto-refresh from the hook
      } else {
        toast.error('Erro ao comentar');
      }
    } catch (error) {
      console.error('Error commenting:', error);
      toast.error('Erro ao comentar');
    } finally {
      setSubmitting(false);
    }
  };

  const getUserIcon = (userType: string) => {
    switch (userType) {
      case 'transportadora':
        return <Truck className="w-4 h-4" />;
      case 'caminhoneiro':
        return <User className="w-4 h-4" />;
      case 'embarcador':
        return <Package className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  const getUserTypeLabel = (userType: string) => {
    const labels: Record<string, string> = {
      embarcador: 'Embarcador',
      transportadora: 'Transportadora',
      caminhoneiro: 'Caminhoneiro',
      agenciador: 'Agenciador',
    };
    return labels[userType] || userType;
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'agora';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const trendingTopics = [
    { id: '1', title: 'Preço do Diesel', posts: 1247, icon: <Flame className="w-4 h-4" />, trend: 'hot' },
    { id: '2', title: 'Rota SP-RJ', posts: 892, icon: <Route className="w-4 h-4" />, trend: 'up' },
    { id: '3', title: 'Frete Urgente', posts: 534, icon: <Zap className="w-4 h-4" />, trend: 'new' },
    { id: '4', title: 'Dicas Estrada', posts: 423, icon: <Coffee className="w-4 h-4" />, trend: 'up' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Sparkles className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Carregando feed...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-3 space-y-6">
            {/* User Card */}
            {user && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={userAvatarUrl || undefined} />
                      <AvatarFallback>
                        {getUserIcon(user.userType)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{displayName}</p>
                        <Shield className="w-4 h-4 text-blue-500" />
                      </div>
                      <p className="text-xs text-muted-foreground">{getUserTypeLabel(user.userType)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="font-medium">{posts.filter(p => p.authorId === resolvedCompanyId).length}</p>
                      <p className="text-xs text-muted-foreground">Posts</p>
                    </div>
                    <div>
                      <p className="font-medium">{user.gamification?.level || 1}</p>
                      <p className="text-xs text-muted-foreground">Nível</p>
                    </div>
                    <div>
                      <p className="font-medium">{user.gamification?.xp || 0}</p>
                      <p className="text-xs text-muted-foreground">XP</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Trending Topics */}
            <Card className="hidden lg:block">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Trending
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {trendingTopics.map((topic) => (
                  <button
                    key={topic.id}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      {topic.icon}
                      <div>
                        <p className="text-sm font-medium">{topic.title}</p>
                        <p className="text-xs text-muted-foreground">{topic.posts} posts</p>
                      </div>
                    </div>
                    {topic.trend === 'hot' && <Flame className="w-4 h-4 text-orange-500" />}
                    {topic.trend === 'new' && <Sparkles className="w-4 h-4 text-blue-500" />}
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Main Feed */}
          <div className="lg:col-span-6 space-y-6">
            {/* Create Post */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={userAvatarUrl || undefined} />
                    <AvatarFallback>
                      {user && getUserIcon(user.userType)}
                    </AvatarFallback>
                  </Avatar>
                  <Dialog open={showCreatePost} onOpenChange={setShowCreatePost}>
                    <DialogTrigger asChild>
                      <button className="flex-1 text-left px-4 py-2 rounded-full bg-muted hover:bg-muted/80 transition-colors">
                        <p className="text-sm text-muted-foreground">O que você está pensando?</p>
                      </button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Criar Post</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={userAvatarUrl || undefined} />
                            <AvatarFallback>
                              {user && getUserIcon(user.userType)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{displayName}</p>
                            <p className="text-xs text-muted-foreground">{user && getUserTypeLabel(user.userType)}</p>
                          </div>
                        </div>

                        <Textarea
                          placeholder="Compartilhe algo com a comunidade..."
                          value={postContent}
                          onChange={(e) => setPostContent(e.target.value)}
                          rows={4}
                          className="resize-none"
                        />

                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Hash className="w-4 h-4 text-muted-foreground" />
                            <Input
                              placeholder="Tags (separadas por vírgula)"
                              value={postTags}
                              onChange={(e) => setPostTags(e.target.value)}
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            <Input
                              placeholder="Localização (opcional)"
                              value={postLocation}
                              onChange={(e) => setPostLocation(e.target.value)}
                            />
                          </div>

                          {freights.length > 0 && (
                            <div className="flex items-center gap-2">
                              <Package className="w-4 h-4 text-muted-foreground" />
                              <select
                                value={selectedFreight}
                                onChange={(e) => setSelectedFreight(e.target.value)}
                                className="flex-1 px-3 py-2 rounded-lg border border-input bg-input-background text-sm"
                              >
                                <option value="">Compartilhar um frete (opcional)</option>
                                {freights.map((freight) => (
                                  <option key={freight.id} value={freight.id}>
                                    {freight.origin?.city || 'Origem'} → {freight.destination?.city || 'Destino'} ({freight.cargoType})
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>

                        {/* Image Upload Section */}
                        <div className="space-y-3">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                          
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingImages || uploadedFiles.length >= 4}
                            className="w-full"
                          >
                            {uploadingImages ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Enviando...
                              </>
                            ) : (
                              <>
                                <ImageIcon className="w-4 h-4 mr-2" />
                                Adicionar Fotos ({uploadedFiles.length}/4)
                              </>
                            )}
                          </Button>

                          {/* Image Previews */}
                          {previewUrls.length > 0 && (
                            <div className="grid grid-cols-2 gap-2">
                              {previewUrls.map((img, idx) => (
                                <div key={idx} className="relative group">
                                  <img
                                    src={img}
                                    alt={`Upload ${idx + 1}`}
                                    className="w-full h-32 object-cover rounded-lg border border-border"
                                  />
                                  <button
                                    onClick={() => removeImage(idx)}
                                    className="absolute top-2 right-2 p-1 bg-destructive text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setShowCreatePost(false)}>
                            Cancelar
                          </Button>
                          <Button 
                            onClick={handleCreatePost}
                            disabled={!postContent.trim() || submitting}
                            className="bg-primary hover:bg-primary/90 text-white"
                          >
                            {submitting ? 'Publicando...' : 'Publicar'}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>

            {/* Posts */}
            {loading && <LoadingSpinner message="Carregando feed..." />}
            <AnimatePresence>
              {posts.map((post) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={getAvatarUrl(post.userAvatar || (post as any).authorAvatar) || undefined} />
                            <AvatarFallback>
                              {getUserIcon((post as any).authorType || post.userType)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{(post as any).authorName || post.userName}</p>
                              <Shield className="w-4 h-4 text-blue-500" />
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{getUserTypeLabel((post as any).authorType || post.userType)}</span>
                              <span>•</span>
                              <span>{formatTime(post.createdAt)}</span>
                              {post.location && (
                                <>
                                  <span>•</span>
                                  <MapPin className="w-3 h-3" />
                                  <span>{post.location}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3">
                      <p className="whitespace-pre-wrap">{post.content}</p>

                      {/* Image Gallery */}
                      {post.images && post.images.length > 0 && (
                        <div className={`grid gap-2 ${
                          post.images.length === 1 ? 'grid-cols-1' :
                          post.images.length === 2 ? 'grid-cols-2' :
                          post.images.length === 3 ? 'grid-cols-3' :
                          'grid-cols-2'
                        }`}>
                          {post.images.map((imgPath, idx) => {
                            // ✅ Converter PATH para URL dinamicamente
                            const imgUrl = imgPath.startsWith('http') 
                              ? imgPath // Compatibilidade com URLs antigas
                              : getFreightImageUrl(imgPath); // PATH → URL
                            
                            return (
                              <div key={idx} className="relative overflow-hidden rounded-lg border border-border">
                                <img
                                  src={imgUrl || ''}
                                  alt={`Post image ${idx + 1}`}
                                  className={`w-full object-cover cursor-pointer hover:opacity-90 transition-opacity ${
                                    post.images!.length === 1 ? 'h-96' : 'h-48'
                                  }`}
                                  onClick={() => {
                                    // Could open in modal/lightbox
                                    window.open(imgUrl || '', '_blank');
                                  }}
                                />
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {post.tags && post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {post.tags.map((tag, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {post.freightData && (
                        <Card className="bg-muted/50">
                          <CardContent className="p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Package className="w-4 h-4 text-primary" />
                              <p className="text-sm font-medium">Frete Compartilhado</p>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>{post.freightData.origin}</span>
                              <span>→</span>
                              <span>{post.freightData.destination}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{post.freightData.cargoType}</p>
                          </CardContent>
                        </Card>
                      )}

                      <Separator />

                      {/* Actions */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => handleLike(post.id)}
                            className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                          >
                            <Heart
                              className={`w-5 h-5 ${post.hasLiked ? 'fill-red-500 text-red-500' : ''}`}
                            />
                            <span>{post.likes?.length || 0}</span>
                          </button>

                          <button
                            onClick={() => setCommenting(commenting === post.id ? null : post.id)}
                            className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                          >
                            <MessageCircle className="w-5 h-5" />
                            <span>{post.commentList?.length || 0}</span>
                          </button>

                          <button className="flex items-center gap-2 text-sm hover:text-primary transition-colors">
                            <Share2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      {/* Comments Section */}
                      {commenting === post.id && (
                        <div className="space-y-3 pt-3 border-t">
                          {/* Existing Comments */}
                          {post.commentList && post.commentList.length > 0 && (
                            <div className="space-y-2">
                              {post.commentList.map((comment) => (
                                <div key={comment.id} className="flex gap-2">
                                  <Avatar className="w-8 h-8">
                                    <AvatarFallback>
                                      <User className="w-4 h-4" />
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 bg-muted rounded-lg p-2">
                                    <p className="text-sm font-medium">{comment.authorName}</p>
                                    <p className="text-sm text-muted-foreground">{comment.content}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {formatTime(comment.createdAt)}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Add Comment */}
                          <div className="flex items-center gap-2">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={userAvatarUrl || undefined} />
                              <AvatarFallback>
                                {user && getUserIcon(user.userType)}
                              </AvatarFallback>
                            </Avatar>
                            <Input
                              placeholder="Escreva um comentário..."
                              value={commentText}
                              onChange={(e) => setCommentText(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleComment(post.id);
                                }
                              }}
                            />
                            <Button
                              size="sm"
                              onClick={() => handleComment(post.id)}
                              disabled={!commentText.trim() || submitting}
                              className="bg-primary hover:bg-primary/90 text-white"
                            >
                              <Send className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>

            {!loading && error && (
              <Alert
                type="error"
                title="Falha ao carregar o feed"
                message={error}
                action={{ label: 'Tentar novamente', onClick: loadPosts }}
              />
            )}

            {!loading && !error && posts.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Sparkles className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium mb-2">Nenhum post ainda</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Seja o primeiro a compartilhar algo com a comunidade!
                  </p>
                  <Button onClick={() => setShowCreatePost(true)} className="bg-primary hover:bg-primary/90 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Post
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-3 space-y-6 hidden lg:block">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Sugestões</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-muted-foreground text-center py-4">
                  Em breve: Sugestões de conexões
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}