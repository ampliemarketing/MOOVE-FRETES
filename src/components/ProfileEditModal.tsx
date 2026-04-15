import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, User, Building, MapPin, Phone, Mail, FileText } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';
import { getSupabaseClient } from '../utils/supabase/client';
import { database } from '../utils/database';
import { useApp } from './contexts/AppContext';
import { AvatarUpload } from './AvatarUpload';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  userData: any;
  companyDetails?: any;
  onSave: (updatedData: any) => void;
}

export function ProfileEditModal({ 
  isOpen, 
  onClose, 
  userData, 
  companyDetails,
  onSave 
}: ProfileEditModalProps) {
  const { state, actions } = useApp();
  const [formData, setFormData] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [avatarUrl, setAvatarUrl] = useState<string>('');

  // Inicializar formulário com dados atuais
  useEffect(() => {
    if (userData) {
      // Inicializar avatar
      setAvatarUrl(userData.avatar || userData.professionalInfo?.profileImage || companyDetails?.logo || '');
      
      if (userData.userType === 'caminhoneiro') {
        setFormData({
          // Dados editáveis
          nome: userData.name || '',
          telefone: userData.phone || '',
          // ❌ Email NÃO é editável - é a credencial de autenticação
          bio: userData.bio || '',
          
          // Endereço
          cep: userData.professionalInfo?.address?.cep || '',
          endereco: userData.professionalInfo?.address?.street || '',
          numero: userData.professionalInfo?.address?.number || '',
          complemento: userData.professionalInfo?.address?.complement || '',
          bairro: userData.professionalInfo?.address?.neighborhood || '',
          cidade: userData.professionalInfo?.address?.city || '',
          estado: userData.professionalInfo?.address?.state || '',
          
          // Veículo (campos editáveis)
          placaVeiculo: userData.professionalInfo?.vehiclePlate || '',
          marcaModelo: userData.professionalInfo?.vehicleModel || '',
          anoVeiculo: userData.professionalInfo?.vehicleYear || '',
          
          // Documentos (NÃO EDITÁVEIS - apenas para exibição)
          cpf: userData.professionalInfo?.cpf || '',
          rg: userData.professionalInfo?.rg || '',
          dataNascimento: userData.professionalInfo?.birthDate || '',
          cnh: userData.professionalInfo?.cnh || '',
          categoriaCNH: userData.professionalInfo?.cnhCategory || '',
          validadeCNH: userData.professionalInfo?.cnhExpiry || '',
          rntrc: userData.professionalInfo?.rntrc || '',
          validadeRNTRC: userData.professionalInfo?.rntrcExpiry || '',
          renavam: userData.professionalInfo?.renavam || '',
          anttVeiculo: userData.professionalInfo?.anttVehicle || '',
        });
      } else {
        // Empresa
        setFormData({
          // Dados editáveis
          nomeFantasia: companyDetails?.name || '',
          telefone: companyDetails?.phone || '',
          // ❌ Email NÃO é editável - é a credencial de autenticação (apenas exibição)
          emailCorporativo: companyDetails?.corporateEmail || companyDetails?.email || '',
          descricao: companyDetails?.description || '',
          
          // Endereço
          cep: companyDetails?.address?.cep || '',
          endereco: companyDetails?.address?.street || '',
          numero: companyDetails?.address?.number || '',
          complemento: companyDetails?.address?.complement || '',
          bairro: companyDetails?.address?.neighborhood || '',
          cidade: companyDetails?.address?.city || '',
          estado: companyDetails?.address?.state || '',
          
          // Representante Legal (campos editáveis)
          representanteNome: companyDetails?.representativeName || '',
          representanteTelefone: companyDetails?.representativePhone || '',
          representanteEmail: companyDetails?.representativeEmail || '',
          representanteCargo: companyDetails?.representativeRole || '',
          
          // Documentos (NÃO EDITÁVEIS)
          razaoSocial: companyDetails?.companyName || '',
          cnpj: companyDetails?.cnpj || '',
          inscricaoEstadual: companyDetails?.stateRegistration || '',
          inscricaoMunicipal: companyDetails?.municipalRegistration || '',
          representanteCpf: companyDetails?.representativeCpf || '',
          representanteRg: companyDetails?.representativeRg || '',
          representanteCnh: companyDetails?.representativeCnh || '',
          rntrc: companyDetails?.rntrc || '',
          validadeRNTRC: companyDetails?.rntrcExpiry || '',
        });
      }
    }
  }, [userData, companyDetails]);

  if (!isOpen) return null;

  const handleChange = (field: string, value: string) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
    // Limpar erro do campo quando usuário começar a editar
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleAvatarUpdate = async (newAvatarUrl: string) => {
    setAvatarUrl(newAvatarUrl);
    console.log('✅ [ProfileEditModal] Avatar atualizado:', newAvatarUrl);
    
    // Atualizar contexto global imediatamente
    if (state.user) {
      const updatedUser = {
        ...state.user,
        avatar: newAvatarUrl,
      };
      actions.setUser(updatedUser);
      
      // Persistir no localStorage também (cache)
      try {
        localStorage.setItem('maisfrete-user', JSON.stringify(updatedUser));
        console.log('✅ [ProfileEditModal] Avatar sincronizado no localStorage');
      } catch (error) {
        console.error('❌ [ProfileEditModal] Erro ao salvar no localStorage:', error);
      }
    }
    
    // Atualizar userData local para refletir mudança imediatamente
    // (sem precisar fechar o modal)
    if (userData) {
      userData.avatar = newAvatarUrl;
    }
    
    // Toast de confirmação
    toast.success('Foto de perfil atualizada!', {
      description: 'Seu avatar foi sincronizado em todo o sistema.',
      duration: 3000,
    });
    
    // Disparar evento customizado para recarregar dados em outras telas
    window.dispatchEvent(new CustomEvent('user-profile-updated', { 
      detail: { userId: userData.id } 
    }));
    
    // Forçar um pequeno delay para garantir que o contexto foi atualizado
    await new Promise(resolve => setTimeout(resolve, 100));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Validações básicas
    if (!formData.nome && !formData.nomeFantasia) {
      newErrors.nome = 'Nome é obrigatório';
    }

    // ❌ Email NÃO é mais validado pois não é editável

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('Corrija os erros antes de salvar');
      return;
    }

    setIsSaving(true);

    try {
      const supabase = getSupabaseClient();

      if (userData.userType === 'caminhoneiro') {
        // Atualizar motorista
        const updatedDriver = {
          name: formData.nome || null,
          phone: formData.telefone || null,
          rg: formData.rg || null,
          birth_date: formData.dataNascimento || null,
          cnh: formData.cnh || null,
          cnh_category: formData.categoriaCNH || undefined, // ✅ NOT NULL no banco - chave correta é categoriaCNH, omitir se vazio
          cnh_expiry: formData.validadeCNH || null, // ✅ Chave correta é validadeCNH
          rntrc: formData.rntrc || null,
          rntrc_expiry: formData.validadeRNTRC || null, // ✅ Chave correta é validadeRNTRC
          // ✅ FIX: Endereço é JSONB, salvar como objeto
          address: {
            cep: formData.cep || '',
            street: formData.endereco || '',
            number: formData.numero || '',
            complement: formData.complemento || '',
            neighborhood: formData.bairro || '',
            city: formData.cidade || '',
            state: formData.estado || ''
          },
          // Veículo
          vehicle_plate: formData.placaVeiculo || null,
          vehicle_model: formData.marcaModelo || null,
          vehicle_year: formData.anoVeiculo || null,
          renavam: formData.renavam || null,
          antt_vehicle: formData.antt || null,
          updated_at: new Date().toISOString(),
        };

        // Atualizar no Supabase (drivers)
        const { error: driverError } = await supabase
          .from('drivers')
          .update(updatedDriver)
          .eq('user_id', userData.id);

        if (driverError) throw driverError;

        // ✅ Atualizar na tabela profiles (PRINCIPAL)
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            name: formData.nome || null,
            phone: formData.telefone || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userData.id);

        if (profileError) {
          console.error('❌ Erro ao atualizar profiles:', profileError);
          // Não lançar erro para não bloquear o fluxo
        }

        // Atualizar na tabela profiles
        const { error: userError } = await supabase
          .from('profiles')
          .update({
            name: formData.nome || null,
            phone: formData.telefone || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userData.id);

        if (userError) throw userError;

        // Atualizar no LocalStorage
        const driverResponse = await database.drivers.getByUserId(userData.id);
        if (driverResponse.success && driverResponse.data) {
          await database.drivers.update(driverResponse.data.id, {
            name: formData.nome,
            phone: formData.telefone,
            address: {
              cep: formData.cep,
              street: formData.endereco,
              number: formData.numero,
              complement: formData.complemento,
              neighborhood: formData.bairro,
              city: formData.cidade,
              state: formData.estado,
            },
            vehiclePlate: formData.placaVeiculo,
            vehicleModel: formData.marcaModelo,
            vehicleYear: formData.anoVeiculo,
          });
        }

        // ✅ Atualizar contexto global (AppContext) com TODOS os campos alterados
        if (state.user) {
          const updatedUser = {
            ...state.user,
            name: formData.nome,
            phone: formData.telefone,
            email: formData.email || state.user.email,
            avatar: avatarUrl || state.user.avatar, // Incluir avatar atualizado
            location: formData.cidade && formData.estado 
              ? `${formData.cidade}, ${formData.estado}`
              : state.user.location,
          };
          
          actions.setUser(updatedUser);
          
          // Persistir no localStorage também (cache)
          try {
            localStorage.setItem('maisfrete-user', JSON.stringify(updatedUser));
            console.log('✅ [ProfileEditModal] Dados do usuário sincronizados no AppContext e localStorage');
          } catch (error) {
            console.error('❌ [ProfileEditModal] Erro ao salvar no localStorage:', error);
          }
        }

        toast.success('Perfil atualizado com sucesso!');
        
        // Disparar evento customizado para recarregar dados
        window.dispatchEvent(new CustomEvent('user-profile-updated', { 
          detail: { userId: userData.id } 
        }));
        
        onSave(formData);
        onClose();
      } else {
        // Atualizar empresa
        const updatedCompany = {
          company_name: formData.razaoSocial || null,
          trading_name: formData.nomeFantasia || null,
          phone: formData.telefone || null,
          corporate_email: formData.emailCorporativo || null,
          description: formData.descricao || null,
          state_registration: formData.inscricaoEstadual || null,
          municipal_registration: formData.inscricaoMunicipal || null,
          // Endereço como JSONB
          address: {
            cep: formData.cep || '',
            street: formData.endereco || '',
            number: formData.numero || '',
            complement: formData.complemento || '',
            neighborhood: formData.bairro || '',
            city: formData.cidade || '',
            state: formData.estado || '',
          },
          // Representante Legal
          representative_name: formData.representanteNome || null,
          representative_cpf: formData.representanteCpf || null,
          representative_rg: formData.representanteRg || null,
          representative_phone: formData.representanteTelefone || null,
          representative_email: formData.representanteEmail || null,
          representative_role: formData.representanteCargo || null,
          representative_cnh: formData.representanteCnh || null,
          // Documentos profissionais (se transportadora)
          rntrc: formData.rntrc || null,
          rntrc_expiry: formData.validadeRntrc || null,
          updated_at: new Date().toISOString(),
        };

        // Atualizar no Supabase (companies)
        const { error: companyError } = await supabase
          .from('companies')
          .update(updatedCompany)
          .eq('user_id', userData.id);

        if (companyError) throw companyError;

        // ✅ Atualizar na tabela profiles (PRINCIPAL) - SEMPRE sincronizar o nome!
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            name: formData.nomeFantasia || null, // ✅ SINCRONIZAR nome da empresa
            phone: formData.telefone || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userData.id);

        if (profileError) {
          console.error('❌ Erro ao atualizar profiles:', profileError);
          // Não lançar erro para não bloquear o fluxo
        } else {
          console.log('✅ [ProfileEditModal] profiles.name sincronizado com:', formData.nomeFantasia);
        }

        // Atualizar na tabela profiles
        const { error: userError } = await supabase
          .from('profiles')
          .update({
            name: formData.nomeFantasia || null,
            phone: formData.telefone || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userData.id);

        if (userError) throw userError;

        // Atualizar no LocalStorage
        const companyResponse = await database.companies.getByUserId(userData.id);
        if (companyResponse.success && companyResponse.data) {
          await database.companies.update(companyResponse.data.id, {
            name: formData.nomeFantasia,
            phone: formData.telefone,
            email: formData.emailCorporativo,
            corporateEmail: formData.emailCorporativo,
            description: formData.descricao,
            address: {
              cep: formData.cep,
              street: formData.endereco,
              number: formData.numero,
              complement: formData.complemento,
              neighborhood: formData.bairro,
              city: formData.cidade,
              state: formData.estado,
            },
            representativeName: formData.representanteNome,
            representativePhone: formData.representanteTelefone,
            representativeEmail: formData.representanteEmail,
            representativeRole: formData.representanteCargo,
          });
        }

        // ✅ Atualizar contexto global (AppContext) com TODOS os campos alterados
        if (state.user) {
          const updatedUser = {
            ...state.user,
            name: formData.nomeFantasia,
            phone: formData.telefone,
            email: formData.emailCorporativo || state.user.email,
            avatar: avatarUrl || state.user.avatar, // Incluir avatar/logo atualizado
            company: formData.nomeFantasia, // Nome da empresa
            location: formData.cidade && formData.estado 
              ? `${formData.cidade}, ${formData.estado}`
              : state.user.location,
          };
          
          // 🔥 LIMPAR CACHE ANTIGO PRIMEIRO
          localStorage.removeItem('maisfrete-user');
          console.log('🗑️ [ProfileEditModal] Cache antigo limpo!');
          
          actions.setUser(updatedUser);
          
          // Persistir no localStorage também (cache)
          try {
            localStorage.setItem('maisfrete-user', JSON.stringify(updatedUser));
            console.log('✅ [ProfileEditModal] Dados da empresa sincronizados no AppContext e localStorage');
            console.log('📝 [ProfileEditModal] Nome atualizado para:', formData.nomeFantasia);
          } catch (error) {
            console.error('❌ [ProfileEditModal] Erro ao salvar no localStorage:', error);
          }
          
          // 🔥 FORÇAR RELOAD COMPLETO DA PÁGINA PARA GARANTIR ATUALIZAÇÃO
          setTimeout(() => {
            console.log('🔄 [ProfileEditModal] Recarregando página para aplicar mudanças...');
            window.location.reload();
          }, 500);
        }

        toast.success('Perfil da empresa atualizado com sucesso!');
        
        // Disparar evento customizado para recarregar dados
        window.dispatchEvent(new CustomEvent('user-profile-updated', { 
          detail: { userId: userData.id } 
        }));
        
        onSave(formData);
        onClose();
      }
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      toast.error('Erro ao salvar perfil. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-primary text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {userData.userType === 'caminhoneiro' ? (
              <User className="w-6 h-6" />
            ) : (
              <Building className="w-6 h-6" />
            )}
            <h2 className="text-xl font-semibold">Editar Perfil</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Upload de Avatar */}
          <div className="mb-6 p-6 bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl">
            <h3 className="text-center font-semibold text-lg mb-4 text-gray-700">
              Foto de Perfil
            </h3>
            <AvatarUpload
              currentAvatar={avatarUrl}
              userId={userData.id}
              onAvatarUpdate={handleAvatarUpdate}
              userType={userData.userType}
            />
          </div>

          {/* Aviso sobre CPF/CNPJ */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Atenção</p>
              <p className="text-blue-700">
                Por segurança, CPF, CNPJ e Email não podem ser alterados. Todos os demais campos são editáveis.
              </p>
            </div>
          </div>

          {userData.userType === 'caminhoneiro' ? (
            /* FORMULÁRIO MOTORISTA */
            <div className="space-y-6">
              {/* Dados Pessoais */}
              <div>
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2 text-primary">
                  <User className="w-5 h-5" />
                  Dados Pessoais
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="nome">Nome Completo *</Label>
                    <Input
                      id="nome"
                      value={formData.nome || ''}
                      onChange={(e) => handleChange('nome', e.target.value)}
                      className={errors.nome ? 'border-red-500' : ''}
                    />
                    {errors.nome && (
                      <p className="text-xs text-red-500 mt-1">{errors.nome}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input
                      id="telefone"
                      value={formData.telefone || ''}
                      onChange={(e) => handleChange('telefone', e.target.value)}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>

                {/* Documentos Pessoais - EDITÁVEIS */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cpf">CPF</Label>
                    <Input
                      id="cpf"
                      value={formData.cpf || ''}
                      disabled
                      className="bg-gray-100"
                    />
                    <p className="text-xs text-gray-500 mt-1">Não editável</p>
                  </div>
                  <div>
                    <Label htmlFor="rg">RG</Label>
                    <Input
                      id="rg"
                      value={formData.rg || ''}
                      onChange={(e) => handleChange('rg', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="dataNascimento">Data de Nascimento</Label>
                    <Input
                      id="dataNascimento"
                      type="date"
                      value={formData.dataNascimento || ''}
                      onChange={(e) => handleChange('dataNascimento', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cnh">CNH</Label>
                    <Input
                      id="cnh"
                      value={formData.cnh || ''}
                      onChange={(e) => handleChange('cnh', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="categoriaCnh">Categoria CNH</Label>
                    <Input
                      id="categoriaCnh"
                      value={formData.categoriaCNH || ''}
                      onChange={(e) => handleChange('categoriaCNH', e.target.value)}
                      placeholder="Ex: D, E"
                    />
                  </div>
                  <div>
                    <Label htmlFor="validadeCnh">Validade CNH</Label>
                    <Input
                      id="validadeCnh"
                      type="date"
                      value={formData.validadeCNH || ''}
                      onChange={(e) => handleChange('validadeCNH', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="rntrc">RNTRC</Label>
                    <Input
                      id="rntrc"
                      value={formData.rntrc || ''}
                      onChange={(e) => handleChange('rntrc', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="validadeRntrc">Validade RNTRC</Label>
                    <Input
                      id="validadeRntrc"
                      type="date"
                      value={formData.validadeRNTRC || ''}
                      onChange={(e) => handleChange('validadeRNTRC', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Endereço */}
              <div>
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2 text-primary">
                  <MapPin className="w-5 h-5" />
                  Endereço
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="cep">CEP</Label>
                    <Input
                      id="cep"
                      value={formData.cep || ''}
                      onChange={(e) => handleChange('cep', e.target.value)}
                      placeholder="00000-000"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="endereco">Logradouro</Label>
                    <Input
                      id="endereco"
                      value={formData.endereco || ''}
                      onChange={(e) => handleChange('endereco', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="numero">Número</Label>
                    <Input
                      id="numero"
                      value={formData.numero || ''}
                      onChange={(e) => handleChange('numero', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="complemento">Complemento</Label>
                    <Input
                      id="complemento"
                      value={formData.complemento || ''}
                      onChange={(e) => handleChange('complemento', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="bairro">Bairro</Label>
                    <Input
                      id="bairro"
                      value={formData.bairro || ''}
                      onChange={(e) => handleChange('bairro', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cidade">Cidade</Label>
                    <Input
                      id="cidade"
                      value={formData.cidade || ''}
                      onChange={(e) => handleChange('cidade', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="estado">Estado</Label>
                    <Input
                      id="estado"
                      value={formData.estado || ''}
                      onChange={(e) => handleChange('estado', e.target.value)}
                      placeholder="UF"
                      maxLength={2}
                    />
                  </div>
                </div>
              </div>

              {/* Veículo */}
              <div>
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2 text-primary">
                  <FileText className="w-5 h-5" />
                  Dados do Veículo
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="placaVeiculo">Placa</Label>
                    <Input
                      id="placaVeiculo"
                      value={formData.placaVeiculo || ''}
                      onChange={(e) => handleChange('placaVeiculo', e.target.value)}
                      placeholder="ABC-1234"
                    />
                  </div>
                  <div>
                    <Label htmlFor="marcaModelo">Marca/Modelo</Label>
                    <Input
                      id="marcaModelo"
                      value={formData.marcaModelo || ''}
                      onChange={(e) => handleChange('marcaModelo', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="anoVeiculo">Ano</Label>
                    <Input
                      id="anoVeiculo"
                      value={formData.anoVeiculo || ''}
                      onChange={(e) => handleChange('anoVeiculo', e.target.value)}
                      placeholder="2024"
                    />
                    <Label htmlFor="anoVeiculo">Ano</Label>
                    <Input
                      id="anoVeiculo"
                      value={formData.anoVeiculo || ''}
                      onChange={(e) => handleChange('anoVeiculo', e.target.value)}
                      placeholder="2024"
                    />
                  </div>
                  <div>
                    <Label htmlFor="renavam">RENAVAM</Label>
                    <Input
                      id="renavam"
                      value={formData.renavam || ''}
                      onChange={(e) => handleChange('renavam', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="antt">ANTT</Label>
                    <Input
                      id="antt"
                      value={formData.anttVeiculo || ''}
                      onChange={(e) => handleChange('anttVeiculo', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* FORMULÁRIO EMPRESA */
            <div className="space-y-6">
              {/* Dados da Empresa */}
              <div>
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2 text-primary">
                  <Building className="w-5 h-5" />
                  Dados da Empresa
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="nomeFantasia">Nome Fantasia *</Label>
                    <Input
                      id="nomeFantasia"
                      value={formData.nomeFantasia || ''}
                      onChange={(e) => handleChange('nomeFantasia', e.target.value)}
                      className={errors.nomeFantasia ? 'border-red-500' : ''}
                    />
                  </div>
                  <div>
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input
                      id="telefone"
                      value={formData.telefone || ''}
                      onChange={(e) => handleChange('telefone', e.target.value)}
                      placeholder="(00) 0000-0000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="emailCorporativo">Email Corporativo</Label>
                    <Input
                      id="emailCorporativo"
                      type="email"
                      value={formData.emailCorporativo || ''}
                      disabled
                      className="bg-gray-100"
                    />
                    <p className="text-xs text-gray-500 mt-1">❌ Não editável - credencial de autenticação</p>
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="descricao">Descrição/Sobre</Label>
                    <Textarea
                      id="descricao"
                      value={formData.descricao || ''}
                      onChange={(e) => handleChange('descricao', e.target.value)}
                      rows={3}
                      placeholder="Descreva sua empresa..."
                    />
                  </div>
                </div>

                {/* Documentos da Empresa */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="razaoSocial">Razão Social</Label>
                    <Input
                      id="razaoSocial"
                      value={formData.razaoSocial || ''}
                      onChange={(e) => handleChange('razaoSocial', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cnpj">CNPJ</Label>
                    <Input
                      id="cnpj"
                      value={formData.cnpj || ''}
                      disabled
                      className="bg-gray-100"
                    />
                    <p className="text-xs text-gray-500 mt-1">Não editável</p>
                  </div>
                  <div>
                    <Label htmlFor="inscricaoEstadual">Inscrição Estadual</Label>
                    <Input
                      id="inscricaoEstadual"
                      value={formData.inscricaoEstadual || ''}
                      onChange={(e) => handleChange('inscricaoEstadual', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="inscricaoMunicipal">Inscrição Municipal</Label>
                    <Input
                      id="inscricaoMunicipal"
                      value={formData.inscricaoMunicipal || ''}
                      onChange={(e) => handleChange('inscricaoMunicipal', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Endereço */}
              <div>
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2 text-primary">
                  <MapPin className="w-5 h-5" />
                  Endereço
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="cep">CEP</Label>
                    <Input
                      id="cep"
                      value={formData.cep || ''}
                      onChange={(e) => handleChange('cep', e.target.value)}
                      placeholder="00000-000"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="endereco">Logradouro</Label>
                    <Input
                      id="endereco"
                      value={formData.endereco || ''}
                      onChange={(e) => handleChange('endereco', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="numero">Número</Label>
                    <Input
                      id="numero"
                      value={formData.numero || ''}
                      onChange={(e) => handleChange('numero', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="complemento">Complemento</Label>
                    <Input
                      id="complemento"
                      value={formData.complemento || ''}
                      onChange={(e) => handleChange('complemento', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="bairro">Bairro</Label>
                    <Input
                      id="bairro"
                      value={formData.bairro || ''}
                      onChange={(e) => handleChange('bairro', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cidade">Cidade</Label>
                    <Input
                      id="cidade"
                      value={formData.cidade || ''}
                      onChange={(e) => handleChange('cidade', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="estado">Estado</Label>
                    <Input
                      id="estado"
                      value={formData.estado || ''}
                      onChange={(e) => handleChange('estado', e.target.value)}
                      placeholder="UF"
                      maxLength={2}
                    />
                  </div>
                </div>
              </div>

              {/* Representante Legal */}
              <div>
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2 text-primary">
                  <User className="w-5 h-5" />
                  Representante Legal
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="representanteNome">Nome</Label>
                    <Input
                      id="representanteNome"
                      value={formData.representanteNome || ''}
                      onChange={(e) => handleChange('representanteNome', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="representanteCargo">Cargo/Vínculo</Label>
                    <Input
                      id="representanteCargo"
                      value={formData.representanteCargo || ''}
                      onChange={(e) => handleChange('representanteCargo', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="representanteTelefone">Telefone</Label>
                    <Input
                      id="representanteTelefone"
                      value={formData.representanteTelefone || ''}
                      onChange={(e) => handleChange('representanteTelefone', e.target.value)}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="representanteEmail">Email</Label>
                    <Input
                      id="representanteEmail"
                      type="email"
                      value={formData.representanteEmail || ''}
                      onChange={(e) => handleChange('representanteEmail', e.target.value)}
                    />
                  </div>
                </div>

                {/* Documentos do representante */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="representanteCpf">CPF</Label>
                    <Input
                      id="representanteCpf"
                      value={formData.representanteCpf || ''}
                      onChange={(e) => handleChange('representanteCpf', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="representanteRg">RG</Label>
                    <Input
                      id="representanteRg"
                      value={formData.representanteRg || ''}
                      onChange={(e) => handleChange('representanteRg', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="representanteCnh">CNH</Label>
                    <Input
                      id="representanteCnh"
                      value={formData.representanteCnh || ''}
                      onChange={(e) => handleChange('representanteCnh', e.target.value)}
                    />
                  </div>
                </div>

                {/* RNTRC (para transportadoras) */}
                {companyDetails?.businessType === 'transportadora' && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="rntrc">RNTRC</Label>
                      <Input
                        id="rntrc"
                        value={formData.rntrc || ''}
                        onChange={(e) => handleChange('rntrc', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="validadeRntrc">Validade RNTRC</Label>
                      <Input
                        id="validadeRntrc"
                        type="date"
                        value={formData.validadeRNTRC || ''}
                        onChange={(e) => handleChange('validadeRNTRC', e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 flex gap-3 justify-end bg-gray-50">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-primary hover:bg-primary/90"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvar Alterações
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}