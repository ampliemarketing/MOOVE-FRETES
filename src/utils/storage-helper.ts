/**
 * ════════════════════════════════════════════════════════════════
 * STORAGE HELPER - MOOVEFRETES
 * ════════════════════════════════════════════════════════════════
 * 
 * REGRAS ABSOLUTAS:
 * ✅ SEMPRE salvar PATH no banco (nunca URL, nunca base64)
 * ✅ Gerar URLs dinamicamente apenas para exibição
 * ✅ Buckets públicos: getPublicUrl(path)
 * ✅ Buckets privados: createSignedUrl(path, 3600)
 * ❌ NUNCA persistir signed URLs ou public URLs no banco
 * ❌ NUNCA usar base64 em lugar nenhum
 * 
 * BUCKETS:
 * - avatars (público) - Avatares de usuários/empresas
 * - documents (privado) - CNH, RG, CNPJ, contratos
 * - freight-images (público) - Posts sociais, tracking
 * - chat-attachments (privado) - Anexos de chat
 */

import { getSupabaseClient } from './supabase/client';

// ════════════════════════════════════════════════════════════════
// CACHE DE URLS (PERFORMANCE OPTIMIZATION)
// ════════════════════════════════════════════════════════════════

/**
 * Cache in-memory para URLs geradas
 * Evita recalcular mesma URL múltiplas vezes
 * Limite de 1000 entradas para evitar memory leak
 */
const urlCache = new Map<string, string>();

// ════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════

export interface UploadResult {
  success: boolean;
  path?: string;
  error?: string;
}

export interface MultiUploadResult {
  success: boolean;
  paths?: Record<string, string>;
  error?: string;
}

// ════════════════════════════════════════════════════════════════
// VALIDAÇÕES
// ════════════════════════════════════════════════════════════════

const MAX_FILE_SIZE = {
  avatar: 5 * 1024 * 1024, // 5MB
  document: 10 * 1024 * 1024, // 10MB
  image: 5 * 1024 * 1024, // 5MB
};

const ALLOWED_TYPES = {
  avatar: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  document: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  image: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
};

function validateFile(
  file: File,
  type: 'avatar' | 'document' | 'image'
): { valid: boolean; error?: string } {
  // Validar tipo
  if (!ALLOWED_TYPES[type].includes(file.type)) {
    return {
      valid: false,
      error: `Tipo de arquivo não permitido. Aceitos: ${ALLOWED_TYPES[type].join(', ')}`,
    };
  }

  // Validar tamanho
  if (file.size > MAX_FILE_SIZE[type]) {
    const maxMB = MAX_FILE_SIZE[type] / (1024 * 1024);
    return {
      valid: false,
      error: `Arquivo muito grande. Tamanho máximo: ${maxMB}MB`,
    };
  }

  return { valid: true };
}

function sanitizeFilename(filename: string): string {
  return filename
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '_')
    .substring(0, 100);
}

// ════════════════════════════════════════════════════════════════
// 1. UPLOAD DE AVATARES (PÚBLICO)
// ════════════════════════════════════════════════════════════════

/**
 * Upload de avatar (foto de perfil)
 * Bucket: avatars (público)
 * Retorna: PATH (não URL!)
 */
export async function uploadAvatar(
  userId: string,
  file: File
): Promise<UploadResult> {
  try {
    // Validar
    const validation = validateFile(file, 'avatar');
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const supabase = getSupabaseClient();
    const fileExt = file.name.split('.').pop() || 'jpg';
    const timestamp = Date.now();
    
    // PATH: userId/avatar_timestamp.ext
    const filePath = `${userId}/avatar_${timestamp}.${fileExt}`;

    console.log('📤 [Storage] Uploading avatar:', filePath);

    const { error } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: false });

    if (error) throw error;

    console.log('✅ [Storage] Avatar uploaded successfully');

    // ⚠️ RETORNAR PATH, NÃO URL!
    return {
      success: true,
      path: filePath,
    };
  } catch (error) {
    console.error('❌ [Storage] Upload avatar error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

// ════════════════════════════════════════════════════════════════
// 2. UPLOAD DE DOCUMENTOS (PRIVADO - MÚLTIPLOS)
// ════════════════════════════════════════════════════════════════

/**
 * Upload de múltiplos documentos (CNH, RG, etc)
 * Bucket: documents (privado)
 * Retorna: PATHS em objeto (não URLs!)
 */
export async function uploadDocuments(
  ownerId: string,
  files: Record<string, File>
): Promise<MultiUploadResult> {
  try {
    const supabase = getSupabaseClient();
    const uploadedPaths: Record<string, string> = {};
    const errors: string[] = [];

    console.log(`📤 [Storage] Uploading ${Object.keys(files).length} documents...`);

    for (const [docKey, file] of Object.entries(files)) {
      if (!file) continue;

      // Validar
      const validation = validateFile(file, 'document');
      if (!validation.valid) {
        errors.push(`${docKey}: ${validation.error}`);
        continue;
      }

      const fileExt = file.name.split('.').pop() || 'pdf';
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      
      // PATH: ownerId/docKey_timestamp_random.ext
      const filePath = `${ownerId}/${docKey}_${timestamp}_${random}.${fileExt}`;

      console.log(`📄 [Storage] Uploading ${docKey}:`, filePath);

      const { error } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (error) {
        errors.push(`${docKey}: ${error.message}`);
        console.error(`❌ [Storage] Failed to upload ${docKey}:`, error);
      } else {
        uploadedPaths[docKey] = filePath;
        console.log(`✅ [Storage] ${docKey} uploaded successfully`);
      }
    }

    if (errors.length > 0 && Object.keys(uploadedPaths).length === 0) {
      return {
        success: false,
        error: errors.join('; '),
      };
    }

    console.log(`✅ [Storage] Documents uploaded: ${Object.keys(uploadedPaths).length}/${Object.keys(files).length}`);

    return {
      success: true,
      paths: uploadedPaths,
    };
  } catch (error) {
    console.error('❌ [Storage] Upload documents error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

// ════════════════════════════════════════════════════════════════
// 3. UPLOAD DE IMAGENS (PÚBLICO - MÚLTIPLAS)
// ════════════════════════════════════════════════════════════════

/**
 * Upload de múltiplas imagens (posts sociais, tracking)
 * Bucket: freight-images (público)
 * Retorna: Array de resultados com PATHS
 */
export async function uploadMultipleImages(
  files: File[],
  folder?: string
): Promise<UploadResult[]> {
  const supabase = getSupabaseClient();
  const results: UploadResult[] = [];

  console.log(`📤 [Storage] Uploading ${files.length} images...`);

  for (const file of files) {
    try {
      // Validar
      const validation = validateFile(file, 'image');
      if (!validation.valid) {
        results.push({ success: false, error: validation.error });
        continue;
      }

      const fileExt = file.name.split('.').pop() || 'jpg';
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      
      // PATH: [folder/]timestamp_random.ext
      const fileName = `${timestamp}_${random}.${fileExt}`;
      const filePath = folder ? `${folder}/${fileName}` : fileName;

      const { error } = await supabase.storage
        .from('freight-images')
        .upload(filePath, file);

      if (error) throw error;

      results.push({
        success: true,
        path: filePath,
      });

      console.log('✅ [Storage] Image uploaded:', filePath);
    } catch (error) {
      results.push({
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      });
    }
  }

  const successCount = results.filter(r => r.success).length;
  console.log(`✅ [Storage] Uploaded ${successCount}/${files.length} images`);

  return results;
}

// ════════════════════════════════════════════════════════════════
// 4. UPLOAD DE ANEXO DE CHAT (PRIVADO)
// ════════════════════════════════════════════════════════════════

/**
 * Upload de anexo de chat (privado)
 * Bucket: chat-attachments (privado)
 * Retorna: PATH (não URL!)
 */
export async function uploadChatAttachment(
  conversationId: string,
  file: File
): Promise<UploadResult> {
  try {
    // Validar (aceita imagens e documentos)
    const isImage = ALLOWED_TYPES.image.includes(file.type);
    const isDocument = ALLOWED_TYPES.document.includes(file.type);

    if (!isImage && !isDocument) {
      return {
        success: false,
        error: 'Tipo de arquivo não permitido',
      };
    }

    const maxSize = isImage ? MAX_FILE_SIZE.image : MAX_FILE_SIZE.document;
    if (file.size > maxSize) {
      return {
        success: false,
        error: `Arquivo muito grande (máx ${maxSize / (1024 * 1024)}MB)`,
      };
    }

    const supabase = getSupabaseClient();
    const timestamp = Date.now();
    const safeFilename = sanitizeFilename(file.name);
    
    // PATH: conversationId/timestamp_filename
    const filePath = `${conversationId}/${timestamp}_${safeFilename}`;

    console.log('📤 [Storage] Uploading chat attachment:', filePath);

    const { error } = await supabase.storage
      .from('chat-attachments')
      .upload(filePath, file);

    if (error) throw error;

    console.log('✅ [Storage] Chat attachment uploaded successfully');

    return {
      success: true,
      path: filePath,
    };
  } catch (error) {
    console.error('❌ [Storage] Upload chat attachment error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

// ════════════════════════════════════════════════════════════════
// 5. HELPERS DE EXIBIÇÃO (GERAR URLS DINAMICAMENTE)
// ════════════════════════════════════════════════════════════════

/**
 * Gerar URL pública para buckets públicos
 * ⚠️ Usar APENAS para exibição, NUNCA salvar no banco!
 */
export function getPublicFileUrl(bucket: string, path: string): string {
  const supabase = getSupabaseClient();
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Gerar signed URL para buckets privados
 * ⚠️ URLs expiram! Usar APENAS para exibição, NUNCA salvar no banco!
 */
export async function getSignedFileUrl(
  bucket: string,
  path: string,
  expiresIn: number = 3600 // 1 hora
): Promise<string | null> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) throw error;
    return data.signedUrl;
  } catch (error) {
    console.error(`❌ [Storage] Error creating signed URL for ${bucket}/${path}:`, error);
    return null;
  }
}

/**
 * Gerar URL de avatar (público)
 * Aceita null/undefined para casos de perfis sem avatar
 * 
 * ✅ PERFORMANCE: Usa cache para evitar recálculos
 * - Cache hit: retorna URL já calculada (~0.01ms)
 * - Cache miss: gera URL e cacheia (~1ms)
 * - Limite: 1000 entradas (previne memory leak)
 */
export function getAvatarUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  
  // ✅ Se já for uma URL completa (http/https/blob/data), retornar como está
  // Previne dupla conversão: getAvatarUrl(getAvatarUrl(path))
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:') || path.startsWith('data:')) {
    return path;
  }
  
  // ✅ Cache hit - retorna URL já calculada
  const cached = urlCache.get(path);
  if (cached) {
    return cached;
  }
  
  // ✅ Remover prefixo "avatars/" se já existir no PATH
  // Isso previne duplicação: avatars/avatars/xxx/file.jpg
  const cleanPath = path.startsWith('avatars/') ? path.substring('avatars/'.length) : path;
  
  // ✅ Cache miss - gerar e cachear
  const url = getPublicFileUrl('avatars', cleanPath);
  urlCache.set(path, url);
  
  // ✅ Limitar tamanho do cache (previne memory leak)
  // Remove entrada mais antiga se cache passar de 1000 itens
  if (urlCache.size > 1000) {
    const firstKey = urlCache.keys().next().value;
    if (firstKey) {
      urlCache.delete(firstKey);
    }
  }
  
  return url;
}

/**
 * 🔍 DEBUG: Ver estatísticas do cache de avatares
 * Use no console: window.debugAvatarCache()
 */
if (typeof window !== 'undefined') {
  (window as any).debugAvatarCache = () => {
    console.group('🖼️ Cache de Avatares');
    console.log('📊 Tamanho:', urlCache.size);
    console.log('💾 Primeiras 10 entradas:', Array.from(urlCache.entries()).slice(0, 10));
    console.groupEnd();
  };
}

/**
 * Gerar signed URL de documento (privado)
 * URLs expiram em 1 hora
 */
export async function getDocumentUrl(
  path: string | null | undefined
): Promise<string | null> {
  if (!path) return null;
  
  // ✅ Remover prefixo "documents/" se já existir no PATH
  const cleanPath = path.startsWith('documents/') ? path.substring('documents/'.length) : path;
  
  return getSignedFileUrl('documents', cleanPath, 3600);
}

/**
 * Gerar signed URL de anexo de chat (privado)
 * URLs expiram em 1 hora
 */
export async function getChatAttachmentUrl(
  path: string | null | undefined
): Promise<string | null> {
  if (!path) return null;
  
  // ✅ Remover prefixo "chat-attachments/" se já existir no PATH
  const cleanPath = path.startsWith('chat-attachments/') ? path.substring('chat-attachments/'.length) : path;
  
  return getSignedFileUrl('chat-attachments', cleanPath, 3600);
}

/**
 * Gerar URL de imagem de post/tracking (público)
 */
export function getFreightImageUrl(
  path: string | null | undefined
): string | null {
  if (!path) return null;
  
  // ✅ Remover prefixo "freight-images/" se já existir no PATH
  const cleanPath = path.startsWith('freight-images/') ? path.substring('freight-images/'.length) : path;
  
  return getPublicFileUrl('freight-images', cleanPath);
}

// ════════════════════════════════════════════════════════════════
// 6. UTILITÁRIOS
// ════════════════════════════════════════════════════════════════

/**
 * Upload de múltiplos documentos de cadastro
 * Usado em TruckerRegistration e CompanyRegistration
 * Retorna: PATHS em objeto (não URLs!)
 */
export async function uploadRegistrationDocuments(
  userId: string,
  uploads: Record<string, File | undefined>
): Promise<MultiUploadResult> {
  // Filtrar apenas arquivos válidos
  const validFiles: Record<string, File> = {};
  
  for (const [key, file] of Object.entries(uploads)) {
    if (file instanceof File) {
      validFiles[key] = file;
    }
  }
  
  if (Object.keys(validFiles).length === 0) {
    return {
      success: true,
      paths: {},
    };
  }
  
  console.log(`📤 [Storage] Uploading ${Object.keys(validFiles).length} registration documents...`);
  
  // Usar uploadDocuments que já existe
  return uploadDocuments(userId, validFiles);
}

/**
 * Deletar arquivo do Storage
 */
export async function deleteFile(
  bucket: string,
  path: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.storage.from(bucket).remove([path]);

    if (error) throw error;

    console.log(`🗑️ [Storage] File deleted: ${bucket}/${path}`);
    return { success: true };
  } catch (error) {
    console.error('❌ [Storage] Delete error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Delete failed',
    };
  }
}

/**
 * Extrair PATH de uma URL antiga do Supabase
 * Útil para migração de dados legados
 */
export function extractPathFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathMatch = urlObj.pathname.match(/\/object\/(public|sign)\/([^/]+)\/(.+)/);
    if (pathMatch && pathMatch[3]) {
      // Remover query params se for signed URL
      return pathMatch[3].split('?')[0];
    }
    return null;
  } catch {
    return null;
  }
}

// ════════════════════════════════════════════════════════════════
// 7. COMPATIBILIDADE (LEGADO)
// ════════════════════════════════════════════════════════════════

/**
 * @deprecated Use uploadAvatar() que retorna path
 */
export async function uploadAvatarLegacy(userId: string, file: File) {
  const result = await uploadAvatar(userId, file);
  if (result.success && result.path) {
    return {
      ...result,
      url: getAvatarUrl(result.path), // Para compatibilidade
    };
  }
  return result;
}

/**
 * @deprecated Use uploadDocuments() que retorna paths
 */
export async function uploadDocument(
  userId: string,
  file: File,
  documentType: string
): Promise<UploadResult> {
  const result = await uploadDocuments(userId, { [documentType]: file });
  if (result.success && result.paths) {
    return {
      success: true,
      path: result.paths[documentType],
    };
  }
  return {
    success: false,
    error: result.error,
  };
}