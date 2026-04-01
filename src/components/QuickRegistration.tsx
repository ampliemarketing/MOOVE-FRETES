import React, { useState } from 'react';
import { ArrowLeft, Mail, Lock, Eye, EyeOff, CheckCircle, XCircle, AlertCircle, Loader2, Truck, Building, Navigation } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader } from './ui/card';
import { Checkbox } from './ui/checkbox';
import { supabase } from '@/utils/supabase/client';
import { motion } from 'motion/react';
import { toast } from 'sonner@2.0.3';
import logoMaisFrete from '../assets/logo-moovefretes.png';
import { TermsOfUseModal } from './TermsOfUseModal';

type UserType = 'caminhoneiro' | 'transportadora' | 'agenciador';

interface QuickRegistrationProps {
  onComplete: (userId: string, userType: UserType) => void;
  onBack: () => void;
  preSelectedType?: UserType | null;
}

export function QuickRegistration({ onComplete, onBack, preSelectedType = null }: QuickRegistrationProps) {
  const [step, setStep] = useState<'type' | 'credentials'>(preSelectedType ? 'credentials' : 'type');
  const [selectedType, setSelectedType] = useState<UserType | null>(preSelectedType);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [touched, setTouched] = useState({
    email: false,
    password: false,
    confirmPassword: false
  });

  const userTypeConfigs = {
    caminhoneiro: {
      icon: Truck,
      label: 'Caminhoneiro',
      description: 'Motorista autônomo ou profissional',
      color: 'bg-blue-600',
      hoverColor: 'hover:bg-blue-700'
    },
    transportadora: {
      icon: Building,
      label: 'Transportadora',
      description: 'Empresa de transporte ou embarcador',
      color: 'bg-purple-600',
      hoverColor: 'hover:bg-purple-700'
    },
    agenciador: {
      icon: Navigation,
      label: 'Agenciador',
      description: 'Intermediador de cargas e fretes',
      color: 'bg-green-600',
      hoverColor: 'hover:bg-green-700'
    }
  };

  // Validação de email
  const isEmailValid = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Verificar disponibilidade do email
  const checkEmailAvailability = async (emailToCheck: string) => {
    if (!isEmailValid()) {
      setEmailAvailable(null);
      return;
    }

    setCheckingEmail(true);
    try {
      // Verificar no Supabase Auth
      const { data: { user }, error } = await supabase.auth.getUser();
      
      // Tentar fazer signIn para verificar se email existe
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: emailToCheck.toLowerCase(),
        password: 'test_password_for_check_only' // Senha fake só para verificar
      });

      // Se deu erro de credenciais inválidas, email existe
      if (signInError && signInError.message.includes('Invalid login credentials')) {
        setEmailAvailable(false);
        toast.error('Este email já está cadastrado. Faça login ou use outro email.');
      } else if (signInError && signInError.message.includes('Email not confirmed')) {
        setEmailAvailable(false);
        toast.error('Este email já está cadastrado mas não foi confirmado.');
      } else {
        // Email não existe ou outro erro
        setEmailAvailable(true);
      }
    } catch (error) {
      console.error('❌ Erro ao verificar email:', error);
      setEmailAvailable(true); // Assumir disponível em caso de erro
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

    return {
      hasMinLength,
      hasUpperCase,
      hasLowerCase,
      hasNumber,
      isStrong: hasMinLength && hasUpperCase && hasLowerCase && hasNumber
    };
  };

  const passwordStrength = getPasswordStrength();

  // Validação de confirmação de senha
  const isPasswordMatch = () => {
    return password === confirmPassword && confirmPassword.length > 0;
  };

  // Validação do formulário
  const isFormValid = () => {
    return (
      selectedType &&
      isEmailValid() &&
      passwordStrength?.isStrong &&
      isPasswordMatch() &&
      acceptedTerms
    );
  };

  const handleTypeSelect = (type: UserType) => {
    setSelectedType(type);
    setStep('credentials');
  };

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
      console.log('');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('🚀 QuickRegistration - CRIANDO AUTHENTICATION USER');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('📧 Email:', email);
      console.log('🎯 Tipo:', selectedType);
      console.log('');

      // ✅ CRIAR APENAS AUTH USER (SEM PROFILE!)
      console.log('🔐 Criando Authentication User no Supabase...');
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password,
        options: {
          data: {
            user_type: selectedType,
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

      console.log('✅ Authentication User criado:', authData.user.id);
      console.log('');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('✅ ETAPA 1 COMPLETA - Auth User criado!');
      console.log('📝 Próximo: Completar perfil (Profile + Driver/Company)');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('');

      toast.success('Conta criada! Complete seu perfil agora.');
      
      setLoading(false);
      onComplete(authData.user.id, selectedType!);
      
    } catch (error) {
      console.error('❌ Erro ao criar conta:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao criar conta';
      
      if (errorMessage.includes('already registered') || errorMessage.includes('User already registered')) {
        toast.error('Este email já está cadastrado. Faça login ou use outro email.');
      } else if (errorMessage.includes('Database error')) {
        toast.error('Erro no banco de dados. Verifique se as tabelas foram criadas no Supabase.');
      } else {
        toast.error('Erro ao criar conta: ' + errorMessage);
      }
      
      setLoading(false);
    }
  };

  // Renderizar seleção de tipo de usuário
  if (step === 'type') {
    return (
      <div className="fixed inset-0 bg-background overflow-y-auto">
        <div className="min-h-screen py-8 px-4">
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
                    <p className="text-sm text-muted-foreground mt-1">Escolha seu tipo de perfil</p>
                  </div>
                  <div className="w-10"></div>
                </div>
              </CardHeader>

              <CardContent className="p-6">
                <div className="space-y-3">
                  {(Object.keys(userTypeConfigs) as UserType[]).map((type) => {
                    const config = userTypeConfigs[type];
                    const Icon = config.icon;
                    
                    return (
                      <motion.button
                        key={type}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleTypeSelect(type)}
                        className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-[#253663] transition-all bg-white hover:shadow-md text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-full ${config.color} flex items-center justify-center`}>
                            <Icon className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium text-foreground">{config.label}</h3>
                            <p className="text-sm text-muted-foreground">{config.description}</p>
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
          </div>
        </div>
      </div>
    );
  }

  // Renderizar formulário de credenciais
  return (
    <div className="fixed inset-0 bg-background overflow-y-auto">
      <div className="min-h-screen py-8 px-4">
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
                  onClick={() => preSelectedType ? onBack() : setStep('type')}
                  className="p-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div className="text-center flex-1">
                  <h1 className="text-xl text-foreground">Criar Conta</h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedType && userTypeConfigs[selectedType].label}
                  </p>
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
                      disabled={checkingEmail || loading}
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
                      disabled={loading}
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
                      disabled={loading}
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
                  {touched.confirmPassword && !isPasswordMatch() && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      As senhas não coincidem
                    </p>
                  )}
                  {touched.confirmPassword && isPasswordMatch() && (
                    <p className="text-xs text-green-500 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      As senhas coincidem
                    </p>
                  )}
                </div>

                {/* Termos e Condições */}
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="terms"
                    checked={acceptedTerms}
                    onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                    disabled={loading}
                  />
                  <label htmlFor="terms" className="text-sm text-muted-foreground cursor-pointer">
                    Aceito os{' '}
                    <button
                      type="button"
                      onClick={() => setShowTermsModal(true)}
                      className="text-[#253663] hover:underline font-medium text-[12px] font-bold"
                    >
                      Termos de Uso
                    </button>
                    {' '}e concordo com o processamento dos meus dados
                  </label>
                </div>

                {/* Botão de criar conta */}
                <Button
                  type="submit"
                  className="w-full bg-[#253663] hover:bg-[#1a2847] text-white"
                  disabled={loading || !isFormValid()}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Criando conta...
                    </>
                  ) : (
                    'Criar Conta e Continuar'
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  Após criar sua conta, você completará seu perfil com mais informações
                </p>
              </form>
            </CardContent>
          </Card>
        </motion.div>
        </div>
      </div>

      {/* Modal de Termos */}
      <TermsOfUseModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
      />
    </div>
  );
}
