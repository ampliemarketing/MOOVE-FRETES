import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, CardContent, CardHeader } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Progress } from './ui/progress';
import { Checkbox } from './ui/checkbox';
import { 
  CPFInput,
  PhoneInput,
  CEPInput,
  CNPJInput
} from './ui/enhanced-inputs';
import { 
  ArrowLeft, 
  ArrowRight,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User, 
  MapPin, 
  Truck,
  Building,
  Upload,
  CheckCircle,
  Camera,
  FileText,
  Loader2,
  XCircle,
  AlertCircle,
  Phone
} from 'lucide-react';
import { supabase } from '@/utils/supabase/client';
import { toast } from 'sonner@2.0.3';
import logoMaisFrete from '../assets/logo-moovefretes.png';
import { VehicleTypeSelector } from './VehicleTypeSelector';
import { brazilianStates } from '../utils/brazil-locations';
import { TermsOfUseModal } from './TermsOfUseModal';

interface UnifiedRegistrationProps {
  userType: 'caminhoneiro' | 'transportadora' | 'agenciador';
  onComplete: (userData: any) => void;
  onBack: () => void;
}

type Step = 'credentials' | 'personal' | 'address' | 'specific' | 'documents';

export function UnifiedRegistration({ userType, onComplete, onBack }: UnifiedRegistrationProps) {
  const [currentStep, setCurrentStep] = useState<Step>('credentials');
  const [loading, setLoading] = useState(false);

  // Credenciais
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [emailCheckTimeout, setEmailCheckTimeout] = useState<NodeJS.Timeout | null>(null);
  const [touched, setTouched] = useState({
    email: false,
    password: false,
    confirmPassword: false
  });

  // Dados pessoais
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [birthDate, setBirthDate] = useState('');

  // Endereço
  const [cep, setCep] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');

  // Específico - Caminhoneiro
  const [cnh, setCnh] = useState('');
  const [cnhCategory, setCnhCategory] = useState('');
  const [cnhValidity, setCnhValidity] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleYear, setVehicleYear] = useState('');
  const [vehicleTypes, setVehicleTypes] = useState<string[]>([]);
  const [bodyTypes, setBodyTypes] = useState<string[]>([]);

  // Específico - Empresa
  const [cnpj, setCnpj] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [rntrc, setRntrc] = useState('');
  const [representativeName, setRepresentativeName] = useState('');
  const [representativeCpf, setRepresentativeCpf] = useState('');

  // Documentos
  const [cnhDoc, setCnhDoc] = useState<File | null>(null);
  const [vehicleDoc, setVehicleDoc] = useState<File | null>(null);
  const [cnpjDoc, setCnpjDoc] = useState<File | null>(null);
  const [contractDoc, setContractDoc] = useState<File | null>(null);

  const steps: { id: Step; label: string; icon: any }[] = (() => {
    if (userType === 'caminhoneiro') {
      return [
        { id: 'credentials', label: 'Dados Pessoais', icon: User },
        { id: 'address', label: 'Endereço', icon: MapPin },
        { id: 'specific', label: 'Empresa', icon: Building },
        { id: 'documents', label: 'Documentos', icon: FileText }
      ];
    } else {
      return [
        { id: 'credentials', label: 'Dados Pessoais', icon: User },
        { id: 'address', label: 'Endereço', icon: MapPin },
        { id: 'specific', label: 'Empresa', icon: Building },
        { id: 'documents', label: 'Documentos', icon: FileText }
      ];
    }
  })();

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  // Validação de senha (useMemo para recalcular quando password mudar)
  const passwordStrength = useMemo(() => {
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
  }, [password]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (emailCheckTimeout) {
        clearTimeout(emailCheckTimeout);
      }
    };
  }, [emailCheckTimeout]);

  // Fechar mensagem de requisitos automaticamente quando senha estiver forte
  useEffect(() => {
    if (passwordFocused && passwordStrength?.isStrong) {
      setPasswordFocused(false);
    }
  }, [passwordStrength?.isStrong, passwordFocused]);

  function getUserTypeLabel() {
    const labels = {
      caminhoneiro: 'Caminhoneiro',
      transportadora: 'Transportadora',
      agenciador: 'Agenciador'
    };
    return labels[userType];
  }

  // Validação de email
  function isEmailValid() {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Verificar disponibilidade do email
  async function checkEmailAvailability(emailToCheck: string) {
    if (!isEmailValid()) {
      setEmailAvailable(null);
      return;
    }

    setCheckingEmail(true);
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 10000);
      });
      
      const queryPromise = supabase
        .from('profiles')
        .select('id, email')
        .eq('email', emailToCheck.toLowerCase())
        .maybeSingle();
      
      const { data: profileData, error: profileError } = await Promise.race([
        queryPromise,
        timeoutPromise
      ]) as any;
      
      if (profileError) {
        if (profileError.code === 'PGRST116') {
          setEmailAvailable(true);
          return;
        }
        
        if (profileError.message?.includes('Failed to fetch') || 
            profileError.message?.includes('fetch')) {
          setEmailAvailable(true);
          toast.warning('Não foi possível verificar o email online. Verifique sua conexão.');
          return;
        }
        
        throw new Error('Erro ao verificar email no banco de dados');
      }
      
      if (profileData) {
        setEmailAvailable(false);
        toast.error('Este email já está cadastrado. Faça login ou use outro email.');
      } else {
        setEmailAvailable(true);
      }
    } catch (error) {
      if (error instanceof Error && 
          (error.message === 'Timeout' || 
           error.message.includes('fetch') ||
           error.message.includes('network'))) {
        setEmailAvailable(true);
        toast.warning('Não foi possível verificar o email. Verifique sua conexão.');
      } else {
        toast.error('Erro ao verificar disponibilidade do email. Tente novamente.');
        setEmailAvailable(null);
      }
    } finally {
      setCheckingEmail(false);
    }
  }

  function isPasswordMatch() {
    return password === confirmPassword && confirmPassword.length > 0;
  }

  // Callback para receber dados do CEP
  function handleAddressData(addressData: any) {
    if (addressData) {
      setStreet(addressData.logradouro || '');
      setNeighborhood(addressData.bairro || '');
      setCity(addressData.localidade || '');
      setState(addressData.uf || '');
      toast.success('Endereço encontrado!');
    }
  }

  // Validações por step
  function isCredentialsStepValid() {
    if (userType === 'caminhoneiro') {
      return (
        name.trim().length > 0 &&
        phone.replace(/\D/g, '').length >= 10 &&
        isEmailValid() &&
        emailAvailable === true &&
        passwordStrength?.isStrong &&
        isPasswordMatch() &&
        acceptedTerms
      );
    } else {
      return (
        name.trim().length > 0 &&
        phone.replace(/\D/g, '').length >= 10 &&
        isEmailValid() &&
        emailAvailable === true &&
        passwordStrength?.isStrong &&
        isPasswordMatch() &&
        acceptedTerms
      );
    }
  }

  function isAddressStepValid() {
    return cep.replace(/\D/g, '').length === 8 && 
           street.trim().length > 0 && 
           number.trim().length > 0 &&
           city.trim().length > 0 &&
           state.trim().length > 0;
  }

  function isSpecificStepValid() {
    if (userType === 'caminhoneiro') {
      return cpf.replace(/\D/g, '').length === 11 &&
             cnh.trim().length > 0 &&
             cnhCategory.trim().length > 0 &&
             vehiclePlate.trim().length > 0;
    } else {
      return cnpj.replace(/\D/g, '').length === 14 &&
             companyName.trim().length > 0 &&
             representativeName.trim().length > 0 &&
             representativeCpf.replace(/\D/g, '').length === 11;
    }
  };

  function canProceedToNextStep() {
    switch (currentStep) {
      case 'credentials':
        return isCredentialsStepValid();
      case 'address':
        return isAddressStepValid();
      case 'specific':
        return isSpecificStepValid();
      case 'documents':
        return true;
      default:
        return false;
    }
  }

  function handleNext() {
    if (!canProceedToNextStep()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const currentIndex = steps.findIndex(s => s.id === currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1].id);
    }
  }

  function handleBack() {
    const currentIndex = steps.findIndex(s => s.id === currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].id);
    }
  }

  async function handleSubmit() {
    setLoading(true);
    let authUserId: string | null = null;

    try {
      console.log('═══════════════════════════════════════════════════════════');
      console.log('🔐 UnifiedRegistration - CRIANDO AUTH USER');
      console.log('═══════════════════════════════════════════════════════════');

      // Verificação preventiva: checar se usuário já existe
      console.log('🔍 Verificando se usuário já existe...');
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle(); // Usar maybeSingle() para não gerar erro se não encontrar
      
      if (checkError) {
        console.error('❌ Erro ao verificar usuário existente:', checkError);
        // Continuar mesmo com erro na verificação
      }
      
      if (existingProfile) {
        console.log('⚠️ Usuário já existe com este email:', existingProfile.id);
        throw new Error('Este email já está cadastrado. Faça login ou use outro email.');
      }
      
      console.log('✅ Email disponível para cadastro');

      // Criar Auth User
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

      if (authError || !authData.user) {
        throw new Error(authError?.message || 'Erro ao criar usuário');
      }

      const userId = authData.user.id;
      authUserId = userId; // Guardar ID para possível rollback
      console.log('✅ Auth User criado:', userId);
      console.log('📧 Email:', email.trim().toLowerCase());

      // Aguardar sessão e sincronização do Supabase Auth
      console.log('⏳ Aguardando sincronização do Auth...');
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Atualizar dados no Authentication Users (display_name e phone)
      console.log('📝 Atualizando dados no Authentication Users...');
      const displayName = userType === 'caminhoneiro' ? name.trim() : companyName.trim();
      const phoneFormatted = phone.replace(/\D/g, '');
      
      console.log('📛 Display Name:', displayName);
      console.log('📱 Phone:', phoneFormatted);
      
      const { error: updateAuthError } = await supabase.auth.updateUser({
        data: {
          display_name: displayName,
          phone: phoneFormatted,
          user_type: userType
        }
      });

      if (updateAuthError) {
        console.warn('⚠️ Aviso ao atualizar dados do Auth User:', updateAuthError);
        // Não bloquear o cadastro se falhar, apenas logar o aviso
      } else {
        console.log('✅ Dados do Auth User atualizados com sucesso');
      }

      // Upload de avatar
      let avatarPath: string | undefined = undefined;
      if (profilePhoto) {
        try {
          const { uploadAvatar } = await import('../utils/storage-helper');
          const result = await uploadAvatar(userId, profilePhoto);
          if (result.success && result.path) {
            avatarPath = result.path;
            console.log('✅ Avatar uploadado:', avatarPath);
          }
        } catch (error) {
          console.error('❌ Erro ao fazer upload do avatar:', error);
        }
      }

      // Upload de documentos
      const documentPaths: Record<string, string> = {};
      const docsToUpload = userType === 'caminhoneiro' 
        ? [
            { file: cnhDoc, key: 'cnh', name: 'CNH' },
            { file: vehicleDoc, key: 'vehicleDocument', name: 'CRLV' }
          ]
        : [
            { file: cnpjDoc, key: 'cnpjDocument', name: 'CNPJ' },
            { file: contractDoc, key: 'contractSocial', name: 'Contrato Social' }
          ];

      for (const doc of docsToUpload) {
        if (doc.file) {
          try {
            const { uploadDocument } = await import('../utils/storage-helper');
            const result = await uploadDocument(userId, doc.file, doc.key);
            if (result.success && result.path) {
              documentPaths[doc.key] = result.path;
              console.log(`✅ ${doc.name} uploadado:`, result.path);
            }
          } catch (error) {
            console.error(`❌ Erro ao fazer upload de ${doc.name}:`, error);
          }
        }
      }

      // Aguardar antes de criar profile
      console.log('⏳ Aguardando antes de criar profile...');
      await new Promise(resolve => setTimeout(resolve, 500));

      // Criar Profile
      console.log('📝 Criando profile...');
      const profileData = {
        id: userId,
        email: email.trim().toLowerCase(),
        user_type: userType,
        name: (userType === 'caminhoneiro' ? name.trim() : companyName.trim()) || null,
        phone: phone.replace(/\D/g, '') || null,
        cpf: userType === 'caminhoneiro' ? (cpf.replace(/\D/g, '') || null) : null,
        cnpj: userType !== 'caminhoneiro' ? (cnpj.replace(/\D/g, '') || null) : null,
        city: city.trim() || null,
        state: state.trim() || null,
        avatar_url: avatarPath || null,
        verification_status: 'verified',
        is_active: true,
        email_verified: false,
        rating: 0,
        total_freights: 0,
        completed_freights: 0,
        cancelled_freights: 0,
        total_ratings: 0,
        total_distance_km: 0,
        total_earnings: 0,
        is_online: false,
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('📊 Dados do Profile:', {
        id: profileData.id,
        email: profileData.email,
        user_type: profileData.user_type,
        name: profileData.name,
        phone: profileData.phone,
        city: profileData.city,
        state: profileData.state
      });

      // Usar UPSERT (insert or update) porque o Supabase tem um trigger que
      // cria automaticamente um registro básico na tabela profiles ao criar auth.user
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(profileData, {
          onConflict: 'id', // Se já existir um profile com este ID, atualiza
          ignoreDuplicates: false // Não ignorar, queremos atualizar
        });

      if (profileError) {
        console.error('❌ Erro ao salvar profile:', profileError);
        throw new Error('Erro ao salvar perfil: ' + profileError.message);
      }

      console.log('✅ Profile salvo com sucesso (upsert)');

      // Aguardar antes de criar registro específico
      console.log('⏳ Aguardando antes de criar registro específico...');
      await new Promise(resolve => setTimeout(resolve, 500));

      // Criar registro específico
      if (userType === 'caminhoneiro') {
        console.log('📝 Salvando registro de motorista...');
        
        const driverData = {
          user_id: userId,
          name: name.trim() || null,
          cpf: cpf.replace(/\D/g, '') || null,
          birth_date: birthDate || null,
          phone: phone.replace(/\D/g, '') || null,
          cnh: cnh.trim() || null,
          cnh_category: cnhCategory.trim() || 'B', // ✅ NOT NULL no banco - default 'B'
          cnh_expiry: cnhValidity || null,
          address: {
            cep: cep.replace(/\D/g, '') || '',
            street: street.trim() || '',
            number: number.trim() || '',
            complement: complement.trim() || '',
            neighborhood: neighborhood.trim() || '',
            city: city.trim() || '',
            state: state.trim() || ''
          },
          vehicle_plate: vehiclePlate.trim() || null,
          vehicle_model: vehicleModel.trim() || null,
          vehicle_year: vehicleYear.trim() || null,
          vehicle_types: vehicleTypes.length > 0 ? vehicleTypes : null,
          body_types: bodyTypes.length > 0 ? bodyTypes : null,
          document_paths: Object.keys(documentPaths).length > 0 ? documentPaths : null,
          available: true,
          rating: 0,
          completed_trips: 0,
          experience_years: 0,
          specializations: [],
          preferred_routes: [],
          profile_image: avatarPath || null,
          current_location: null,
          rntrc: null,
          rntrc_expiry: null,
          vehicle_type: vehicleTypes.length > 0 ? vehicleTypes[0] : null,
          vehicle_capacity: null,
          trailer_type: null,
          renavam: null,
          antt_vehicle: null,
          availability_expires_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        console.log('📊 Dados do Driver:', {
          user_id: driverData.user_id,
          name: driverData.name,
          cpf: driverData.cpf,
          phone: driverData.phone,
          cnh: driverData.cnh,
          cnh_category: driverData.cnh_category,
          vehicle_plate: driverData.vehicle_plate,
          address: driverData.address
        });

        // Usar UPSERT para evitar problemas com triggers ou tentativas duplicadas
        const { error: driverError } = await supabase
          .from('drivers')
          .upsert(driverData, {
            onConflict: 'user_id', // Se já existir um driver com este user_id, atualiza
            ignoreDuplicates: false
          });

        if (driverError) {
          console.error('❌ Erro detalhado ao salvar driver:', driverError);
          throw new Error('Erro ao salvar dados do motorista: ' + driverError.message);
        }

        console.log('✅ Registro de motorista salvo com sucesso (upsert)');
      } else {
        console.log('📝 Salvando registro de empresa...');
        
        const companyData = {
          user_id: userId,
          company_name: companyName.trim() || null,
          cnpj: cnpj.replace(/\D/g, '') || null,
          trading_name: tradeName.trim() || companyName.trim() || null,
          company_type: userType,
          rntrc: rntrc.trim() || null,
          rntrc_expiry: null,
          phone: phone.replace(/\D/g, '') || null,
          corporate_email: email.trim().toLowerCase() || null, // ✅ CORRIGIDO: coluna 'email' não existe, usar corporate_email
          website: null,
          description: null,
          address: {
            cep: cep.replace(/\D/g, '') || '',
            street: street.trim() || '',
            number: number.trim() || '',
            complement: complement.trim() || '',
            neighborhood: neighborhood.trim() || '',
            city: city.trim() || '',
            state: state.trim() || ''
          },
          representative_name: representativeName.trim() || null,
          representative_cpf: representativeCpf.replace(/\D/g, '') || null,
          representative_email: email.trim().toLowerCase() || null,
          representative_phone: phone.replace(/\D/g, '') || null,
          representative_role: 'Representante Legal',
          representative_rg: null,
          representative_cnh: null,
          state_registration: null,
          municipal_registration: null,
          certifications: [],
          fleet_size: 0,
          operating_states: [state.trim()],
          is_individual: false,
          main_cpf: representativeCpf.replace(/\D/g, ''),
          logo_url: avatarPath || null,
          document_paths: Object.keys(documentPaths).length > 0 ? documentPaths : null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        console.log('📊 Dados da Company:', {
          user_id: companyData.user_id,
          company_name: companyData.company_name,
          cnpj: companyData.cnpj,
          company_type: companyData.company_type,
          corporate_email: companyData.corporate_email, // ✅ CORRIGIDO: usar corporate_email
          phone: companyData.phone,
          representative_name: companyData.representative_name,
          representative_cpf: companyData.representative_cpf,
          address: companyData.address
        });

        // Usar UPSERT para evitar problemas com triggers ou tentativas duplicadas
        const { error: companyError } = await supabase
          .from('companies')
          .upsert(companyData, {
            onConflict: 'user_id', // Se já existir uma company com este user_id, atualiza
            ignoreDuplicates: false
          });

        if (companyError) {
          console.error('❌ Erro detalhado ao salvar company:', companyError);
          throw new Error('Erro ao salvar dados da empresa: ' + companyError.message);
        }

        console.log('✅ Registro de empresa salvo com sucesso (upsert)');
      }

      console.log('═══════════════════════════════════════════════════════════');
      console.log('✅ CADASTRO COMPLETO - TUDO SALVO COM SUCESSO!');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('📊 Resumo do cadastro:');
      console.log('  - User ID:', userId);
      console.log('  - Email:', email.trim().toLowerCase());
      console.log('  - Tipo:', userType);
      console.log('  - Nome:', userType === 'caminhoneiro' ? name.trim() : companyName.trim());
      console.log('  - Telefone:', phone.replace(/\D/g, ''));
      console.log('  - Cidade/Estado:', city.trim(), '/', state.trim());
      console.log('  - Avatar:', avatarPath ? 'Sim' : 'Não');
      console.log('  - Documentos:', Object.keys(documentPaths).length);
      console.log('═══════════════════════════════════════════════════════════');
      
      toast.success('Cadastro completo! Bem-vindo ao MooveFretes!');
      
      setLoading(false);
      
      // Aguardar antes do reload para garantir sincronização
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (error) {
      console.error('❌ Erro ao completar cadastro:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao salvar dados';
      
      // Executar rollback se Auth User foi criado
      if (authUserId) {
        console.log('🔄 Iniciando rollback...');
        
        try {
          // 1. Deletar registro específico (driver ou company)
          if (userType === 'caminhoneiro') {
            console.log('🗑️ Deletando registro de motorista...');
            const { error: deleteDriverError } = await supabase
              .from('drivers')
              .delete()
              .eq('user_id', authUserId);
            
            if (deleteDriverError) {
              console.error('❌ Erro ao deletar driver:', deleteDriverError);
            } else {
              console.log('✅ Driver deletado');
            }
          } else {
            console.log('🗑️ Deletando registro de empresa...');
            const { error: deleteCompanyError } = await supabase
              .from('companies')
              .delete()
              .eq('user_id', authUserId);
            
            if (deleteCompanyError) {
              console.error('❌ Erro ao deletar company:', deleteCompanyError);
            } else {
              console.log('✅ Company deletada');
            }
          }
          
          // 2. Deletar profile
          console.log('🗑️ Deletando profile...');
          const { error: deleteProfileError } = await supabase
            .from('profiles')
            .delete()
            .eq('id', authUserId);
          
          if (deleteProfileError) {
            console.error('❌ Erro ao deletar profile:', deleteProfileError);
          } else {
            console.log('✅ Profile deletado');
          }
          
          // 3. Fazer logout para limpar sessão
          console.log('🔄 Fazendo logout para limpar sessão...');
          await supabase.auth.signOut();
          console.log('✅ Logout executado');
          
          console.log('✅ Rollback completo executado');
          console.log('⚠️ IMPORTANTE: O Auth User não pode ser deletado do client-side.');
          console.log('⚠️ Usuário deve usar opção "Esqueci minha senha" ou contatar suporte.');
        } catch (rollbackError) {
          console.error('❌ Erro durante rollback:', rollbackError);
        }
      }
      
      if (errorMessage.includes('already registered') || errorMessage.includes('já está cadastrado')) {
        toast.error('Este email já está cadastrado. Faça login ou use outro email.');
      } else if (errorMessage.includes('duplicate key') || errorMessage.includes('profiles_pkey')) {
        toast.error('Já existe uma conta em processo de criação. Por favor, aguarde alguns instantes e tente fazer login.');
      } else {
        toast.error('Erro ao criar conta: ' + errorMessage);
      }
      
      setLoading(false);
    }
  }

  // Renderizar step atual
  function renderCurrentStep() {
    switch (currentStep) {
      case 'credentials':
        return (
          <div className="space-y-6">
            {/* Foto de Perfil */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                Foto de Perfil
                <span className="text-gray-400 text-xs">(opcional)</span>
              </Label>
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
                className="flex items-center justify-center w-full p-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#253663] transition-colors bg-gray-50 hover:bg-gray-100"
              >
                {profilePhotoPreview ? (
                  <div className="flex items-center gap-3">
                    <img
                      src={profilePhotoPreview}
                      alt="Preview"
                      className="w-20 h-20 rounded-full object-cover"
                    />
                    <div className="text-left">
                      <p className="text-sm text-gray-700">
                        Foto selecionada
                      </p>
                      <p className="text-xs text-gray-500">
                        Clique para alterar
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <Camera className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-700">
                      Adicionar foto de perfil
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Clique para selecionar uma imagem
                    </p>
                  </div>
                )}
              </label>
            </div>

            {/* Nome Completo */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Nome Completo <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10"
                  placeholder="Digite seu nome completo"
                  required
                />
              </div>
            </div>

            {/* Telefone */}
            <PhoneInput
              value={phone}
              onChange={setPhone}
              label="Telefone"
              required
            />

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
                    const newEmail = e.target.value;
                    setEmail(newEmail);
                    setEmailAvailable(null);
                    
                    // Limpar timeout anterior
                    if (emailCheckTimeout) {
                      clearTimeout(emailCheckTimeout);
                    }
                    
                    // Verificar email após 800ms de pausa na digitação
                    const timeout = setTimeout(() => {
                      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                      if (emailRegex.test(newEmail)) {
                        checkEmailAvailability(newEmail);
                      }
                    }, 800);
                    
                    setEmailCheckTimeout(timeout);
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
              {touched.email && isEmailValid() && emailAvailable === false && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Este email já está cadastrado
                </p>
              )}
              {touched.email && isEmailValid() && emailAvailable === true && (
                <p className="text-xs text-green-500 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Email disponível
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
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => {
                    setTouched({ ...touched, password: true });
                    // Sempre fechar mensagem ao sair do campo
                    setPasswordFocused(false);
                  }}
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
              
              {passwordFocused && password.length > 0 && (
                <div className="space-y-2 bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground">
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
                  As senhas não conferem
                </p>
              )}
              {touched.confirmPassword && isPasswordMatch() && (
                <p className="text-xs text-green-500 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  As senhas conferem
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
              <label
                htmlFor="terms"
                className="text-sm text-muted-foreground leading-tight cursor-pointer"
              >
                Aceito os{' '}
                <button
                  type="button"
                  onClick={() => setShowTermsModal(true)}
                  className="text-[#253663] underline hover:text-[#253663]/80"
                >
                  Termos de Uso
                </button>{' '}
                e concordo com o processamento dos meus dados
              </label>
            </div>
          </div>
        );

      case 'address':
        return (
          <div className="space-y-6">
            <CEPInput
              value={cep}
              onChange={setCep}
              onAddressData={handleAddressData}
              label="CEP"
              required
            />

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="street">
                  Rua/Avenida <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="street"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="Nome da rua"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="number">
                  Número <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="number"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  placeholder="Nº"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="complement">
                Complemento <span className="text-gray-400 text-xs">(opcional)</span>
              </Label>
              <Input
                id="complement"
                value={complement}
                onChange={(e) => setComplement(e.target.value)}
                placeholder="Apto, sala, etc."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="neighborhood">
                Bairro <span className="text-red-500">*</span>
              </Label>
              <Input
                id="neighborhood"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                placeholder="Nome do bairro"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">
                  Cidade <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Nome da cidade"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">
                  Estado <span className="text-red-500">*</span>
                </Label>
                <select
                  id="state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  required
                >
                  <option value="">Selecione</option>
                  {brazilianStates.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        );

      case 'specific':
        if (userType === 'caminhoneiro') {
          return (
            <div className="space-y-6">
              {/* CPF */}
              <CPFInput
                value={cpf}
                onChange={setCpf}
                label="CPF"
                required
              />

              {/* Data de Nascimento */}
              <div className="space-y-2">
                <Label htmlFor="birthDate">
                  Data de Nascimento <span className="text-gray-400 text-xs">(opcional)</span>
                </Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                />
              </div>

              {/* CNH */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cnh">
                    CNH <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="cnh"
                    value={cnh}
                    onChange={(e) => setCnh(e.target.value)}
                    placeholder="Número da CNH"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cnhCategory">
                    Categoria <span className="text-red-500">*</span>
                  </Label>
                  <select
                    id="cnhCategory"
                    value={cnhCategory}
                    onChange={(e) => setCnhCategory(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    required
                  >
                    <option value="">Selecione</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                    <option value="E">E</option>
                    <option value="AB">AB</option>
                    <option value="AC">AC</option>
                    <option value="AD">AD</option>
                    <option value="AE">AE</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cnhValidity">
                  Validade da CNH <span className="text-gray-400 text-xs">(opcional)</span>
                </Label>
                <Input
                  id="cnhValidity"
                  type="date"
                  value={cnhValidity}
                  onChange={(e) => setCnhValidity(e.target.value)}
                />
              </div>

              {/* Veículo */}
              <div className="space-y-2">
                <Label htmlFor="vehiclePlate">
                  Placa do Veículo <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="vehiclePlate"
                  value={vehiclePlate}
                  onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                  placeholder="ABC-1234"
                  maxLength={8}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vehicleModel">
                    Modelo <span className="text-gray-400 text-xs">(opcional)</span>
                  </Label>
                  <Input
                    id="vehicleModel"
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                    placeholder="Ex: Volvo FH"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vehicleYear">
                    Ano <span className="text-gray-400 text-xs">(opcional)</span>
                  </Label>
                  <Input
                    id="vehicleYear"
                    value={vehicleYear}
                    onChange={(e) => setVehicleYear(e.target.value)}
                    placeholder="Ex: 2020"
                    maxLength={4}
                  />
                </div>
              </div>

              <VehicleTypeSelector
                selectedVehicleTypes={vehicleTypes}
                selectedBodyTypes={bodyTypes}
                onVehicleTypesChange={setVehicleTypes}
                onBodyTypesChange={setBodyTypes}
              />
            </div>
          );
        } else {
          return (
            <div className="space-y-6">
              {/* CNPJ */}
              <CNPJInput
                value={cnpj}
                onChange={setCnpj}
                label="CNPJ"
                required
              />

              {/* Razão Social */}
              <div className="space-y-2">
                <Label htmlFor="companyName">
                  Razão Social <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="companyName"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="pl-10"
                    placeholder="Nome da empresa"
                    required
                  />
                </div>
              </div>

              {/* Nome Fantasia */}
              <div className="space-y-2">
                <Label htmlFor="tradeName">
                  Nome Fantasia <span className="text-gray-400 text-xs">(opcional)</span>
                </Label>
                <Input
                  id="tradeName"
                  value={tradeName}
                  onChange={(e) => setTradeName(e.target.value)}
                  placeholder="Nome fantasia"
                />
              </div>

              {/* Representante Legal */}
              <div className="space-y-2">
                <Label htmlFor="representativeName">
                  Nome do Representante Legal <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="representativeName"
                    value={representativeName}
                    onChange={(e) => setRepresentativeName(e.target.value)}
                    className="pl-10"
                    placeholder="Nome completo"
                    required
                  />
                </div>
              </div>

              {/* CPF do Representante */}
              <CPFInput
                value={representativeCpf}
                onChange={setRepresentativeCpf}
                label="CPF do Representante"
                required
              />

              {/* RNTRC */}
              <div className="space-y-2">
                <Label htmlFor="rntrc">
                  RNTRC <span className="text-gray-400 text-xs">(opcional)</span>
                </Label>
                <Input
                  id="rntrc"
                  value={rntrc}
                  onChange={(e) => setRntrc(e.target.value)}
                  placeholder="Número do RNTRC"
                />
              </div>
            </div>
          );
        }

      case 'documents':
        return (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Envie os documentos necessários para validação do seu cadastro. Todos os documentos são opcionais, mas recomendados.
            </p>

            {userType === 'caminhoneiro' ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="cnhDoc">
                    CNH <span className="text-gray-400 text-xs">(opcional)</span>
                  </Label>
                  <Input
                    id="cnhDoc"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setCnhDoc(e.target.files?.[0] || null)}
                    className="cursor-pointer"
                  />
                  {cnhDoc && (
                    <p className="text-xs text-green-500 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      {cnhDoc.name}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vehicleDoc">
                    CRLV (Documento do Veículo) <span className="text-gray-400 text-xs">(opcional)</span>
                  </Label>
                  <Input
                    id="vehicleDoc"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setVehicleDoc(e.target.files?.[0] || null)}
                    className="cursor-pointer"
                  />
                  {vehicleDoc && (
                    <p className="text-xs text-green-500 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      {vehicleDoc.name}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="cnpjDoc">
                    Cartão CNPJ <span className="text-gray-400 text-xs">(opcional)</span>
                  </Label>
                  <Input
                    id="cnpjDoc"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setCnpjDoc(e.target.files?.[0] || null)}
                    className="cursor-pointer"
                  />
                  {cnpjDoc && (
                    <p className="text-xs text-green-500 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      {cnpjDoc.name}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contractDoc">
                    Contrato Social <span className="text-gray-400 text-xs">(opcional)</span>
                  </Label>
                  <Input
                    id="contractDoc"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setContractDoc(e.target.files?.[0] || null)}
                    className="cursor-pointer"
                  />
                  {contractDoc && (
                    <p className="text-xs text-green-500 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      {contractDoc.name}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <div className="fixed inset-0 bg-background overflow-y-auto">
      <div className="max-w-md w-full mx-auto py-8 px-4 min-h-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Logo */}
          <div className="flex items-center justify-center mb-6">
            <img 
              src={logoMaisFrete} 
              alt="MooveFretes" 
              className="h-16 w-auto"
            />
          </div>

          <Card className="bg-white shadow-card">
            <CardHeader className="border-b border-light">
              <div className="flex items-center justify-between mb-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={currentStepIndex === 0 ? onBack : handleBack}
                  className="p-2"
                  disabled={loading}
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div className="text-center flex-1">
                  <h1 className="text-xl text-foreground">Complete seu Perfil</h1>
                  <p className="text-sm text-[#253663] mt-1">
                    Passo {currentStepIndex + 1} de {steps.length}
                  </p>
                </div>
                <div className="w-10"></div>
              </div>

              {/* Progress Bar */}
              <Progress value={progress} className="h-2" />

              {/* Step Icons */}
              <div className="flex items-center justify-between mt-4">
                {steps.map((step, index) => {
                  const StepIcon = step.icon;
                  const isActive = index === currentStepIndex;
                  const isCompleted = index < currentStepIndex;
                  
                  return (
                    <div key={step.id} className="flex flex-col items-center flex-1">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                        isActive 
                          ? 'bg-[#253663] text-white' 
                          : isCompleted 
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-400'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          <StepIcon className="w-5 h-5" />
                        )}
                      </div>
                      <p className={`text-xs mt-1 text-center ${
                        isActive ? 'text-[#253663]' : 'text-gray-400'
                      }`}>
                        {step.label}
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardHeader>

            <CardContent className="p-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {renderCurrentStep()}
                </motion.div>
              </AnimatePresence>

              {/* Navigation Buttons */}
              <div className="mt-8">
                {currentStepIndex === steps.length - 1 ? (
                  <Button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full bg-[#253663] hover:bg-[#253663]/90 text-white"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Criando conta...
                      </>
                    ) : (
                      <>
                        Criar Conta e Continuar
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={handleNext}
                    disabled={!canProceedToNextStep()}
                    className="w-full bg-[#253663] hover:bg-[#253663]/90 text-white"
                  >
                    Próximo
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Support info */}
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Após criar sua conta, você completará seu perfil com mais informações
            </p>
          </div>
        </motion.div>
      </div>

      {/* Terms Modal */}
      {showTermsModal && (
        <TermsOfUseModal
          isOpen={showTermsModal}
          onClose={() => setShowTermsModal(false)}
        />
      )}
    </div>
  );
}
