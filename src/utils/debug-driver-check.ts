import { supabase } from './supabase/client';

interface DriverCheckResult {
  exists: boolean;
  needsCreation: boolean;
  user?: any;
  driver?: any;
  error?: any;
}

/**
 * Verifica se um motorista existe e se tem todos os dados necessários
 */
export async function checkDriverExists(userId: string): Promise<DriverCheckResult> {
  try {
    // 1. Verificar se o usuário existe
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      console.error('❌ Usuário não encontrado:', userId);
      return {
        exists: false,
        needsCreation: false,
        error: userError
      };
    }

    console.log('✅ Usuário encontrado:', user.name);

    // 2. Verificar se tem registro de motorista
    const { data: driver, error: driverError } = await supabase
      .from('drivers')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (driverError) {
      if (driverError.code === 'PGRST116') {
        console.warn('⚠️ Motorista não tem registro na tabela drivers');
        return {
          exists: false,
          needsCreation: true,
          user
        };
      }
      return {
        exists: false,
        needsCreation: false,
        user,
        error: driverError
      };
    }

    console.log('✅ Registro de motorista encontrado');
    console.log('Dados do motorista:', {
      vehicleType: driver.vehicle_type,
      available: driver.available,
      currentLocation: driver.current_location
    });

    return {
      exists: true,
      needsCreation: false,
      user,
      driver
    };
  } catch (error) {
    console.error('❌ Erro ao verificar motorista:', error);
    return {
      exists: false,
      needsCreation: false,
      error
    };
  }
}

/**
 * Cria um registro básico de motorista se não existir
 */
export async function createDriverRecord(userId: string) {
  try {
    const check = await checkDriverExists(userId);
    
    if (!check.needsCreation) {
      console.log('✅ Motorista já existe ou não é necessário criar');
      return { success: true, existed: true };
    }

    // Criar registro básico de motorista
    const { data, error } = await supabase
      .from('drivers')
      .insert({
        user_id: userId,
        vehicle_type: 'Caminhão',
        available: false,
        rating: 0,
        completed_trips: 0
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao criar motorista:', error);
      return { success: false, error };
    }

    console.log('✅ Motorista criado com sucesso:', data);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Exceção ao criar motorista:', error);
    return { success: false, error };
  }
}

// Função auxiliar para usar no console do navegador
(window as any).debugDriver = async (userId: string) => {
  const result = await checkDriverExists(userId);
  
  if (!result.exists && result.needsCreation) {
    console.log('🤔 Deseja criar o registro do motorista? Execute:');
    console.log(`window.createDriver("${userId}")`);
  }
  
  return result;
};

(window as any).createDriver = createDriverRecord;

// ✅ FUNÇÃO PARA CRIAR FRETE DE TESTE COMPLETO
(window as any).createTestFreight = async () => {
  try {
    console.log('🧪 Criando frete de teste completo...');
    
    const { database } = await import('./database');
    
    // Buscar primeiro usuário disponível do tipo transportadora ou embarcador
    const { data: users } = await supabase
      .from('users')
      .select('*')
      .in('user_type', ['transportadora', 'embarcador'])
      .limit(1);
    
    if (!users || users.length === 0) {
      console.error('❌ Nenhum usuário encontrado para criar o frete');
      return { success: false, error: 'No users found' };
    }
    
    const user = users[0];
    console.log('✅ Usando usuário:', user.name);
    
    // Dados do frete de teste
    const freightData = {
      origin: {
        city: 'São Paulo',
        state: 'SP',
        address: 'Av. Paulista, 1000',
        postalCode: '01310-100'
      },
      destination: {
        city: 'Rio de Janeiro',
        state: 'RJ',
        address: 'Av. Atlântica, 500',
        postalCode: '22010-000'
      },
      cargoType: 'Eletrônicos',
      weight: '5000',
      value: '50000',
      vehicleType: 'Caminhão Baú',
      trailerType: 'Baú',
      pickupDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Amanhã
      deliveryDate: new Date(Date.now() + 172800000).toISOString().split('T')[0], // Depois de amanhã
      notes: 'Frete de teste criado automaticamente. Carga frágil, requer cuidado especial.'
    };
    
    console.log('📦 Dados do frete:', freightData);
    
    // Criar o frete usando o FreightRepository
    const result = await database.freights.create(freightData);
    
    if (result.success) {
      console.log('✅ Frete de teste criado com sucesso!');
      console.log('ID do frete:', result.data?.id);
      console.log('📍 Origem:', `${freightData.origin.city}, ${freightData.origin.state}`);
      console.log('📍 Destino:', `${freightData.destination.city}, ${freightData.destination.state}`);
      return { success: true, freight: result.data };
    } else {
      console.error('❌ Erro ao criar frete:', result.error);
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('❌ Exceção ao criar frete de teste:', error);
    return { success: false, error };
  }
};

// ✅ FUNÇÃO DEBUG: Listar todas as avaliações
(window as any).debugRatings = async () => {
  try {
    console.log('🔍 Buscando todas as avaliações...');
    
    const { data, error } = await supabase
      .from('ratings')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Erro ao buscar avaliações:', error);
      return { success: false, error };
    }
    
    console.log(`✅ ${data.length} avaliações encontradas`);
    
    if (data.length > 0) {
      console.table(data.map(r => ({
        id: r.id.substring(0, 8),
        avaliador: r.reviewer_id.substring(0, 8),
        avaliado: r.rated_user_id.substring(0, 8),
        nota_geral: r.overall_rating,
        criado: new Date(r.created_at).toLocaleString('pt-BR')
      })));
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('❌ Exceção ao buscar avaliações:', error);
    return { success: false, error };
  }
};

// ✅ FUNÇÃO DEBUG: Ver avaliações de um usuário específico
(window as any).debugUserRatings = async (userId: string) => {
  try {
    console.log('🔍 Buscando avaliações do usuário:', userId);
    
    // Buscar dados do usuário
    const { data: user } = await supabase
      .from('users')
      .select('name, email')
      .eq('id', userId)
      .single();
    
    if (user) {
      console.log('👤 Usuário:', user.name, `(${user.email})`);
    }
    
    // Buscar avaliações RECEBIDAS
    const { data: receivedRatings, error: errorReceived } = await supabase
      .from('ratings')
      .select('*')
      .eq('rated_user_id', userId)
      .order('created_at', { ascending: false });
    
    if (errorReceived) {
      console.error('❌ Erro ao buscar avaliações recebidas:', errorReceived);
      return { success: false, error: errorReceived };
    }
    
    // Buscar avaliações FEITAS
    const { data: givenRatings, error: errorGiven } = await supabase
      .from('ratings')
      .select('*')
      .eq('reviewer_id', userId)
      .order('created_at', { ascending: false });
    
    if (errorGiven) {
      console.error('❌ Erro ao buscar avaliações feitas:', errorGiven);
      return { success: false, error: errorGiven };
    }
    
    console.log(`\n📥 AVALIAÇÕES RECEBIDAS: ${receivedRatings.length}`);
    if (receivedRatings.length > 0) {
      const avgRating = receivedRatings.reduce((sum, r) => sum + r.overall_rating, 0) / receivedRatings.length;
      console.log(`⭐ Média: ${avgRating.toFixed(1)}/5`);
      console.table(receivedRatings.map(r => ({
        de: r.reviewer_id.substring(0, 8),
        nota: r.overall_rating,
        comentario: r.comment || '(sem comentário)',
        data: new Date(r.created_at).toLocaleDateString('pt-BR')
      })));
    }
    
    console.log(`\n📤 AVALIAÇÕES FEITAS: ${givenRatings.length}`);
    if (givenRatings.length > 0) {
      console.table(givenRatings.map(r => ({
        para: r.rated_user_id.substring(0, 8),
        nota: r.overall_rating,
        comentario: r.comment || '(sem comentário)',
        data: new Date(r.created_at).toLocaleDateString('pt-BR')
      })));
    }
    
    return {
      success: true,
      received: receivedRatings,
      given: givenRatings,
      avgRating: receivedRatings.length > 0
        ? receivedRatings.reduce((sum, r) => sum + r.overall_rating, 0) / receivedRatings.length
        : 0
    };
  } catch (error) {
    console.error('❌ Exceção ao buscar avaliações do usuário:', error);
    return { success: false, error };
  }
};

// ✅ FUNÇÃO DEBUG: Criar avaliação de teste
(window as any).createTestRating = async (targetUserId: string) => {
  try {
    console.log('🧪 Criando avaliação de teste...');
    
    // Buscar usuário logado
    const { data: { user: authUser } } = await supabase.auth.getUser();
    
    if (!authUser) {
      console.error('❌ Nenhum usuário logado');
      return { success: false, error: 'No authenticated user' };
    }
    
    console.log('👤 Avaliador:', authUser.id);
    console.log('👤 Avaliado:', targetUserId);
    
    // Verificar se usuário alvo existe
    const { data: targetUser } = await supabase
      .from('users')
      .select('name')
      .eq('id', targetUserId)
      .single();
    
    if (!targetUser) {
      console.error('❌ Usuário alvo não encontrado:', targetUserId);
      return { success: false, error: 'Target user not found' };
    }
    
    console.log('✅ Avaliando:', targetUser.name);
    
    // Criar avaliação
    const ratingData = {
      reviewer_id: authUser.id,
      rated_user_id: targetUserId,
      overall_rating: 5,
      punctuality_rating: 5,
      communication_rating: 5,
      professionalism_rating: 5,
      vehicle_condition_rating: 5,
      comment: 'Excelente profissional! Avaliação de teste criada automaticamente.',
      freight_id: null
    };
    
    const { database } = await import('./database');
    const result = await database.ratings.create(ratingData);
    
    if (result.success) {
      console.log('✅ Avaliação de teste criada com sucesso!');
      console.log('ID:', result.data?.id);
      return { success: true, rating: result.data };
    } else {
      console.error('❌ Erro ao criar avaliação:', result.error);
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('❌ Exceção ao criar avaliação de teste:', error);
    return { success: false, error };
  }
};

// ✅ FUNÇÃO DEBUG: Verificar favoritos e se motoristas existem
(window as any).debugFavorites = async (userId: string) => {
  console.log('🔍 [debugFavorites] Verificando favoritos do usuário:', userId);
  
  const { database } = await import('./database');
  
  // Buscar favoritos
  const favoritesResponse = await database.favorites.getUserFavorites(userId);
  console.log('📊 Favoritos encontrados:', favoritesResponse.data?.length || 0);
  
  if (!favoritesResponse.data || favoritesResponse.data.length === 0) {
    console.log('⚠️ Nenhum favorito encontrado');
    return;
  }
  
  // Verificar cada motorista
  for (const driverId of favoritesResponse.data) {
    console.log('\n🔍 Verificando motorista:', driverId);
    
    // 1. Verificar em unified_users
    const unifiedUser = await database.unifiedUsers.getById(driverId);
    if (unifiedUser) {
      console.log('✅ Encontrado em unified_users:', unifiedUser.name);
      continue;
    }
    
    // 2. Verificar em users
    const userResponse = await database.users.getById(driverId);
    if (userResponse.success && userResponse.data) {
      console.log('✅ Encontrado em users (tabela antiga):', userResponse.data.name);
      console.log('⚠️ Este usuário NÃO está em unified_users - precisa migração');
      continue;
    }
    
    // 3. Motorista não encontrado
    console.error('❌ Motorista NÃO encontrado em NENHUMA tabela:', driverId);
    console.log('🔧 Sugestão: Remover este favorito com:');
    console.log(`   await database.favorites.removeFavorite("${userId}", "${driverId}")`);
  }
  
  console.log('\n✅ Verificação concluída');
};

console.log('🛠️ Debug tools disponíveis:');
console.log('  window.debugDriver(\"user-id\") - Verificar se motorista existe');
console.log('  window.createDriver(\"user-id\") - Criar registro de motorista');
console.log('  window.createTestFreight() - 🧪 Criar frete de teste completo');
console.log('  window.debugRatings() - 🔍 Listar todas as avaliações');
console.log('  window.debugUserRatings(\"user-id\") - 🔍 Ver avaliações de um usuário');
console.log('  window.createTestRating(\"target-user-id\") - 🧪 Criar avaliação de teste');
console.log('  window.debugFavorites(\"user-id\") - 🔍 Verificar favoritos e motoristas');
