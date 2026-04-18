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

  
  if (!user?.id) {
    console.error('❌ [SAVE] User ID não encontrado');
    toast.error('Erro: Usuário não identificado');
    return;
  }
  
  // [REVISAR] console.log('📝 [SAVE] Dados editados (editedData):', JSON.stringify(editedData, null, 2));
  
  try {
    const supabase = await import('./supabase/client').then(m => m.supabase);
    
    // Upload de avatar se houver arquivo
    if (avatarFile) {
      const { uploadAvatar } = await import('./storage-helper');
      const result = await uploadAvatar(user.id, avatarFile);
      
      if (result.success && result.path) {
        editedData.avatar = result.path; // ✅ SALVAR PATH, NÃO URL!
      } else {
        console.error('❌ [SAVE] Erro ao fazer upload do avatar:', result.error);
        throw new Error(result.error || 'Erro ao fazer upload do avatar');
      }
    }
    
    // Salvar perfil básico
    const profileUpdates: any = {};
    if ('name' in editedData) profileUpdates.name = editedData.name;
    if ('phone' in editedData) profileUpdates.phone = editedData.phone;
    if ('email' in editedData) profileUpdates.email = editedData.email;
    if ('avatar' in editedData) profileUpdates.avatar_url = editedData.avatar; // ← já é PATH agora!
    
    
    if (Object.keys(profileUpdates).length > 0) {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('id', user.id)
        .select();
      
      if (profileError) {
        console.error('❌ [SAVE] ERRO ao atualizar profiles:', profileError);
      } else {
      }
    } else {
    }

    // Salvar motorista
    if (userData.userType === 'caminhoneiro') {
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
      
      
      if (Object.keys(driverUpdates).length > 0) {
        const { data: driverData, error: driverError } = await supabase
          .from('drivers')
          .update(driverUpdates)
          .eq('user_id', user.id)
          .select();
        
        if (driverError) {
          console.error('❌ [SAVE] ERRO ao atualizar drivers:', driverError);
        } else {
        }
      } else {
      }
    }

    // Salvar empresa
    if (userData.userType !== 'caminhoneiro' && companyDetails) {
      
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
      
      
      if (Object.keys(companyUpdates).length > 0) {
        
        // Primeiro, verificar se existe
        const { data: existingCompany } = await supabase
          .from('companies')
          .select('id')
          .eq('user_id', user.id)
          .single();
        
        
        // Adicionar campos obrigatórios
        const companyData = {
          ...companyUpdates,
          user_id: user.id,
          company_type: userData.userType === 'embarcador' ? 'embarcador' : 'transportadora'
        };
        
        let result;
        
        if (existingCompany) {
          // UPDATE
          result = await supabase
            .from('companies')
            .update(companyData)
            .eq('user_id', user.id)
            .select();
        } else {
          // INSERT
          result = await supabase
            .from('companies')
            .insert(companyData)
            .select();
        }
        
        if (result.error) {
          console.error('❌ [SAVE] ERRO ao salvar empresa:', result.error);
          console.error('❌ [SAVE] Erro detalhado:', JSON.stringify(result.error, null, 2));
        } else {
        }
      } else {
      }
    } else {
    }

    setUserData((prev: any) => ({
      ...prev,
      name: editedData.name ?? prev.name,
      phone: editedData.phone ?? prev.phone,
      email: editedData.email ?? prev.email,
      avatar: editedData.avatar ?? prev.avatar,
    }));

    setEditedData({});
    
    setIsEditing(false);
    
    toast.success('Perfil atualizado com sucesso!');
    
    
  } catch (error) {
    console.error('❌ [SAVE] ERRO FATAL AO SALVAR PERFIL');
    console.error('❌ [SAVE] Erro:', error);
    console.error('❌ [SAVE] Stack:', (error as Error).stack);
    toast.error('Erro ao salvar. Tente novamente.');
  }
}