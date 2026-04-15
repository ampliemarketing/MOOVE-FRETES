import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Card, CardContent, CardHeader } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Progress } from './ui/progress';
import { 
  CPFInput,
  PhoneInput,
  CEPInput,
  FileUpload,
  CNPJInput
} from './ui/enhanced-inputs';
import { 
  User, 
  MapPin, 
  Truck,
  Building,
  Upload,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Camera,
  FileText,
  Loader2
} from 'lucide-react';
import { supabase } from '@/utils/supabase/client';
import { toast } from 'sonner@2.0.3';
import logoMaisFrete from '../assets/logo-moovefretes.png';
import { VehicleTypeSelector } from './VehicleTypeSelector';
import { brazilianStates } from '../utils/brazil-locations';

interface CompleteProfileProps {
  userId: string;
  userType: 'caminhoneiro' | 'transportadora' | 'agenciador';
  onComplete: () => void;
}

type Step = 'personal' | 'address' | 'specific' | 'documents';

export function CompleteProfile({ userId, userType, onComplete }: CompleteProfileProps) {
  const [currentStep, setCurrentStep] = useState<Step>('personal');
  const [loading, setLoading] = useState(false);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null);

  // Dados pessoais
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
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

  const steps: { id: Step; label: string; icon: any }[] = [
    { id: 'personal', label: 'Dados Pessoais', icon: User },
    { id: 'address', label: 'Endereço', icon: MapPin },
    { id: 'specific', label: userType === 'caminhoneiro' ? 'Veículo' : 'Empresa', icon: userType === 'caminhoneiro' ? Truck : Building },
    { id: 'documents', label: 'Documentos', icon: Upload }
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  // Buscar dados do usuário autenticado
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.email) {
          console.log('📧 Email do Auth User:', user.email);
        }
      } catch (error) {
        console.error('Erro ao buscar dados do usuário:', error);
      }
    };
    
    fetchUserData();
  }, []);

  // Callback para receber dados do CEP
  const handleAddressData = (addressData: any) => {
    if (addressData) {
      setStreet(addressData.logradouro || '');
      setNeighborhood(addressData.bairro || '');
      setCity(addressData.localidade || '');
      setState(addressData.uf || '');
      toast.success('Endereço encontrado!');
    }
  };

  // Validações por step
  const isPersonalStepValid = () => {
    return name.trim().length > 0 && phone.replace(/\D/g, '').length >= 10;
  };

  const isAddressStepValid = () => {
    return cep.replace(/\D/g, '').length === 8 && 
           street.trim().length > 0 && 
           number.trim().length > 0 &&
           city.trim().length > 0 &&
           state.trim().length > 0;
  };

  const isSpecificStepValid = () => {
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

  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 'personal':
        return isPersonalStepValid();
      case 'address':
        return isAddressStepValid();
      case 'specific':
        return isSpecificStepValid();
      case 'documents':
        return true; // Documentos são opcionais
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (!canProceedToNextStep()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const currentIndex = steps.findIndex(s => s.id === currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1].id);
    }
  };

  const handleBack = () => {
    const currentIndex = steps.findIndex(s => s.id === currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].id);
    }
  };

  const handleSubmit = async () => {
    if (!canProceedToNextStep()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);

    try {
      console.log('');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('💾 CompleteProfile - SALVANDO TUDO (ETAPA 2)');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('🆔 User ID:', userId);
      console.log('🎯 User Type:', userType);
      console.log('');

      // Buscar email do Auth User
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const userEmail = authUser?.email || '';

      if (!userEmail) {
        throw new Error('Email do usuário não encontrado');
      }

      console.log('📧 Email recuperado:', userEmail);

      // ✅ ETAPA 1: Upload de avatar (se houver)
      let avatarPath: string | undefined = undefined;
      
      if (profilePhoto) {
        console.log('📸 Fazendo upload do avatar...');
        try {
          const { uploadAvatar } = await import('../utils/storage-helper');
          const result = await uploadAvatar(userId, profilePhoto);
          
          if (result.success && result.path) {
            avatarPath = result.path;
            console.log('✅ Avatar uploadado:', avatarPath);
          } else {
            console.error('❌ Erro ao fazer upload do avatar:', result.error);
            toast.warning('Erro ao fazer upload da foto - continuando...');
          }
        } catch (error) {
          console.error('❌ Exceção ao fazer upload do avatar:', error);
          toast.warning('Erro ao processar foto - continuando...');
        }
      }

      // ✅ ETAPA 2: Upload de documentos (se houver)
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
          console.log(`📄 Fazendo upload de ${doc.name}...`);
          try {
            const { uploadDocument } = await import('../utils/storage-helper');
            const result = await uploadDocument(userId, doc.file, doc.key);
            
            if (result.success && result.path) {
              documentPaths[doc.key] = result.path;
              console.log(`✅ ${doc.name} uploadado:`, result.path);
            } else {
              console.error(`❌ Erro ao fazer upload de ${doc.name}:`, result.error);
            }
          } catch (error) {
            console.error(`❌ Exceção ao fazer upload de ${doc.name}:`, error);
          }
        }
      }

      // ✅ ETAPA 3: Atualizar Profile completo (AGORA!)
      console.log('📝 Atualizando profile completo no Supabase...');
      
      const profileData = {
        email: userEmail,
        user_type: userType,
        name: name.trim(),
        phone: phone.replace(/\D/g, ''),
        cpf: userType === 'caminhoneiro' ? cpf.replace(/\D/g, '') : '',
        cnpj: userType !== 'caminhoneiro' ? cnpj.replace(/\D/g, '') : '',
        city: city.trim(),
        state: state.trim(),
        avatar_url: avatarPath || '',
        verification_status: 'pending',
        updated_at: new Date().toISOString()
      };

      console.log('');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('📋 DADOS DO PROFILE (tabela profiles)');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('🆔 User ID:', userId);
      console.log('📧 Email:', profileData.email);
      console.log('👤 Tipo de Usuário:', profileData.user_type);
      console.log('📝 Nome:', profileData.name);
      console.log('📱 Telefone:', profileData.phone);
      console.log('🏙️ Cidade:', profileData.city);
      console.log('🗺️ Estado:', profileData.state);
      console.log('🆔 CPF:', profileData.cpf || '(vazio)');
      console.log('🏢 CNPJ:', profileData.cnpj || '(vazio)');
      console.log('🖼️ Avatar:', profileData.avatar_url || '(sem avatar)');
      console.log('✅ Status de Verificação:', profileData.verification_status);
      console.log('═══════════════════════════════════════════════════════════');
      console.log('');

      const { error: profileError } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('id', userId);

      if (profileError) {
        console.error('❌ Erro ao criar profile:', profileError);
        throw new Error('Erro ao criar perfil: ' + profileError.message);
      }

      console.log('✅ Profile atualizado com sucesso');

      // ✅ ETAPA 4: Criar registro específico (Driver ou Company)
      if (userType === 'caminhoneiro') {
        console.log('🚚 Criando registro de motorista...');
        
        const driverData = {
          user_id: userId, // ✅ CORRIGIDO: snake_case para Postgres
          name: name.trim(),
          cpf: cpf.replace(/\D/g, ''),
          birth_date: birthDate || null, // ✅ CORRIGIDO: snake_case
          phone: phone.replace(/\D/g, ''),
          cnh: cnh.trim(),
          cnh_category: cnhCategory.trim(), // ✅ CORRIGIDO: snake_case
          cnh_expiry: cnhValidity || null, // ✅ CORRIGIDO: snake_case
          address: {
            cep: cep.replace(/\D/g, ''),
            street: street.trim(),
            number: number.trim(),
            complement: complement.trim(),
            neighborhood: neighborhood.trim(),
            city: city.trim(),
            state: state.trim()
          },
          vehicle_plate: vehiclePlate.trim(), // ✅ CORRIGIDO: snake_case
          vehicle_model: vehicleModel.trim(), // ✅ CORRIGIDO: snake_case
          vehicle_year: vehicleYear.trim(), // ✅ CORRIGIDO: snake_case
          vehicle_types: vehicleTypes, // ✅ CORRIGIDO: snake_case
          body_types: bodyTypes, // ✅ CORRIGIDO: snake_case
          document_paths: documentPaths, // ✅ CORRIGIDO: snake_case
          available: true,
          rating: 0,
          completed_trips: 0, // ✅ CORRIGIDO: snake_case
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        console.log('');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('🚚 DADOS DO MOTORISTA (tabela drivers)');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('🆔 User ID:', driverData.user_id);
        console.log('📝 Nome:', driverData.name);
        console.log('🆔 CPF:', driverData.cpf);
        console.log('🎂 Data Nascimento:', driverData.birth_date || '(não informada)');
        console.log('📱 Telefone:', driverData.phone);
        console.log('🪪 CNH:', driverData.cnh);
        console.log('📋 Categoria CNH:', driverData.cnh_category);
        console.log('📅 Validade CNH:', driverData.cnh_expiry || '(não informada)');
        console.log('📍 Endereço Completo:', JSON.stringify(driverData.address, null, 2));
        console.log('🚗 Placa Veículo:', driverData.vehicle_plate);
        console.log('🚙 Modelo Veículo:', driverData.vehicle_model || '(não informado)');
        console.log('📅 Ano Veículo:', driverData.vehicle_year || '(não informado)');
        console.log('🚚 Tipos de Veículo:', driverData.vehicle_types.length > 0 ? driverData.vehicle_types.join(', ') : '(nenhum)');
        console.log('📦 Tipos de Carroceria:', driverData.body_types.length > 0 ? driverData.body_types.join(', ') : '(nenhum)');
        console.log('📄 Documentos:', Object.keys(driverData.document_paths).length > 0 ? Object.keys(driverData.document_paths).join(', ') : '(nenhum)');
        console.log('✅ Disponível:', driverData.available);
        console.log('⭐ Rating:', driverData.rating);
        console.log('🎯 Viagens Completas:', driverData.completed_trips);
        console.log('═══════════════════════════════════════════════════════════');
        console.log('');

        const { error: driverError } = await supabase
          .from('drivers')
          .insert(driverData);

        if (driverError) {
          console.error('❌ Erro ao criar registro de motorista:', driverError);
          throw new Error('Erro ao salvar dados do motorista: ' + driverError.message);
        }

        console.log('✅ Registro de motorista criado');
        
      } else {
        console.log('🏢 Criando registro de empresa...');
        
        const companyData = {
          user_id: userId, // ✅ CORRIGIDO: snake_case para Postgres
          company_name: companyName.trim(), // ✅ CORRIGIDO: snake_case
          cnpj: cnpj.replace(/\D/g, ''),
          trading_name: tradeName.trim() || companyName.trim(), // ✅ CORRIGIDO: snake_case
          company_type: userType, // ✅ CORRIGIDO: snake_case
          rntrc: rntrc.trim() || null,
          phone: phone.replace(/\D/g, ''),
          address: {
            cep: cep.replace(/\D/g, ''),
            street: street.trim(),
            number: number.trim(),
            complement: complement.trim(),
            neighborhood: neighborhood.trim(),
            city: city.trim(),
            state: state.trim()
          },
          representative_name: representativeName.trim(), // ✅ CORRIGIDO: snake_case
          representative_cpf: representativeCpf.replace(/\D/g, ''), // ✅ CORRIGIDO: snake_case
          document_paths: documentPaths, // ✅ CORRIGIDO: snake_case
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        console.log('');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('🏢 DADOS DA EMPRESA (tabela companies)');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('🆔 User ID:', companyData.user_id);
        console.log('🏢 Razão Social:', companyData.company_name);
        console.log('🏪 Nome Fantasia:', companyData.trading_name);
        console.log('🆔 CNPJ:', companyData.cnpj);
        console.log('📋 Tipo de Empresa:', companyData.company_type);
        console.log('🚛 RNTRC:', companyData.rntrc || '(não informado)');
        console.log('📱 Telefone:', companyData.phone);
        console.log('📍 Endereço Completo:', JSON.stringify(companyData.address, null, 2));
        console.log('👤 Representante Legal:', companyData.representative_name);
        console.log('🆔 CPF Representante:', companyData.representative_cpf);
        console.log('📄 Documentos:', Object.keys(companyData.document_paths).length > 0 ? Object.keys(companyData.document_paths).join(', ') : '(nenhum)');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('');

        const { error: companyError } = await supabase
          .from('companies')
          .insert(companyData); // ✅ CORRIGIDO: insert ao invés de upsert

        if (companyError) {
          console.error('❌ Erro ao criar registro de empresa:', companyError);
          throw new Error('Erro ao salvar dados da empresa: ' + companyError.message);
        }

        console.log('✅ Registro de empresa criado');
      }

      console.log('');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('✅ CADASTRO COMPLETO - TUDO SALVO COM SUCESSO!');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('');

      toast.success('Cadastro completo! Bem-vindo ao MooveFretes!');
      
      setLoading(false);
      
      // Aguardar 2 segundos para garantir que o Supabase processou os dados antes do reload
      console.log('⏳ Aguardando 2s antes do reload para garantir consistência dos dados...');
      setTimeout(() => {
        console.log('🔄 Recarregando aplicação...');
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error('❌ Erro ao completar perfil:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao salvar dados';
      toast.error(errorMessage);
      setLoading(false);
    }
  };

  // Renderizar step atual
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'personal':
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
                    <Camera className="w-10 h-10 mx-auto mb-2 text-gray-400" />
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

            {userType === 'caminhoneiro' && (
              <>
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
              </>
            )}
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
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cnhValidity">
                  Validade CNH <span className="text-gray-400 text-xs">(opcional)</span>
                </Label>
                <Input
                  id="cnhValidity"
                  type="date"
                  value={cnhValidity}
                  onChange={(e) => setCnhValidity(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vehiclePlate">
                    Placa do Veículo <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="vehiclePlate"
                    value={vehiclePlate}
                    onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                    placeholder="ABC-1234"
                    required
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
                    placeholder="2020"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="vehicleModel">
                  Modelo do Veículo <span className="text-gray-400 text-xs">(opcional)</span>
                </Label>
                <Input
                  id="vehicleModel"
                  value={vehicleModel}
                  onChange={(e) => setVehicleModel(e.target.value)}
                  placeholder="Ex: Mercedes-Benz Actros"
                />
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
              <CNPJInput
                value={cnpj}
                onChange={setCnpj}
                label="CNPJ"
                required
              />

              <div className="space-y-2">
                <Label htmlFor="companyName">
                  Razão Social <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Nome registrado da empresa"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tradeName">
                  Nome Fantasia <span className="text-gray-400 text-xs">(opcional)</span>
                </Label>
                <Input
                  id="tradeName"
                  value={tradeName}
                  onChange={(e) => setTradeName(e.target.value)}
                  placeholder="Nome comercial da empresa"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rntrc">
                  RNTRC <span className="text-gray-400 text-xs">(opcional)</span>
                </Label>
                <Input
                  id="rntrc"
                  value={rntrc}
                  onChange={(e) => setRntrc(e.target.value)}
                  placeholder="Registro Nacional de Transportadores"
                />
              </div>

              <div className="border-t pt-6 mt-6">
                <h3 className="font-medium mb-4">Representante Legal</h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="representativeName">
                      Nome Completo <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="representativeName"
                      value={representativeName}
                      onChange={(e) => setRepresentativeName(e.target.value)}
                      placeholder="Nome do representante legal"
                      required
                    />
                  </div>

                  <CPFInput
                    value={representativeCpf}
                    onChange={setRepresentativeCpf}
                    label="CPF do Representante"
                    required
                  />
                </div>
              </div>
            </div>
          );
        }

      case 'documents':
        if (userType === 'caminhoneiro') {
          return (
            <div className="space-y-6">
              <FileUpload
                label="CNH (Frente e Verso)"
                accept="image/*,.pdf"
                onFileSelect={setCnhDoc}
                file={cnhDoc}
              />

              <FileUpload
                label="CRLV (Documento do Veículo)"
                accept="image/*,.pdf"
                onFileSelect={setVehicleDoc}
                file={vehicleDoc}
              />
            </div>
          );
        } else {
          return (
            <div className="space-y-6">
              <FileUpload
                label="Cartão CNPJ"
                accept="image/*,.pdf"
                onFileSelect={setCnpjDoc}
                file={cnpjDoc}
              />

              <FileUpload
                label="Contrato Social"
                accept="image/*,.pdf"
                onFileSelect={setContractDoc}
                file={contractDoc}
              />
            </div>
          );
        }

      default:
        return null;
    }
  };

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

            <Card
              className="border-0"
              style={{
                boxShadow: [
                  '0 0 0 1px rgba(29,52,99,0.06)',
                  '0 8px 30px 0px rgba(29,52,99,0.14)',
                  '0 20px 60px 0px rgba(29,52,99,0.10)',
                  '0 -8px 30px 0px rgba(29,52,99,0.14)',
                  '0 -20px 60px 0px rgba(29,52,99,0.10)',
                  '-10px 0 24px 0px rgba(29,52,99,0.08)',
                  '10px 0 24px 0px rgba(29,52,99,0.08)',
                ].join(', '),
              }}
            >
              <CardHeader className="border-b border-light">
              <div className="space-y-4">
                <div className="text-center">
                  <h1 className="text-xl text-foreground">Complete seu Perfil</h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    Passo {currentStepIndex + 1} de {steps.length}
                  </p>
                </div>

                {/* Progress Bar */}
                <Progress value={progress} className="h-2" />

                {/* Step Indicators */}
                <div className="flex justify-between">
                  {steps.map((step, index) => {
                    const Icon = step.icon;
                    const isActive = currentStep === step.id;
                    const isCompleted = index < currentStepIndex;
                    
                    return (
                      <div
                        key={step.id}
                        className={`flex flex-col items-center gap-1 ${
                          isActive ? 'text-[#253663]' : isCompleted ? 'text-green-600' : 'text-gray-400'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isActive ? 'bg-[#253663] text-white' : isCompleted ? 'bg-green-600 text-white' : 'bg-gray-200'
                        }`}>
                          {isCompleted ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                        </div>
                        <span className="text-xs hidden sm:block">{step.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6">
              {renderCurrentStep()}

              {/* Navigation Buttons */}
              <div className="flex gap-3 mt-8">
                {currentStepIndex > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    disabled={loading}
                    className="flex-1"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar
                  </Button>
                )}

                {currentStepIndex < steps.length - 1 ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    disabled={!canProceedToNextStep()}
                    className="flex-1 bg-[#253663] hover:bg-[#1a2847] text-white"
                  >
                    Próximo
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex-1 bg-[#253663] hover:bg-[#1a2847] text-white"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Finalizar Cadastro
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
        </div>
      </div>
    </div>
  );
}