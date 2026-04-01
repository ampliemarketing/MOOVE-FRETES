import { toast } from 'sonner@2.0.3';

export async function handleProfileSave(params: {
  user: any;
  userData: any;
  companyDetails: any;
  editedData: any;
  avatarFile?: File | null;
  setUserData: (updater: (prev: any) => any) => void;
  setEditedData: (data: any) => void;
  setIsEditing: (value: boolean) => void;
}) {
  const { user, userData, companyDetails, editedData, avatarFile, setUserData, setEditedData, setIsEditing } = params;

  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔵 [SAVE] INICIANDO SALVAMENTO DE PERFIL');
  console.log('═══════════════════════════════════════════════════════════');
  
  if (!user?.id) {
    console.error('❌ [SAVE] User ID não encontrado');
    toast.error('Erro: Usuário não identificado');
    return;
  }
  
  console.log('👤 [SAVE] User ID:', user.id);
  console.log('👤 [SAVE] User Type:', userData.userType);
  console.log('📝 [SAVE] Dados editados (editedData):', JSON.stringify(editedData, null, 2));
  console.log('📝 [SAVE] Quantidade de campos editados:', Object.keys(editedData).length);
  
  try {
    const supabase = await import('./supabase/client').then(m => m.supabase);
    console.log('✅ [SAVE] Supabase client carregado');
    
    // Upload de avatar se houver arquivo
    if (avatarFile) {
      console.log('\n📤 [SAVE] ========== FAZENDO UPLOAD DO AVATAR ==========');
      const { uploadAvatar } = await import('./storage-helper');
      const result = await uploadAvatar(user.id, avatarFile);
      
      if (result.success && result.path) {
        console.log('✅ [SAVE] Avatar uploadado com sucesso. PATH:', result.path);
        editedData.avatar = result.path; // ✅ SALVAR PATH, NÃO URL!
      } else {
        console.error('❌ [SAVE] Erro ao fazer upload do avatar:', result.error);
        throw new Error(result.error || 'Erro ao fazer upload do avatar');
      }
    }
    
    // Salvar perfil básico
    console.log('\n📄 [SAVE] ========== SALVANDO PERFIL BÁSICO ==========');
    const profileUpdates: any = {};
    if ('name' in editedData) profileUpdates.name = editedData.name;
    if ('phone' in editedData) profileUpdates.phone = editedData.phone;
    if ('email' in editedData) profileUpdates.email = editedData.email;
    if ('avatar' in editedData) profileUpdates.avatar_url = editedData.avatar; // ← já é PATH agora!
    
    console.log('📋 [SAVE] Profile updates:', JSON.stringify(profileUpdates, null, 2));
    
    if (Object.keys(profileUpdates).length > 0) {
      console.log('💾 [SAVE] Executando UPDATE na tabela profiles...');
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('id', user.id)
        .select();
      
      if (profileError) {
        console.error('❌ [SAVE] ERRO ao atualizar profiles:', profileError);
      } else {
        console.log('✅ [SAVE] Profiles atualizado com sucesso:', profileData);
      }
    } else {
      console.log('⏭️ [SAVE] Nenhum campo de perfil para atualizar');
    }

    // Salvar motorista
    if (userData.userType === 'caminhoneiro') {
      console.log('\n🚛 [SAVE] ========== SALVANDO DADOS DE MOTORISTA ==========');
      const driverUpdates: any = {};
      if ('cpf' in editedData) driverUpdates.cpf = editedData.cpf;
      if ('rg' in editedData) driverUpdates.rg = editedData.rg;
      if ('birthDate' in editedData) driverUpdates.birth_date = editedData.birthDate;
      if ('cnh' in editedData) driverUpdates.cnh = editedData.cnh;
      if ('cnhCategory' in editedData) driverUpdates.cnh_category = editedData.cnhCategory;
      if ('cnhExpiry' in editedData) driverUpdates.cnh_expiry = editedData.cnhExpiry;
      if ('rntrc' in editedData) driverUpdates.rntrc = editedData.rntrc;
      if ('rntrcExpiry' in editedData) driverUpdates.rntrc_expiry = editedData.rntrcExpiry;
      
      // ✅ ATUALIZAR PROFILE_IMAGE quando avatar muda
      if ('avatar' in editedData) {
        driverUpdates.profile_image = editedData.avatar; // ← PATH!
        console.log('📸 [SAVE] Atualizando profile_image do motorista com PATH:', editedData.avatar);
      }
      
      // ✅ Endereço como JSONB (consolidado)
      const driverAddress: any = {};
      if ('cep' in editedData) driverAddress.cep = editedData.cep;
      if ('street' in editedData) driverAddress.street = editedData.street;
      if ('number' in editedData) driverAddress.number = editedData.number;
      if ('complement' in editedData) driverAddress.complement = editedData.complement;
      if ('neighborhood' in editedData) driverAddress.neighborhood = editedData.neighborhood;
      if ('city' in editedData) driverAddress.city = editedData.city;
      if ('state' in editedData) driverAddress.state = editedData.state;
      if (Object.keys(driverAddress).length > 0) {
        driverUpdates.address = driverAddress;
      }
      
      if ('vehiclePlate' in editedData) driverUpdates.vehicle_plate = editedData.vehiclePlate;
      if ('vehicleModel' in editedData) driverUpdates.vehicle_model = editedData.vehicleModel;
      if ('vehicleYear' in editedData) driverUpdates.vehicle_year = editedData.vehicleYear;
      if ('renavam' in editedData) driverUpdates.renavam = editedData.renavam;
      if ('anttVehicle' in editedData) driverUpdates.antt_vehicle = editedData.anttVehicle;
      if ('vehicleType' in editedData) driverUpdates.vehicle_type = editedData.vehicleType;
      if ('trailerType' in editedData) driverUpdates.trailer_type = editedData.trailerType;
      
      console.log('📋 [SAVE] Driver updates:', JSON.stringify(driverUpdates, null, 2));
      
      if (Object.keys(driverUpdates).length > 0) {
        console.log('💾 [SAVE] Executando UPDATE na tabela drivers...');
        const { data: driverData, error: driverError } = await supabase
          .from('drivers')
          .update(driverUpdates)
          .eq('user_id', user.id)
          .select();
        
        if (driverError) {
          console.error('❌ [SAVE] ERRO ao atualizar drivers:', driverError);
        } else {
          console.log('✅ [SAVE] Drivers atualizado com sucesso:', driverData);
        }
      } else {
        console.log('⏭️ [SAVE] Nenhum campo de motorista para atualizar');
      }
    }

    // Salvar empresa
    if (userData.userType !== 'caminhoneiro' && companyDetails) {
      console.log('\n🏢 [SAVE] ========== SALVANDO DADOS DE EMPRESA ==========');
      console.log('🏢 [SAVE] Company details ID:', companyDetails?.id);
      
      const companyUpdates: any = {};
      if ('companyName' in editedData) companyUpdates.company_name = editedData.companyName;
      if ('tradingName' in editedData) companyUpdates.trading_name = editedData.tradingName;
      if ('cnpj' in editedData) companyUpdates.cnpj = editedData.cnpj;
      if ('stateRegistration' in editedData) companyUpdates.state_registration = editedData.stateRegistration;
      if ('municipalRegistration' in editedData) companyUpdates.municipal_registration = editedData.municipalRegistration;
      if ('companyPhone' in editedData) companyUpdates.phone = editedData.companyPhone;
      if ('companyEmail' in editedData) companyUpdates.email = editedData.companyEmail;
      if ('companyRntrc' in editedData) companyUpdates.rntrc = editedData.companyRntrc;
      if ('companyRntrcExpiry' in editedData) companyUpdates.rntrc_expiry = editedData.companyRntrcExpiry;
      
      // ✅ Montar o objeto JSONB address se houver campos de endereço
      const hasAddressFields = 
        'companyCep' in editedData ||
        'companyStreet' in editedData ||
        'companyNumber' in editedData ||
        'companyComplement' in editedData ||
        'companyNeighborhood' in editedData ||
        'companyCity' in editedData ||
        'companyState' in editedData;
      
      if (hasAddressFields) {
        // ✅ Salvar no campo JSONB address
        companyUpdates.address = {
          cep: editedData.companyCep || companyDetails?.companyCep || '',
          street: editedData.companyStreet || companyDetails?.companyStreet || '',
          number: editedData.companyNumber || companyDetails?.companyNumber || '',
          complement: editedData.companyComplement || companyDetails?.companyComplement || '',
          neighborhood: editedData.companyNeighborhood || companyDetails?.companyNeighborhood || '',
          city: editedData.companyCity || companyDetails?.companyCity || '',
          state: editedData.companyState || companyDetails?.companyState || ''
        };
        
        // ✅ NOTA: Endereço já está salvo no campo JSON 'address' acima
        // Não precisamos salvar nos campos individuais pois a tabela companies usa JSONB
      }
      
      console.log('📋 [SAVE] Company updates:', JSON.stringify(companyUpdates, null, 2));
      console.log('📋 [SAVE] Quantidade de campos empresa:', Object.keys(companyUpdates).length);
      
      if (Object.keys(companyUpdates).length > 0) {
        console.log('💾 [SAVE] Verificando se empresa existe...');
        
        // Primeiro, verificar se existe
        const { data: existingCompany } = await supabase
          .from('companies')
          .select('id')
          .eq('user_id', user.id)
          .single();
        
        console.log('🔍 [SAVE] Empresa existente:', existingCompany ? 'SIM' : 'NÃO');
        
        // Adicionar campos obrigatórios
        const companyData = {
          ...companyUpdates,
          user_id: user.id,
          company_type: userData.userType === 'embarcador' ? 'embarcador' : 'transportadora'
        };
        
        let result;
        
        if (existingCompany) {
          // UPDATE
          console.log('💾 [SAVE] Executando UPDATE...');
          result = await supabase
            .from('companies')
            .update(companyData)
            .eq('user_id', user.id)
            .select();
        } else {
          // INSERT
          console.log('💾 [SAVE] Executando INSERT...');
          result = await supabase
            .from('companies')
            .insert(companyData)
            .select();
        }
        
        if (result.error) {
          console.error('❌ [SAVE] ERRO ao salvar empresa:', result.error);
          console.error('❌ [SAVE] Erro detalhado:', JSON.stringify(result.error, null, 2));
        } else {
          console.log('✅ [SAVE] Empresa salva com sucesso!');
          console.log('✅ [SAVE] Dados retornados:', result.data);
          console.log('✅ [SAVE] Quantidade de registros:', result.data?.length || 0);
        }
      } else {
        console.log('⏭️ [SAVE] Nenhum campo de empresa para atualizar');
      }
    } else {
      console.log('\n⏭️ [SAVE] Não é empresa ou companyDetails não existe');
      console.log('   userType:', userData.userType);
      console.log('   companyDetails:', companyDetails ? 'EXISTS' : 'NULL');
    }

    console.log('\n🔄 [SAVE] ========== ATUALIZANDO ESTADO LOCAL ==========');
    setUserData((prev: any) => ({
      ...prev,
      name: editedData.name ?? prev.name,
      phone: editedData.phone ?? prev.phone,
      email: editedData.email ?? prev.email,
      avatar: editedData.avatar ?? prev.avatar,
    }));
    console.log('✅ [SAVE] Estado userData atualizado');

    setEditedData({});
    console.log('✅ [SAVE] editedData limpo');
    
    setIsEditing(false);
    console.log('✅ [SAVE] Modo edição desativado');
    
    toast.success('Perfil atualizado com sucesso!');
    console.log('✅ [SAVE] Toast de sucesso exibido');
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ [SAVE] SALVAMENTO CONCLUÍDO COM SUCESSO!');
    console.log('═══════════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.error('❌ [SAVE] ERRO FATAL AO SALVAR PERFIL');
    console.error('❌ [SAVE] Erro:', error);
    console.error('❌ [SAVE] Stack:', (error as Error).stack);
    console.log('═══════════════════════════════════════════════════════════\n');
    toast.error('Erro ao salvar. Tente novamente.');
  }
}