import React, { useCallback, useState, useEffect } from 'react';
import { Camera, Upload, X, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { uploadAvatar, getAvatarUrl } from '../utils/storage-helper';

interface AvatarUploadProps {
  currentAvatar?: string;
  userId: string;
  onAvatarUpdate: (avatarUrl: string) => void;
  userType: 'caminhoneiro' | 'transportadora' | 'agenciador' | 'embarcador';
}

export function AvatarUpload({ 
  currentAvatar, 
  userId, 
  onAvatarUpdate,
  userType 
}: AvatarUploadProps) {
  const [preview, setPreview] = useState<string>(currentAvatar ? (getAvatarUrl(currentAvatar) || '') : '');
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [bucketExists, setBucketExists] = useState<boolean | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Verificar se o bucket existe ao montar o componente
  useEffect(() => {
    const checkBucket = async () => {
      try {
        const { getSupabaseClient } = await import('../utils/supabase/client');
        const supabase = getSupabaseClient();
        
        // Testar upload simples para verificar se bucket funciona
        // (mais confiável que listBuckets que pode falhar por permissões)
        const testFile = new Blob(['test'], { type: 'text/plain' });
        const testPath = `test-${Date.now()}.txt`;
        
        const { error } = await supabase
          .storage
          .from('profile-images')
          .upload(testPath, testFile, { upsert: true });
        
        if (error) {
          if (error.message.includes('Bucket not found')) {
            console.warn('⚠️ [AvatarUpload] Bucket não encontrado');
            setBucketExists(false);
          } else {
            // Outros erros (como permissão) significam que bucket existe
            console.log('✅ [AvatarUpload] Bucket existe (erro de permissão detectado)');
            setBucketExists(true);
          }
          
          // Limpar arquivo de teste se foi criado
          await supabase.storage.from('profile-images').remove([testPath]);
        } else {
          console.log('✅ [AvatarUpload] Bucket "profile-images" funcionando');
          setBucketExists(true);
          
          // Limpar arquivo de teste
          await supabase.storage.from('profile-images').remove([testPath]);
        }
      } catch (error: any) {
        console.log('⚠️ [AvatarUpload] Assumindo que bucket existe (erro ao testar):', error.message);
        // Assumir que bucket existe para não bloquear UI
        setBucketExists(true);
      }
    };

    checkBucket();
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem válida');
      return;
    }

    // Validar tamanho (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB');
      return;
    }

    // ✅ CORRETO: Preview com URL.createObjectURL (não base64!)
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setSelectedFile(file);
  }, []);

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Selecione uma imagem primeiro');
      return;
    }

    setIsUploading(true);

    try {
      console.log('📤 [AvatarUpload] Iniciando upload...');

      // ✅ USAR HELPER CENTRALIZADO
      const result = await uploadAvatar(userId, selectedFile);

      if (!result.success || !result.path) {
        throw new Error(result.error || 'Erro ao fazer upload');
      }

      const avatarPath = result.path;
      console.log('✅ [AvatarUpload] Upload concluído. PATH:', avatarPath);

      // ✅ SALVAR PATH NO BANCO (NÃO URL!)
      const supabase = (await import('../utils/supabase/client')).getSupabaseClient();
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          avatar_url: avatarPath, // ← PATH!
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) {
        console.error('❌ [AvatarUpload] Erro ao atualizar profiles:', updateError);
        throw updateError;
      }

      console.log('✅ [AvatarUpload] Profiles atualizado com PATH');

      // ✅ Sincronizar com drivers/companies (salvar PATH também!)
      if (userType === 'caminhoneiro') {
        await supabase
          .from('drivers')
          .update({ 
            profile_image: avatarPath, // ← PATH!
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);
      } else {
        await supabase
          .from('companies')
          .update({ 
            logo_url: avatarPath, // ← PATH!
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);
      }

      console.log('✅ [AvatarUpload] Avatar atualizado com sucesso!');

      toast.success('Foto de perfil atualizada com sucesso!');
      
      // ✅ Callback retorna PATH (componente pai gera URL se necessário)
      onAvatarUpdate(avatarPath);
      setSelectedFile(null);
      
      // ✅ Atualizar preview com URL gerada
      const newUrl = getAvatarUrl(avatarPath);
      if (newUrl) setPreview(newUrl);
    } catch (error: any) {
      console.error('❌ [AvatarUpload] Erro:', error);
      
      if (error?.message?.includes('Bucket not found')) {
        toast.error('Não foi possível enviar a foto. Tente novamente ou contate o suporte.');
      } else if (error?.message?.includes('row-level security') || error?.message?.includes('policy')) {
        toast.error('Sem permissão para enviar a foto. Tente novamente ou contate o suporte.');
      } else {
        toast.error('Erro ao fazer upload da imagem. Tente novamente.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    // ✅ Revogar URL do objeto se existir
    if (preview && preview.startsWith('blob:')) {
      URL.revokeObjectURL(preview);
    }
    
    setPreview(currentAvatar ? (getAvatarUrl(currentAvatar) || '') : '');
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Preview do Avatar */}
      <div className="relative">
        <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200 border-4 border-white shadow-lg">
          {preview ? (
            <img 
              src={preview} 
              alt="Avatar" 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/10">
              <Camera className="w-12 h-12 text-primary/40" />
            </div>
          )}
        </div>

        {/* Botão de câmera flutuante */}
        <button
          onClick={triggerFileInput}
          disabled={isUploading}
          className="absolute bottom-0 right-0 w-10 h-10 bg-primary hover:bg-primary/90 text-white rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Camera className="w-5 h-5" />
        </button>
      </div>

      {/* Input escondido */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Botões de ação */}
      {selectedFile && (
        <div className="flex gap-2 items-center">
          <Button
            size="sm"
            onClick={handleUpload}
            disabled={isUploading}
            className="bg-primary hover:bg-primary/90"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Salvar Foto
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRemove}
            disabled={isUploading}
          >
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
        </div>
      )}

      {/* Aviso se bucket não existe */}
      {bucketExists === false && (
        <div className="w-full max-w-sm p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex gap-2 items-start">
            <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-orange-800">
              <p className="font-medium mb-1">⚠️ Storage não configurado</p>
              <p className="text-orange-700">
                Execute <code className="bg-orange-100 px-1 rounded">CRIAR_BUCKET_AGORA.sql</code> no Supabase SQL Editor para habilitar upload de avatares.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Informações */}
      <div className="text-center">
        <p className="text-xs text-gray-600">
          Clique no ícone da câmera para alterar
        </p>
        <p className="text-xs text-gray-500 mt-1">
          JPG, PNG ou GIF • Máximo 5MB
        </p>
      </div>
    </div>
  );
}