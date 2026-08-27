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
import { validateCPF, validateCNPJ } from '../utils/formatters';
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
  const [rg, setRg] = useState('');
  const [cnh, setCnh] = useState('');
  const [cnhCategory, setCnhCategory] = useState('');
  const [cnhValidity, setCnhValidity] = useState('');
  const [rntrc, setRntrc] = useState('');
  const [rntrcValidity, setRntrcValidity] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleYear, setVehicleYear] = useState('');
  const [vehicleTypes, setVehicleTypes] = useState<string[]>([]);
  const [bodyTypes, setBodyTypes] = useState<string[]>([]);

  // Específico - Empresa
  const [cnpj, setCnpj] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [companyRntrc, setCompanyRntrc] = useState('');
  const [companyRntrcValidity, setCompanyRntrcValidity] = useState('');
  const [representativeName, setRepresentativeName] = useState('');
  const [representativeCpf, setRepresentativeCpf] = useState('');
  const [representativeRg, setRepresentativeRg] = useState('');
  const [representativeRole, setRepresentativeRole] = useState('');
  const [stateRegistration, setStateRegistration] = useState('');
  const [municipalRegistration, setMunicipalRegistration] = useState('');
  const [isentoIE, setIsentoIE] = useState(false);

  // Documentos - Caminhoneiro
  const [rgDoc, setRgDoc] = useState<File | null>(null);
  const [cpfDoc, setCpfDoc] = useState<File | null>(null);
  const [cnhDoc, setCnhDoc] = useState<File | null>(null);
  const [rntrcDoc, setRntrcDoc] = useState<File | null>(null);
  const [vehicleDoc, setVehicleDoc] = useState<File | null>(null);
  const [addressDoc, setAddressDoc] = useState<File | null>(null);
  const [selfieDoc, setSelfieDoc] = useState<File | null>(null);

  // Documentos - Empresa
  const [cnpjDoc, setCnpjDoc] = useState<File | null>(null);
  const [contractDoc, setContractDoc] = useState<File | null>(null);

  const steps: { id: Step; label: string; icon: any }[] = [
    { id: 'credentials', label: 'Dados Pessoais', icon: User },
    { id: 'address', label: 'Endereço', icon: MapPin },
    { id: 'specific', label: userType === 'caminhoneiro' ? 'Veículo' : 'Empresa', icon: userType === 'caminhoneiro' ? Truck : Building },
    { id: 'documents', label: 'Documentos', icon: FileText }
  ];

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

  // ── Helpers de validação (tamanho de campo, datas, formato) ──────────────

  function isValidDateString(dateStr: string): boolean {
    if (!dateStr) return false;
    const d = new Date(`${dateStr}T00:00:00`);
    return !isNaN(d.getTime());
  }

  // Idade mínima (nascimento não pode ser no futuro nem indicar menor de idade)
  function isAdult(dateStr: string, minAge = 18): boolean {
    if (!isValidDateString(dateStr)) return false;
    const birth = new Date(`${dateStr}T00:00:00`);
    const today = new Date();
    if (birth > today) return false;
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
    return age >= minAge;
  }

  // Documento com validade não pode já estar vencido
  function isNotExpired(dateStr: string): boolean {
    if (!isValidDateString(dateStr)) return false;
    const d = new Date(`${dateStr}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d >= today;
  }

  // Placa Mercosul (AAA9A99) ou padrão antigo (AAA9999)
  function isValidPlate(plate: string): boolean {
    const cleaned = plate.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    return /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(cleaned);
  }

  function inRange(value: string, min: number, max: number): boolean {
    const len = value.trim().length;
    return len >= min && len <= max;
  }

  // Validações por step
  function isCredentialsStepValid() {
    const base =
      inRange(name, 3, 100) &&
      phone.replace(/\D/g, '').length >= 10 &&
      phone.replace(/\D/g, '').length <= 11 &&
      isEmailValid() &&
      email.trim().length <= 150 &&
      emailAvailable === true &&
      passwordStrength?.isStrong &&
      password.length <= 72 &&
      isPasswordMatch() &&
      acceptedTerms;

    if (userType === 'caminhoneiro') {
      return base && profilePhoto !== null;
    }
    return base;
  }

  function isAddressStepValid() {
    return cep.replace(/\D/g, '').length === 8 &&
           inRange(street, 3, 150) &&
           inRange(number, 1, 10) &&
           inRange(neighborhood, 2, 100) &&
           inRange(city, 2, 100) &&
           state.trim().length === 2;
  }

  function isSpecificStepValid() {
    if (userType === 'caminhoneiro') {
      return validateCPF(cpf) &&
             inRange(rg, 5, 15) &&
             isAdult(birthDate, 18) &&
             cnh.replace(/\D/g, '').length === 11 &&
             cnhCategory.trim().length > 0 &&
             isNotExpired(cnhValidity) &&
             inRange(rntrc.replace(/\D/g, ''), 8, 9) &&
             isNotExpired(rntrcValidity) &&
             isValidPlate(vehiclePlate) &&
             inRange(vehicleModel, 2, 60) &&
             /^(19[5-9]\d|20\d{2})$/.test(vehicleYear.trim()) &&
             vehicleTypes.length > 0 &&
             bodyTypes.length > 0;
    } else {
      const baseValid =
        validateCNPJ(cnpj) &&
        inRange(companyName, 2, 150) &&
        inRange(representativeName, 3, 100) &&
        validateCPF(representativeCpf) &&
        inRange(representativeRg, 5, 15) &&
        inRange(representativeRole, 2, 60) &&
        (isentoIE || stateRegistration.trim().length > 0);
      if (userType === 'transportadora') {
        return baseValid &&
               inRange(companyRntrc.replace(/\D/g, ''), 8, 9) &&
               isNotExpired(companyRntrcValidity);
      }
      return baseValid;
    }
  };

  function isDocumentsStepValid() {
    if (userType === 'caminhoneiro') {
      return rgDoc !== null &&
             cpfDoc !== null &&
             cnhDoc !== null &&
             rntrcDoc !== null &&
             vehicleDoc !== null &&
             addressDoc !== null &&
             selfieDoc !== null;
    }
    const companyBase = cnpjDoc !== null && contractDoc !== null && addressDoc !== null;
    if (userType === 'transportadora') {
      return companyBase && rntrcDoc !== null;
    }
    return companyBase;
  }

  function canProceedToNextStep() {
    switch (currentStep) {
      case 'credentials':
        return isCredentialsStepValid();
      case 'address':
        return isAddressStepValid();
      case 'specific':
        return isSpecificStepValid();
      case 'documents':
        return isDocumentsStepValid();
      default:
        return false;
    }
  }

  function getMissingCredentialsFields(): string[] {
    const missing: string[] = [];
    if (!inRange(name, 3, 100)) missing.push(name.trim() ? 'nome (entre 3 e 100 caracteres)' : 'nome');
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 10 || phoneDigits.length > 11) missing.push('telefone (DDD + número, 10 ou 11 dígitos)');
    if (!isEmailValid()) missing.push('e-mail válido');
    else if (email.trim().length > 150) missing.push('e-mail muito longo');
    else if (emailAvailable === null || checkingEmail) missing.push('aguarde a verificação do e-mail');
    else if (emailAvailable === false) missing.push('e-mail já cadastrado (use outro)');
    if (!passwordStrength?.isStrong) missing.push('senha forte (mín. 8 caracteres, maiúscula, minúscula e número)');
    else if (password.length > 72) missing.push('senha muito longa (máx. 72 caracteres)');
    if (!isPasswordMatch()) missing.push('confirmação de senha (não confere)');
    if (!acceptedTerms) missing.push('aceite dos termos de uso');
    if (userType === 'caminhoneiro' && profilePhoto === null) missing.push('foto de perfil');
    return missing;
  }

  function getMissingAddressFields(): string[] {
    const missing: string[] = [];
    if (cep.replace(/\D/g, '').length !== 8) missing.push('CEP (8 dígitos)');
    if (!inRange(street, 3, 150)) missing.push('rua/logradouro (mín. 3 caracteres)');
    if (!inRange(number, 1, 10)) missing.push('número');
    if (!inRange(neighborhood, 2, 100)) missing.push('bairro (mín. 2 caracteres)');
    if (!inRange(city, 2, 100)) missing.push('cidade (mín. 2 caracteres)');
    if (state.trim().length !== 2) missing.push('estado');
    return missing;
  }

  function getMissingSpecificFields(): string[] {
    const missing: string[] = [];
    if (userType === 'caminhoneiro') {
      if (!validateCPF(cpf)) missing.push(cpf.replace(/\D/g, '').length > 0 ? 'CPF inválido' : 'CPF');
      if (!inRange(rg, 5, 15)) missing.push('RG (entre 5 e 15 caracteres)');
      if (!birthDate.trim()) missing.push('data de nascimento');
      else if (!isAdult(birthDate, 18)) missing.push('data de nascimento (motorista deve ser maior de 18 anos e a data não pode ser futura)');
      if (cnh.replace(/\D/g, '').length !== 11) missing.push('número da CNH (11 dígitos)');
      if (!cnhCategory.trim()) missing.push('categoria da CNH');
      if (!cnhValidity.trim()) missing.push('validade da CNH');
      else if (!isNotExpired(cnhValidity)) missing.push('validade da CNH (está vencida)');
      if (!inRange(rntrc.replace(/\D/g, ''), 8, 9)) missing.push('RNTRC (8 a 9 dígitos)');
      if (!rntrcValidity.trim()) missing.push('validade do RNTRC');
      else if (!isNotExpired(rntrcValidity)) missing.push('validade do RNTRC (está vencida)');
      if (!isValidPlate(vehiclePlate)) missing.push('placa do veículo (formato inválido)');
      if (!inRange(vehicleModel, 2, 60)) missing.push('modelo do veículo (mín. 2 caracteres)');
      if (!/^(19[5-9]\d|20\d{2})$/.test(vehicleYear.trim())) missing.push('ano do veículo (ano válido de 4 dígitos)');
      if (vehicleTypes.length === 0) missing.push('tipo de veículo (selecione ao menos um)');
      if (bodyTypes.length === 0) missing.push('tipo de carroceria (selecione ao menos um)');
    } else {
      if (!validateCNPJ(cnpj)) missing.push(cnpj.replace(/\D/g, '').length > 0 ? 'CNPJ inválido' : 'CNPJ');
      if (!inRange(companyName, 2, 150)) missing.push('razão social');
      if (!inRange(representativeName, 3, 100)) missing.push('nome do representante');
      if (!validateCPF(representativeCpf)) missing.push(representativeCpf.replace(/\D/g, '').length > 0 ? 'CPF do representante inválido' : 'CPF do representante');
      if (!inRange(representativeRg, 5, 15)) missing.push('RG do representante');
      if (!inRange(representativeRole, 2, 60)) missing.push('cargo/vínculo do representante');
      if (!isentoIE && !stateRegistration.trim()) missing.push('inscrição estadual (ou marque isento)');
      if (userType === 'transportadora') {
        if (!inRange(companyRntrc.replace(/\D/g, ''), 8, 9)) missing.push('RNTRC da empresa (8 a 9 dígitos)');
        if (!companyRntrcValidity.trim()) missing.push('validade do RNTRC da empresa');
        else if (!isNotExpired(companyRntrcValidity)) missing.push('validade do RNTRC da empresa (está vencida)');
      }
    }
    return missing;
  }

  function getMissingDocumentsFields(): string[] {
    const missing: string[] = [];
    if (userType === 'caminhoneiro') {
      if (rgDoc === null) missing.push('foto/scan do RG');
      if (cpfDoc === null) missing.push('foto/scan do CPF');
      if (cnhDoc === null) missing.push('foto/scan da CNH');
      if (rntrcDoc === null) missing.push('foto/scan do RNTRC');
      if (vehicleDoc === null) missing.push('documento do veículo');
      if (addressDoc === null) missing.push('comprovante de endereço');
      if (selfieDoc === null) missing.push('selfie de verificação');
    } else {
      if (cnpjDoc === null) missing.push('cartão CNPJ');
      if (contractDoc === null) missing.push('contrato social');
      if (addressDoc === null) missing.push('comprovante de endereço');
      if (userType === 'transportadora' && rntrcDoc === null) missing.push('documento do RNTRC');
    }
    return missing;
  }

  function handleNext() {
    if (!canProceedToNextStep()) {
      const missingByStep: Record<string, () => string[]> = {
        credentials: getMissingCredentialsFields,
        address: getMissingAddressFields,
        specific: getMissingSpecificFields,
        documents: getMissingDocumentsFields,
      };
      const missing = missingByStep[currentStep]?.() || [];
      toast.error(
        missing.length > 0
          ? `Falta preencher: ${missing.join(', ')}`
          : 'Preencha todos os campos obrigatórios',
      );
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

  // ── Preenchimento automático (só em dev) ──────────────────────────────
  // Gera um File "de mentira" (PNG 1x1) pra satisfazer os campos de upload
  // sem precisar escolher um arquivo real toda vez.
  function makeFakeImageFile(fileName: string): File {
    const base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    const byteChars = atob(base64);
    const bytes = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
    return new File([bytes], fileName, { type: 'image/png' });
  }

  function fillTestData() {
    const stamp = Date.now();
    const testEmail = `teste.${userType}.${stamp}@moovefretes.test`;
    const twoYearsFromNow = new Date();
    twoYearsFromNow.setFullYear(twoYearsFromNow.getFullYear() + 2);
    const futureDate = twoYearsFromNow.toISOString().slice(0, 10);

    // Passo 1 — Dados de acesso
    setName(userType === 'caminhoneiro' ? 'Motorista Teste' : 'Responsável Teste');
    setEmail(testEmail);
    setPassword('Teste123!');
    setConfirmPassword('Teste123!');
    setAcceptedTerms(true);
    checkEmailAvailability(testEmail);
    if (userType === 'caminhoneiro') {
      const photo = makeFakeImageFile('foto-perfil.png');
      setProfilePhoto(photo);
      const reader = new FileReader();
      reader.onloadend = () => setProfilePhotoPreview(reader.result as string);
      reader.readAsDataURL(photo);
    }

    // Passo 2 — Endereço
    setCep('01310-100');
    setStreet('Avenida Paulista');
    setNumber('1000');
    setNeighborhood('Bela Vista');
    setCity('São Paulo');
    setState('SP');

    // Passo 3 — Dados específicos
    if (userType === 'caminhoneiro') {
      setCpf('529.982.247-25'); // CPF de teste válido (passa dígito verificador)
      setRg('12.345.678-9');
      setBirthDate('1990-05-15');
      setCnh('12345678900');
      setCnhCategory('E');
      setCnhValidity(futureDate);
      setRntrc('12345678');
      setRntrcValidity(futureDate);
      setVehiclePlate('ABC1D23');
      setVehicleModel('Volvo FH 540');
      setVehicleYear('2020');
      setVehicleTypes(['Truck']);
      setBodyTypes(['Baú']);

      // Passo 4 — Documentos
      setRgDoc(makeFakeImageFile('rg.png'));
      setCpfDoc(makeFakeImageFile('cpf.png'));
      setCnhDoc(makeFakeImageFile('cnh.png'));
      setRntrcDoc(makeFakeImageFile('rntrc.png'));
      setVehicleDoc(makeFakeImageFile('crlv.png'));
      setAddressDoc(makeFakeImageFile('comprovante-endereco.png'));
      setSelfieDoc(makeFakeImageFile('selfie.png'));
    } else {
      setCnpj('11.222.333/0001-81'); // CNPJ de teste válido
      setCompanyName('Transportadora Teste LTDA');
      setTradeName('Transportadora Teste');
      setRepresentativeName('Responsável Teste');
      setRepresentativeCpf('123.456.789-09'); // CPF de teste válido
      setRepresentativeRg('98.765.432-1');
      setRepresentativeRole('Diretor');
      setStateRegistration('123456789');
      if (userType === 'transportadora') {
        setCompanyRntrc('87654321');
        setCompanyRntrcValidity(futureDate);
      }

      // Passo 4 — Documentos
      setCnpjDoc(makeFakeImageFile('cnpj.png'));
      setContractDoc(makeFakeImageFile('contrato-social.png'));
      setAddressDoc(makeFakeImageFile('comprovante-endereco.png'));
      if (userType === 'transportadora') {
        setRntrcDoc(makeFakeImageFile('rntrc.png'));
      }
    }

    toast.success('Dados de teste preenchidos! Clique em "Próximo" pra avançar.');
  }

  async function handleSubmit() {
    setLoading(true);
    let authUserId: string | null = null;

    try {

      // Verificação preventiva: checar se usuário já existe
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
        throw new Error('Este email já está cadastrado. Faça login ou use outro email.');
      }
      

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
      // [REVISAR] console.log('📧 Email:', email.trim().toLowerCase());

      // Aguardar sessão e sincronização do Supabase Auth
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Atualizar dados no Authentication Users (display_name e phone)
      const displayName = userType === 'caminhoneiro' ? name.trim() : companyName.trim();
      const phoneFormatted = phone.replace(/\D/g, '');
      
      
      const { error: updateAuthError } = await supabase.auth.updateUser({
        data: {
          display_name: displayName,
          phone: phoneFormatted,
          user_type: userType
        }
      });

      if (updateAuthError) {
        // Não bloquear o cadastro se falhar, apenas logar o aviso
      } else {
      }

      // Upload de avatar
      let avatarPath: string | undefined = undefined;
      if (profilePhoto) {
        try {
          const { uploadAvatar } = await import('../utils/storage-helper');
          const result = await uploadAvatar(userId, profilePhoto);
          if (result.success && result.path) {
            avatarPath = result.path;
          }
        } catch (error) {
          console.error('❌ Erro ao fazer upload do avatar:', error);
        }
      }

      // Upload de documentos
      const documentPaths: Record<string, string> = {};
      const docsToUpload = userType === 'caminhoneiro'
        ? [
            { file: rgDoc, key: 'rg', name: 'RG' },
            { file: cpfDoc, key: 'cpf', name: 'CPF' },
            { file: cnhDoc, key: 'cnh', name: 'CNH' },
            { file: rntrcDoc, key: 'rntrc', name: 'RNTRC' },
            { file: vehicleDoc, key: 'vehicleDocument', name: 'CRLV' },
            { file: addressDoc, key: 'addressProof', name: 'Comprovante de Endereço' },
            { file: selfieDoc, key: 'selfie', name: 'Selfie com RG' }
          ]
        : [
            { file: cnpjDoc, key: 'cnpjDocument', name: 'CNPJ' },
            { file: contractDoc, key: 'contractSocial', name: 'Contrato Social' },
            { file: addressDoc, key: 'addressProof', name: 'Comprovante de Endereço' },
            { file: rntrcDoc, key: 'rntrc', name: 'RNTRC' }
          ];

      for (const doc of docsToUpload) {
        if (doc.file) {
          try {
            const { uploadDocument } = await import('../utils/storage-helper');
            const result = await uploadDocument(userId, doc.file, doc.key);
            if (result.success && result.path) {
              documentPaths[doc.key] = result.path;

              // Registrar o documento pra fila de aprovação do painel admin
              // (CNH, CNPJ etc. precisam ser revisados manualmente).
              const { error: docError } = await supabase.from('documents').insert({
                owner_type: userType === 'caminhoneiro' ? 'driver' : 'company',
                user_id: userId,
                document_type: doc.key,
                file_path: result.path,
                status: 'pending',
              });
              if (docError) {
                console.error(`❌ Erro ao registrar documento ${doc.name} para aprovação:`, docError);
              }
            }
          } catch (error) {
            console.error(`❌ Erro ao fazer upload de ${doc.name}:`, error);
          }
        }
      }

      // Aguardar antes de criar profile
      await new Promise(resolve => setTimeout(resolve, 500));

      // Criar Profile
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
        status: 'active',
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

      // [REVISAR] console.log('✅ Profile salvo com sucesso (upsert)');

      // Aguardar antes de criar registro específico
      await new Promise(resolve => setTimeout(resolve, 500));

      // Criar registro específico
      if (userType === 'caminhoneiro') {
        
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
          available: true,
          rating: 0,
          completed_trips: 0,
          experience_years: 0,
          specializations: [],
          profile_image: avatarPath || null,
          current_location: null,
          rg: rg.trim() || null,
          rntrc: rntrc.trim() || null,
          rntrc_expiry: rntrcValidity || null,
          vehicle_type: vehicleTypes.length > 0 ? vehicleTypes[0] : null,
          vehicle_capacity: null,
          trailer_type: null,
          renavam: null,
          antt_vehicle: null,
          availability_expires_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };


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

        // [REVISAR] console.log('✅ Registro de motorista salvo com sucesso (upsert)');
      } else {
        
        const companyData = {
          user_id: userId,
          company_name: companyName.trim() || null,
          cnpj: cnpj.replace(/\D/g, '') || null,
          trading_name: tradeName.trim() || companyName.trim() || null,
          company_type: userType,
          rntrc: companyRntrc.trim() || null,
          phone: phone.replace(/\D/g, '') || null,
          email: email.trim().toLowerCase() || null,
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
          representative_role: representativeRole.trim() || 'Representante Legal',
          representative_rg: representativeRg.trim() || null,
          representative_cnh: null,
          state_registration: isentoIE ? 'ISENTO' : (stateRegistration.trim() || null),
          municipal_registration: municipalRegistration.trim() || null,
          rntrc_expiry: companyRntrcValidity || null,
          certifications: [],
          fleet_size: 0,
          operating_states: [state.trim()],
          is_individual: false,
          main_cpf: representativeCpf.replace(/\D/g, ''),
          logo_url: avatarPath || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };


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

        // [REVISAR] console.log('✅ Registro de empresa salvo com sucesso (upsert)');
      }

      // [REVISAR] console.log('  - Email:', email.trim().toLowerCase());
      // [REVISAR] console.log('  - Nome:', userType === 'caminhoneiro' ? name.trim() : companyName.trim());
      // [REVISAR] console.log('  - Telefone:', phone.replace(/\D/g, ''));
      // [REVISAR] console.log('  - Cidade/Estado:', city.trim(), '/', state.trim());
      
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
        
        try {
          // 1. Deletar registro específico (driver ou company)
          if (userType === 'caminhoneiro') {
            const { error: deleteDriverError } = await supabase
              .from('drivers')
              .delete()
              .eq('user_id', authUserId);
            
            if (deleteDriverError) {
              console.error('❌ Erro ao deletar driver:', deleteDriverError);
            } else {
            }
          } else {
            const { error: deleteCompanyError } = await supabase
              .from('companies')
              .delete()
              .eq('user_id', authUserId);
            
            if (deleteCompanyError) {
              console.error('❌ Erro ao deletar company:', deleteCompanyError);
            } else {
            }
          }
          
          // 2. Deletar profile
          const { error: deleteProfileError } = await supabase
            .from('profiles')
            .delete()
            .eq('id', authUserId);
          
          if (deleteProfileError) {
            console.error('❌ Erro ao deletar profile:', deleteProfileError);
          } else {
          }
          
          // 3. Fazer logout para limpar sessão
          await supabase.auth.signOut();
          
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
                {userType === 'caminhoneiro' && <span className="text-red-500">*</span>}
                {userType !== 'caminhoneiro' && <span className="text-gray-400 text-xs">(opcional)</span>}
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

              {/* RG */}
              <div className="space-y-2">
                <Label htmlFor="rg">
                  RG <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="rg"
                  value={rg}
                  onChange={(e) => setRg(e.target.value)}
                  placeholder="00.000.000-0"
                />
              </div>

              {/* Data de Nascimento */}
              <div className="space-y-2">
                <Label htmlFor="birthDate">
                  Data de Nascimento <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  required
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
                  Validade da CNH <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="cnhValidity"
                  type="date"
                  value={cnhValidity}
                  onChange={(e) => setCnhValidity(e.target.value)}
                  required
                />
              </div>

              {/* RNTRC */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rntrc">
                    RNTRC <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="rntrc"
                    value={rntrc}
                    onChange={(e) => setRntrc(e.target.value)}
                    placeholder="Número do RNTRC"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rntrcValidity">
                    Validade RNTRC <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="rntrcValidity"
                    type="date"
                    value={rntrcValidity}
                    onChange={(e) => setRntrcValidity(e.target.value)}
                    required
                  />
                </div>
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
                    Modelo <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="vehicleModel"
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                    placeholder="Ex: Volvo FH"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vehicleYear">
                    Ano <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="vehicleYear"
                    value={vehicleYear}
                    onChange={(e) => setVehicleYear(e.target.value)}
                    placeholder="Ex: 2020"
                    maxLength={4}
                    required
                  />
                </div>
              </div>

              <VehicleTypeSelector
                selectedTypes={vehicleTypes}
                selectedBodyTypes={bodyTypes}
                onTypesChange={setVehicleTypes}
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
                onCompanyData={(data) => {
                  setCompanyName(data.razao_social || '');
                  setTradeName(data.nome_fantasia || '');
                  setStreet(data.logradouro || '');
                  setNumber(data.numero || '');
                  setNeighborhood(data.bairro || '');
                  setCity(data.municipio || '');
                  setState(data.uf || '');
                  setCep(data.cep || '');
                }}
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

              {/* Inscrição Estadual */}
              <div className="space-y-2">
                <Label htmlFor="stateRegistration">
                  Inscrição Estadual {!isentoIE && <span className="text-red-500">*</span>}
                </Label>
                <Input
                  id="stateRegistration"
                  value={stateRegistration}
                  onChange={(e) => setStateRegistration(e.target.value)}
                  placeholder="000.000.000.000"
                  disabled={isentoIE}
                  required={!isentoIE}
                />
                <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={isentoIE}
                    onChange={(e) => {
                      setIsentoIE(e.target.checked);
                      if (e.target.checked) setStateRegistration('');
                    }}
                    className="rounded"
                  />
                  Isento de Inscrição Estadual
                </label>
              </div>

              {/* Inscrição Municipal */}
              <div className="space-y-2">
                <Label htmlFor="municipalRegistration">
                  Inscrição Municipal <span className="text-gray-400 text-xs">(opcional)</span>
                </Label>
                <Input
                  id="municipalRegistration"
                  value={municipalRegistration}
                  onChange={(e) => setMunicipalRegistration(e.target.value)}
                  placeholder="000000"
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

              {/* RG do Representante */}
              <div className="space-y-2">
                <Label htmlFor="representativeRg">
                  RG do Representante <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="representativeRg"
                  value={representativeRg}
                  onChange={(e) => setRepresentativeRg(e.target.value)}
                  placeholder="00.000.000-0"
                  required
                />
              </div>

              {/* Tipo de Vínculo */}
              <div className="space-y-2">
                <Label htmlFor="representativeRole">
                  Tipo de Vínculo <span className="text-red-500">*</span>
                </Label>
                <select
                  id="representativeRole"
                  value={representativeRole}
                  onChange={(e) => setRepresentativeRole(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  required
                >
                  <option value="">Selecione</option>
                  <option value="Sócio">Sócio</option>
                  <option value="Diretor">Diretor</option>
                  <option value="Procurador">Procurador</option>
                  <option value="Administrador">Administrador</option>
                  <option value="Proprietário">Proprietário</option>
                </select>
              </div>

              {/* RNTRC */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyRntrc">
                    RNTRC {userType === 'transportadora' ? <span className="text-red-500">*</span> : <span className="text-gray-400 text-xs">(opcional)</span>}
                  </Label>
                  <Input
                    id="companyRntrc"
                    value={companyRntrc}
                    onChange={(e) => setCompanyRntrc(e.target.value)}
                    placeholder="Número do RNTRC"
                    required={userType === 'transportadora'}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyRntrcValidity">
                    Validade do RNTRC {userType === 'transportadora' ? <span className="text-red-500">*</span> : <span className="text-gray-400 text-xs">(opcional)</span>}
                  </Label>
                  <Input
                    id="companyRntrcValidity"
                    type="date"
                    value={companyRntrcValidity}
                    onChange={(e) => setCompanyRntrcValidity(e.target.value)}
                    required={userType === 'transportadora'}
                  />
                </div>
              </div>
            </div>
          );
        }

      case 'documents':
        return (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Envie os documentos necessários para validação do seu cadastro.
            </p>

            {userType === 'caminhoneiro' ? (
              <>
                {[
                  { id: 'rgDoc', label: 'Foto do RG (Frente e Verso)', file: rgDoc, setFile: setRgDoc },
                  { id: 'cpfDoc', label: 'Foto do CPF', file: cpfDoc, setFile: setCpfDoc },
                  { id: 'cnhDoc', label: 'Foto da CNH (Frente e Verso)', file: cnhDoc, setFile: setCnhDoc },
                  { id: 'rntrcDoc', label: 'Foto do RNTRC', file: rntrcDoc, setFile: setRntrcDoc },
                  { id: 'vehicleDoc', label: 'CRLV (Documento do Veículo)', file: vehicleDoc, setFile: setVehicleDoc },
                  { id: 'addressDoc', label: 'Comprovante de Endereço', file: addressDoc, setFile: setAddressDoc },
                  { id: 'selfieDoc', label: 'Selfie segurando o RG', file: selfieDoc, setFile: setSelfieDoc },
                ].map(({ id, label, file, setFile }) => (
                  <div key={id} className="space-y-2">
                    <Label htmlFor={id}>
                      {label} <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id={id}
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="cursor-pointer"
                    />
                    {file && (
                      <p className="text-xs text-green-500 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        {file.name}
                      </p>
                    )}
                  </div>
                ))}
              </>
            ) : (
              <>
                {[
                  { id: 'cnpjDoc', label: 'Cartão CNPJ', file: cnpjDoc, setFile: setCnpjDoc, required: true },
                  { id: 'contractDoc', label: 'Contrato Social', file: contractDoc, setFile: setContractDoc, required: true },
                  { id: 'addressDoc', label: 'Comprovante de Endereço', file: addressDoc, setFile: setAddressDoc, required: true },
                  ...(userType === 'transportadora'
                    ? [{ id: 'rntrcDoc', label: 'Certificado RNTRC', file: rntrcDoc, setFile: setRntrcDoc, required: true }]
                    : []),
                ].map(({ id, label, file, setFile, required }) => (
                  <div key={id} className="space-y-2">
                    <Label htmlFor={id}>
                      {label} <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id={id}
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="cursor-pointer"
                    />
                    {file && (
                      <p className="text-xs text-green-500 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        {file.name}
                      </p>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <div className="w-full">
      <div className="w-full max-w-xl sm:max-w-2xl md:max-w-3xl mx-auto py-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Logo */}
          <div className="flex items-center justify-center mb-4">
            <img
              src={logoMaisFrete}
              alt="MooveFretes"
              className="h-12 w-auto"
            />
          </div>

          <Card className="bg-white shadow-card flex flex-col" style={{ maxHeight: 'calc(100vh - 6rem)' }}>
            <CardHeader className="border-b border-light flex-shrink-0 pb-4">
              <div className="flex items-center justify-between mb-3">
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
                </div>
                {import.meta.env.DEV ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={fillTestData}
                    className="p-2 text-xs"
                    title="Preencher com dados de teste (só aparece em dev)"
                  >
                    🧪
                  </Button>
                ) : (
                  <div className="w-10"></div>
                )}
              </div>

              {/* Progress Bar */}
              <Progress value={progress} className="h-2" />

              {/* Step Icons */}
              <div className="flex items-center justify-between mt-3">
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

            {/* Scrollable form content */}
            <CardContent className="flex-1 overflow-y-auto p-6 min-h-0">
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
            </CardContent>

            {/* Fixed navigation buttons */}
            <div className="px-6 pb-6 pt-4 border-t border-light flex-shrink-0">
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
                  className={`w-full bg-[#253663] hover:bg-[#253663]/90 text-white ${
                    !canProceedToNextStep() ? 'opacity-50' : ''
                  }`}
                >
                  Próximo
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </Card>
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
