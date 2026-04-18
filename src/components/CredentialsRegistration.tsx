import React, { useState } from 'react';
import { ArrowLeft, Mail, Lock, Eye, EyeOff, Check, X, Loader2, User, Phone, FileText, Building, CheckCircle, XCircle, AlertCircle, ArrowRight, Camera } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader } from './ui/card';
import { Checkbox } from './ui/checkbox';
import { supabase } from '@/utils/supabase/client';
import { withOfflineFallback, isInOfflineMode } from '@/utils/offline-mode';
import { motion } from 'motion/react';
import { toast } from 'sonner@2.0.3';
import logoMaisFrete from '../assets/logo-moovefretes.png';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { TermsOfUseModal } from './TermsOfUseModal';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

interface CredentialsRegistrationProps {
  onComplete: (credentials: { email: string; password: string; profilePhoto: File | null }) => void;
  onBack: () => void;
  userType: 'caminhoneiro' | 'transportadora' | 'agenciador';
}

export function CredentialsRegistration({ onComplete, onBack, userType }: CredentialsRegistrationProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [orphanedUser, setOrphanedUser] = useState<{ userId: string; email: string } | null>(null);
  const [cleaningOrphan, setCleaningOrphan] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showIncompleteDialog, setShowIncompleteDialog] = useState(false);
  const [incompleteEmail, setIncompleteEmail] = useState('');
  const [touched, setTouched] = useState({
    email: false,
    password: false,
    confirmPassword: false
  });

  // Verificar se há cadastro incompleto ao carregar
  React.useEffect(() => {
    const checkIncompleteRegistration = async () => {
      const storedEmail = localStorage.getItem('incomplete_registration_email');
      if (storedEmail) {
        try {
          // Verificar diretamente no banco se o email existe
          const { data: profileData } = await supabase
            .from('profiles')
            .select('id, email')
            .eq('email', storedEmail.toLowerCase())
            .maybeSingle();

          if (!profileData) {
            // Email não existe no banco, mostrar modal
            setIncompleteEmail(storedEmail);
            setShowIncompleteDialog(true);
          } else {
            // Email já existe, limpar localStorage
            localStorage.removeItem('incomplete_registration_email');
          }
        } catch (error) {
          console.error('Erro ao verificar cadastro incompleto:', error);
        }
      }
    };

    checkIncompleteRegistration();
  }, []);

  const handleIncompleteDialogConfirm = () => {
    setEmail(incompleteEmail);
    setEmailAvailable(true);
    setShowIncompleteDialog(false);
    toast.info('Cadastro recuperado! Continue de onde parou.');
  };

  const handleIncompleteDialogCancel = () => {
    localStorage.removeItem('incomplete_registration_email');
    setShowIncompleteDialog(false);
  };

  const getUserTypeLabel = () => {
    const labels = {
      caminhoneiro: 'Caminhoneiro',
      transportadora: 'Transportadora/Embarcador',
      agenciador: 'Agenciador'
    };
    return labels[userType];
  };

  // Validação de email
  const isEmailValid = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Verificar disponibilidade do email no Supabase
  const checkEmailAvailability = async (emailToCheck: string) => {
    if (!isEmailValid()) {
      setEmailAvailable(null);
      return;
    }

    setCheckingEmail(true);
    try {
      
      // Timeout para evitar espera infinita
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 10000); // 10 segundos
      });
      
      // Consultar diretamente a tabela profiles para ver se o email já existe
      const queryPromise = supabase
        .from('profiles')
        .select('id, email, user_type, verification_status')
        .eq('email', emailToCheck.toLowerCase())
        .maybeSingle();
      
      const { data: profileData, error: profileError } = await Promise.race([
        queryPromise,
        timeoutPromise
      ]) as any;
      
      if (profileError) {
        // PGRST116 = No rows found (email disponível)
        if (profileError.code === 'PGRST116') {
          setEmailAvailable(true);
          setOrphanedUser(null);
          return;
        }
        
        console.error('❌ Erro ao consultar profiles:', {
          message: profileError.message,
          details: profileError.details,
          hint: profileError.hint,
          code: profileError.code
        });
        
        // Se for erro de conexão, permitir continuar
        if (profileError.message?.includes('Failed to fetch') || 
            profileError.message?.includes('fetch')) {
          // [REVISAR] console.warn('⚠️ Erro de conexão - permitindo continuar (modo offline)');
          setEmailAvailable(true); // Assume disponível em modo offline
          toast.warning('Não foi possível verificar o email online. Verifique sua conexão.');
          return;
        }
        
        throw new Error('Erro ao verificar email no banco de dados');
      }
      
      if (profileData) {
        // Email existe e tem perfil ativo
        setEmailAvailable(false);
        setOrphanedUser(null);
        toast.error('Este email já está cadastrado. Faça login ou use outro email.');
      } else {
        // Email disponível
        setEmailAvailable(true);
        setOrphanedUser(null);
      }
    } catch (error) {
      console.error('❌ Erro ao verificar email:', error);
      
      // Se for timeout ou erro de rede, permitir continuar
      if (error instanceof Error && 
          (error.message === 'Timeout' || 
           error.message.includes('fetch') ||
           error.message.includes('network'))) {
        // [REVISAR] console.warn('⚠️ Timeout ou erro de rede - permitindo continuar (modo offline)');
        setEmailAvailable(true); // Assume disponível em modo offline
        toast.warning('Não foi possível verificar o email. Verifique sua conexão.');
      } else {
        toast.error('Erro ao verificar disponibilidade do email. Tente novamente.');
        setEmailAvailable(null);
      }
    } finally {
      setCheckingEmail(false);
    }
  };

  // Validação de senha forte
  const getPasswordStrength = () => {
    if (password.length === 0) return null;
    
    const hasMinLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return {
      hasMinLength,
      hasUpperCase,
      hasLowerCase,
      hasNumber,
      hasSpecialChar,
      isStrong: hasMinLength && hasUpperCase && hasLowerCase && hasNumber
    };
  };

  const passwordStrength = getPasswordStrength();

  // Validação de confirmação de senha
  const isPasswordMatch = () => {
    return password === confirmPassword && confirmPassword.length > 0;
  };

  // Limpar usuário órfão (não é mais necessário pois verificamos direto no banco)
  const cleanOrphanedUser = async () => {
    if (!orphanedUser) return;
    
    // Como não podemos deletar do auth.users sem service_role,
    // apenas marcamos como disponível
    setEmailAvailable(true);
    setOrphanedUser(null);
    toast.success('Email disponível para uso');
  };

  // Validação do formulário
  const isFormValid = () => {
    return (
      isEmailValid() &&
      emailAvailable === true &&
      passwordStrength?.isStrong &&
      isPasswordMatch() &&
      acceptedTerms
    );
  };

  // Salvar credenciais localmente
  const saveCredentialsLocally = () => {
    if (!isFormValid()) return;
    
    try {
      // Salvar email no localStorage para recuperação posterior
      localStorage.setItem('incomplete_registration_email', email);
    } catch (error) {
      console.error('Erro ao salvar localmente:', error);
    }
  };

  // Salvar credenciais quando o formulário for preenchido corretamente
  React.useEffect(() => {
    if (isFormValid()) {
      saveCredentialsLocally();
    }
  }, [email, password, confirmPassword, emailAvailable, acceptedTerms]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid()) {
      toast.error('Preencha todos os campos corretamente');
      setTouched({
        email: true,
        password: true,
        confirmPassword: true
      });
      return;
    }

    setLoading(true);

    try {

      // ✅ CRIAR AUTH USER IMEDIATAMENTE!
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password,
        options: {
          data: {
            user_type: userType,
            email: email.trim().toLowerCase(),
          }
        }
      });

      if (authError) {
        console.error('❌ Erro ao criar Auth User:', authError);
        throw authError;
      }

      if (!authData.user) {
        throw new Error('Usuário não foi criado no Supabase Auth');
      }

      
      // ⏱️ Aguardar sessão estar ativa
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
      } else {
      }

      // 📸 Upload de avatar (se houver)
      let avatarPath: string | undefined = undefined;
      
      if (profilePhoto) {
        try {
          const { uploadAvatar } = await import('../utils/storage-helper');
          const result = await uploadAvatar(authData.user.id, profilePhoto);
          
          if (result.success && result.path) {
            avatarPath = result.path;
            toast.success('Foto de perfil enviada com sucesso!');
          } else {
            console.error('❌ Erro ao fazer upload do avatar:', result.error);
            toast.warning('Erro ao fazer upload da foto - continue o cadastro');
          }
        } catch (error) {
          console.error('❌ Exceção ao fazer upload do avatar:', error);
          toast.warning('Erro ao processar foto - continue o cadastro');
        }
      }


      // Salvar email localmente para recuperação
      localStorage.setItem('incomplete_registration_email', email);
      localStorage.setItem('registration_user_id', authData.user.id);
      if (avatarPath) {
        localStorage.setItem('registration_avatar_path', avatarPath);
      }
      
      toast.success('Conta criada! Continue preenchendo seus dados...');
      
      setLoading(false);
      
      // Passar dados para próxima etapa
      onComplete({ 
        email, 
        password, 
        profilePhoto,
        userId: authData.user.id,  // ✅ Passar userId
        avatarPath: avatarPath      // ✅ Passar avatarPath
      } as any);
      
    } catch (error) {
      console.error('❌ Erro ao criar Auth User:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao criar conta';
      
      // Mensagens de erro específicas
      if (errorMessage.includes('already registered')) {
        toast.error('Este email já está cadastrado. Faça login ou use outro email.');
      } else if (errorMessage.includes('Database error')) {
        toast.error('Erro no banco de dados. Verifique se as tabelas foram criadas no Supabase.');
      } else {
        toast.error('Erro ao criar conta: ' + errorMessage);
      }
      
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4 overflow-y-auto">
      <div className="max-w-md w-full mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Logo */}
          <div className="flex items-center justify-center mb-6">
            <img 
              src={logoMaisFrete} 
              alt="MaisFrete" 
              className="h-16 w-auto"
            />
          </div>

          <Card className="bg-white shadow-card">
            <CardHeader className="border-b border-light">
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onBack}
                  className="p-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div className="text-center flex-1">
                  <h1 className="text-xl text-foreground">Criar Conta</h1>
                  <p className="text-sm text-muted-foreground mt-1">{getUserTypeLabel()}</p>
                </div>
                <div className="w-10"></div>
              </div>
            </CardHeader>

            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-1">
                    Email
                    <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setEmailAvailable(null);
                      }}
                      onBlur={() => {
                        setTouched({ ...touched, email: true });
                        if (isEmailValid()) {
                          checkEmailAvailability(email);
                        }
                      }}
                      className={`pl-10 pr-10 ${
                        touched.email && !isEmailValid() 
                          ? 'border-red-500' 
                          : touched.email && emailAvailable === true
                          ? 'border-green-500'
                          : touched.email && emailAvailable === false
                          ? 'border-red-500'
                          : ''
                      }`}
                      placeholder="seu@email.com"
                      required
                      disabled={checkingEmail}
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      {checkingEmail ? (
                        <Loader2 className="w-4 h-4 text-primary animate-spin" />
                      ) : touched.email && isEmailValid() && emailAvailable === true ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : touched.email && (!isEmailValid() || emailAvailable === false) ? (
                        <XCircle className="w-4 h-4 text-red-500" />
                      ) : null}
                    </div>
                  </div>
                  {touched.email && !isEmailValid() && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Email inválido
                    </p>
                  )}
                  {touched.email && isEmailValid() && emailAvailable === false && !orphanedUser && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Este email já está cadastrado
                    </p>
                  )}
                  {touched.email && isEmailValid() && emailAvailable === false && orphanedUser && (
                    <div className="space-y-2">
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <p className="text-xs text-yellow-800 flex items-center gap-1 mb-2">
                          <AlertCircle className="w-3 h-3" />
                          Email encontrado em cadastro incompleto anterior
                        </p>
                        <Button
                          type="button"
                          onClick={cleanOrphanedUser}
                          disabled={cleaningOrphan}
                          size="sm"
                          className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
                        >
                          {cleaningOrphan ? (
                            <>
                              <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                              Limpando...
                            </>
                          ) : (
                            <>
                              Limpar e Continuar
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                  {touched.email && isEmailValid() && emailAvailable === true && (
                    <p className="text-xs text-green-500 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Email disponível
                    </p>
                  )}
                </div>

                {/* Foto de Perfil */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    Foto de Perfil
                    <span className="text-gray-400 text-xs">(opcional)</span>
                  </Label>
                  <div className="relative">
                    <input
                      type="file"
                      id="profile-photo"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setProfilePhoto(file);
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setProfilePhotoPreview(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                    />
                    <label
                      htmlFor="profile-photo"
                      className="flex items-center justify-center w-full p-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#253663] transition-colors bg-gray-50 hover:bg-gray-100"
                    >
                      {profilePhotoPreview ? (
                        <div className="flex items-center gap-3">
                          <img
                            src={profilePhotoPreview}
                            alt="Preview"
                            className="w-16 h-16 rounded-full object-cover"
                          />
                          <div className="text-left">
                            <p className="text-sm font-medium text-gray-700">
                              Foto selecionada
                            </p>
                            <p className="text-xs text-gray-500">
                              Clique para alterar
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center">
                          <Camera className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                          <p className="text-sm font-medium text-gray-700">
                            Adicionar foto de perfil
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Clique para selecionar uma imagem
                          </p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                {/* Senha */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="flex items-center gap-1">
                    Senha
                    <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onBlur={() => setTouched({ ...touched, password: true })}
                      className={`pl-10 pr-10 ${
                        touched.password && !passwordStrength?.isStrong
                          ? 'border-red-500'
                          : touched.password && passwordStrength?.isStrong
                          ? 'border-green-500'
                          : ''
                      }`}
                      placeholder="Mínimo 8 caracteres"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                  
                  {/* Indicadores de força da senha */}
                  {password.length > 0 && (
                    <div className="space-y-2 bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs font-medium text-muted-foreground">
                        Requisitos da senha:
                      </p>
                      <div className="space-y-1">
                        <div className={`flex items-center gap-2 text-xs ${
                          passwordStrength?.hasMinLength ? 'text-green-600' : 'text-gray-400'
                        }`}>
                          {passwordStrength?.hasMinLength ? (
                            <CheckCircle className="w-3 h-3" />
                          ) : (
                            <XCircle className="w-3 h-3" />
                          )}
                          Mínimo 8 caracteres
                        </div>
                        <div className={`flex items-center gap-2 text-xs ${
                          passwordStrength?.hasUpperCase ? 'text-green-600' : 'text-gray-400'
                        }`}>
                          {passwordStrength?.hasUpperCase ? (
                            <CheckCircle className="w-3 h-3" />
                          ) : (
                            <XCircle className="w-3 h-3" />
                          )}
                          Letra maiúscula
                        </div>
                        <div className={`flex items-center gap-2 text-xs ${
                          passwordStrength?.hasLowerCase ? 'text-green-600' : 'text-gray-400'
                        }`}>
                          {passwordStrength?.hasLowerCase ? (
                            <CheckCircle className="w-3 h-3" />
                          ) : (
                            <XCircle className="w-3 h-3" />
                          )}
                          Letra minúscula
                        </div>
                        <div className={`flex items-center gap-2 text-xs ${
                          passwordStrength?.hasNumber ? 'text-green-600' : 'text-gray-400'
                        }`}>
                          {passwordStrength?.hasNumber ? (
                            <CheckCircle className="w-3 h-3" />
                          ) : (
                            <XCircle className="w-3 h-3" />
                          )}
                          Número
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirmar Senha */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="flex items-center gap-1">
                    Confirmar Senha
                    <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onBlur={() => setTouched({ ...touched, confirmPassword: true })}
                      className={`pl-10 pr-10 ${
                        touched.confirmPassword && !isPasswordMatch()
                          ? 'border-red-500'
                          : touched.confirmPassword && isPasswordMatch()
                          ? 'border-green-500'
                          : ''
                      }`}
                      placeholder="Digite a senha novamente"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                  {touched.confirmPassword && !isPasswordMatch() && confirmPassword.length > 0 && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      As senhas não coincidem
                    </p>
                  )}
                  {touched.confirmPassword && isPasswordMatch() && (
                    <p className="text-xs text-green-500 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Senhas coincidem
                    </p>
                  )}
                </div>

                {/* Termos de Uso */}
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="terms"
                    checked={acceptedTerms}
                    onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                  />
                  <Label htmlFor="terms" className="text-sm text-muted-foreground cursor-pointer">
                    Eu li e aceito os{' '}
                    <button
                      type="button"
                      className="text-[#253663] hover:underline font-medium"
                      onClick={(e) => {
                        e.preventDefault();
                        setShowTermsModal(true);
                      }}
                    >
                      Termos e Condições de Uso
                    </button>
                  </Label>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={!isFormValid() || loading}
                  className="w-full bg-primary hover:bg-primary/90 text-white"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Criando conta...
                    </>
                  ) : (
                    <>
                      Continuar
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center mt-6">
            <p className="text-xs text-muted-foreground">
              Ao criar uma conta, você concorda com nossos{' '}
              <button className="text-primary hover:underline">
                Termos de Uso
              </button>{' '}
              e{' '}
              <button className="text-primary hover:underline">
                Política de Privacidade
              </button>
            </p>
          </div>
        </motion.div>
      </div>

      {/* Modal de Termos de Uso */}
      <TermsOfUseModal
        open={showTermsModal}
        onOpenChange={setShowTermsModal}
      />

      {/* Dialog de Cadastro Incompleto */}
      <Dialog open={showIncompleteDialog} onOpenChange={setShowIncompleteDialog}>
        <DialogContent className="sm:max-w-[500px] bg-[#2d2d3f] border-none text-white">
          <DialogHeader>
            <DialogTitle className="text-white text-lg">
              Cadastro Incompleto
            </DialogTitle>
            <DialogDescription className="text-gray-300 mt-3">
              Encontramos um cadastro incompleto para {incompleteEmail}. Deseja continuar de onde parou?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 gap-3 sm:gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleIncompleteDialogConfirm}
              className="bg-transparent border-2 border-purple-300 text-purple-300 hover:bg-purple-300/10"
            >
              OK
            </Button>
            <Button
              type="button"
              onClick={handleIncompleteDialogCancel}
              className="bg-purple-600 text-white hover:bg-purple-700"
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}