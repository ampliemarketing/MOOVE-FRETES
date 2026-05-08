/**
 * Admin Supabase Service
 * Fetches real data from Supabase for the admin panel
 */

import { supabase } from './supabase/client';
import type {
  AdminUser,
  AdminCompany,
  AdminFreight,
  AdminLog,
  AdminReview,
  AdminMessage,
} from '../components/admin/admin-mock-data';

// ─── Users ───────────────────────────────────────────────────────────────────
// profiles columns: id, email, name, phone, cpf, cnpj, user_type, rating,
//   completed_freights, email_verified, verification_status, created_at,
//   last_seen, city, state, status (added via migration)

export async function fetchAdminUsers(): Promise<AdminUser[]> {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, email, name, phone, user_type, rating, completed_freights, email_verified, verification_status, created_at, last_seen, last_login_at, cpf, cnpj, city, state, status')
    .order('created_at', { ascending: false });

  if (error || !profiles) return [];

  return profiles.map((p: any) => ({
    id: p.id,
    email: p.email || '',
    name: p.name || p.email || 'Usuário',
    userType: (p.user_type === 'driver' ? 'caminhoneiro' : p.user_type) as AdminUser['userType'],
    status: (p.status as AdminUser['status']) || 'active',
    verified: p.email_verified || false,
    rating: Number(p.rating) || 0,
    totalFreights: p.completed_freights || 0,
    phone: p.phone || '',
    cpfCnpj: p.cpf || p.cnpj || '',
    city: p.city || '',
    state: p.state || '',
    createdAt: p.created_at,
    lastLogin: p.last_login_at || p.last_seen || p.created_at,
  }));
}

export async function updateUserStatus(userId: string, status: AdminUser['status']): Promise<void> {
  await supabase
    .from('profiles')
    .update({ status, is_active: status !== 'blocked' && status !== 'suspended' })
    .eq('id', userId);
}

// ─── Companies ───────────────────────────────────────────────────────────────
// companies columns: id, company_name, cnpj, company_type, user_id, fleet_size,
//   rntrc, address, created_at, status (added via migration)
// company_type: 'transportadora' | 'embarcador' | 'ambos'

export async function fetchAdminCompanies(): Promise<AdminCompany[]> {
  const { data: companies, error } = await supabase
    .from('companies')
    .select('id, company_name, cnpj, company_type, status, user_id, fleet_size, rntrc, address, created_at')
    .order('created_at', { ascending: false });

  if (error || !companies) return [];

  // Fetch owner names from profiles
  const userIds = companies.map((c: any) => c.user_id).filter(Boolean);
  const { data: owners } = userIds.length
    ? await supabase.from('profiles').select('id, name').in('id', userIds)
    : { data: [] };
  const ownerMap = new Map((owners || []).map((o: any) => [o.id, o.name]));

  // Count collaborators per company
  const { data: collab } = await supabase.from('collaborators').select('company_id');
  const collabCount: Record<string, number> = {};
  (collab || []).forEach((c: any) => {
    collabCount[c.company_id] = (collabCount[c.company_id] || 0) + 1;
  });

  // Count active freights per company owner
  const { data: activeFreights } = await supabase
    .from('freights')
    .select('publisher_id')
    .in('status', ['active', 'scheduled', 'in-transit']);
  const freightCount: Record<string, number> = {};
  (activeFreights || []).forEach((f: any) => {
    freightCount[f.publisher_id] = (freightCount[f.publisher_id] || 0) + 1;
  });

  return companies.map((c: any) => {
    const companyType = c.company_type === 'ambos' ? 'transportadora' : c.company_type;
    return {
      id: c.id,
      name: c.company_name || '',
      cnpj: c.cnpj || '',
      type: companyType as AdminCompany['type'],
      status: (c.status || 'active') as AdminCompany['status'],
      owner: ownerMap.get(c.user_id) || '',
      collaborators: collabCount[c.id] || 0,
      activeFreights: freightCount[c.user_id] || 0,
      rntrc: c.rntrc || '',
      state: c.address?.state || '',
      createdAt: c.created_at,
    };
  });
}

export async function updateCompanyStatus(companyId: string, status: AdminCompany['status']): Promise<void> {
  await supabase.from('companies').update({ status }).eq('id', companyId);
}

// ─── Freights ─────────────────────────────────────────────────────────────────
// freights columns: id, freight_code, status, origin_city, origin_state,
//   destination_city, destination_state, value_estimate, cargo_type,
//   created_at, updated_at, publisher_id, accepted_driver_id, accepted_driver_name
// status values: 'draft' | 'active' | 'scheduled' | 'in-transit' | 'completed' | 'cancelled'

export async function fetchAdminFreights(): Promise<AdminFreight[]> {
  const { data: freights, error } = await supabase
    .from('freights')
    .select('id, freight_code, status, origin_city, origin_state, destination_city, destination_state, value_estimate, cargo_type, created_at, updated_at, publisher_id, accepted_driver_id, accepted_driver_name, metadata')
    .order('created_at', { ascending: false });

  if (error || !freights) return [];

  // Fetch publisher names
  const publisherIds = [...new Set(freights.map((f: any) => f.publisher_id).filter(Boolean))];
  const { data: profiles } = publisherIds.length
    ? await supabase.from('profiles').select('id, name').in('id', publisherIds)
    : { data: [] };
  const nameMap = new Map((profiles || []).map((p: any) => [p.id, p.name]));

  return freights.map((f: any) => {
    // Normalize status: 'in-transit' → 'in_transit' for UI consistency
    const rawStatus = f.status as string;
    const normalizedStatus = rawStatus === 'in-transit' ? 'in_transit' : rawStatus;

    return {
      id: f.id,
      code: f.freight_code || f.id.slice(0, 8).toUpperCase(),
      status: normalizedStatus as AdminFreight['status'],
      origin: [f.origin_city, f.origin_state].filter(Boolean).join(', '),
      destination: [f.destination_city, f.destination_state].filter(Boolean).join(', '),
      value: Number(f.value_estimate) || 0,
      shipper: nameMap.get(f.publisher_id) || '',
      carrier: f.accepted_driver_name || '',
      cargoType: f.cargo_type || '',
      createdAt: f.created_at,
      updatedAt: f.updated_at || f.created_at,
    };
  });
}

export async function updateFreightStatus(freightId: string, status: AdminFreight['status']): Promise<void> {
  // Normalize back: 'in_transit' → 'in-transit' for DB storage
  const dbStatus = status === 'in_transit' ? 'in-transit' : status;
  await supabase.from('freights').update({ status: dbStatus }).eq('id', freightId);
}

// ─── Logs ─────────────────────────────────────────────────────────────────────
// activity_logs columns: id, user_id, action, category, description,
//   ip_address, created_at
// Note: no direct FK join alias for profiles — join manually

export async function fetchAdminLogs(): Promise<AdminLog[]> {
  const { data: logs, error } = await supabase
    .from('activity_logs')
    .select('id, user_id, action, category, description, ip_address, created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error || !logs) return [];

  // Fetch user names
  const userIds = [...new Set(logs.map((l: any) => l.user_id).filter(Boolean))];
  const { data: profiles } = userIds.length
    ? await supabase.from('profiles').select('id, name').in('id', userIds)
    : { data: [] };
  const nameMap = new Map((profiles || []).map((p: any) => [p.id, p.name]));

  return logs.map((l: any) => ({
    id: l.id,
    userId: l.user_id || '',
    userName: nameMap.get(l.user_id) || l.user_id?.slice(0, 8) || 'Sistema',
    action: l.action || '',
    category: l.category || 'system',
    details: l.description || '',
    ip: l.ip_address || '',
    createdAt: l.created_at,
  }));
}

// ─── Reviews ──────────────────────────────────────────────────────────────────
// ratings columns: id, evaluator_id (text), target_id (text), overall_rating,
//   comment, freight_id, freight_code, evaluator_name, target_name,
//   reported (added via migration), report_reason (added via migration),
//   status (added via migration), created_at

export async function fetchAdminReviews(): Promise<AdminReview[]> {
  const { data: reviews, error } = await supabase
    .from('ratings')
    .select('id, evaluator_id, target_id, overall_rating, comment, freight_id, freight_code, evaluator_name, target_name, reported, report_reason, status, created_at')
    .order('created_at', { ascending: false });

  if (error || !reviews) return [];

  return reviews.map((r: any) => ({
    id: r.id,
    fromUser: r.evaluator_name || r.evaluator_id?.slice(0, 8) || '',
    toUser: r.target_name || r.target_id?.slice(0, 8) || '',
    rating: r.overall_rating || 0,
    comment: r.comment || '',
    freightCode: r.freight_code || r.freight_id || '',
    reported: r.reported || false,
    reportReason: r.report_reason || undefined,
    status: (r.status || 'visible') as AdminReview['status'],
    createdAt: r.created_at,
  }));
}

export async function updateReviewStatus(reviewId: string, status: AdminReview['status']): Promise<void> {
  await supabase.from('ratings').update({ status }).eq('id', reviewId);
}

// ─── Messages ─────────────────────────────────────────────────────────────────
// messages columns: id, conversation_id, sender_id, content, attachments (jsonb),
//   reported (added via migration), created_at
// conversations: participant1_id, participant2_id, freight_id

export async function fetchAdminMessages(): Promise<AdminMessage[]> {
  const { data: messages, error } = await supabase
    .from('messages')
    .select('id, sender_id, content, attachments, reported, created_at, conversation:conversations!conversation_id(participant1_id, participant2_id, freight_id)')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error || !messages) return [];

  // Collect all user IDs to resolve names
  const userIds = new Set<string>();
  messages.forEach((m: any) => {
    if (m.sender_id) userIds.add(m.sender_id);
    if (m.conversation?.participant1_id) userIds.add(m.conversation.participant1_id);
    if (m.conversation?.participant2_id) userIds.add(m.conversation.participant2_id);
  });

  const { data: profiles } = userIds.size
    ? await supabase.from('profiles').select('id, name').in('id', [...userIds])
    : { data: [] };
  const nameMap = new Map((profiles || []).map((p: any) => [p.id, p.name]));

  return messages.map((m: any) => {
    const conv = m.conversation;
    // Receiver is the other participant in the conversation
    const receiverId = conv
      ? conv.participant1_id === m.sender_id ? conv.participant2_id : conv.participant1_id
      : null;

    return {
      id: m.id,
      from: nameMap.get(m.sender_id) || m.sender_id?.slice(0, 8) || '',
      to: receiverId ? (nameMap.get(receiverId) || receiverId.slice(0, 8)) : '',
      content: m.content || '',
      freightCode: conv?.freight_id || undefined,
      hasAttachment: Array.isArray(m.attachments) ? m.attachments.length > 0 : !!m.attachments,
      reported: m.reported || false,
      createdAt: m.created_at,
    };
  });
}

// ─── KPI Dashboard ────────────────────────────────────────────────────────────

export interface AdminKPI {
  totalUsers: number;
  activeUsers: number;
  pendingUsers: number;
  blockedUsers: number;
  suspendedUsers: number;
  totalFreights: number;
  activeFreights: number;
  completedFreights: number;
  cancelledFreights: number;
  scheduledFreights: number;
  pendingReports: number;
  avgRating: number;
  totalCompanies: number;
  pendingCompanies: number;
  reportedMessages: number;
  openTickets: number;
  criticalFreights: number;
}

  const [
    profilesCount, 
    pendingProfiles,
    blockedProfiles,
    suspendedProfiles,
    freightsCount, 
    activeFreights,
    completedFreights,
    cancelledFreights,
    scheduledFreights,
    criticalFreightsCount,
    reviewsRes, 
    companiesCount, 
    pendingCompanies,
    messagesCount,
    openSupportChats
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).or('status.eq.pending,verification_status.eq.pending'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'blocked'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'suspended'),
    supabase.from('freights').select('*', { count: 'exact', head: true }),
    supabase.from('freights').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('freights').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    supabase.from('freights').select('*', { count: 'exact', head: true }).eq('status', 'cancelled'),
    supabase.from('freights').select('*', { count: 'exact', head: true }).eq('status', 'scheduled'),
    supabase.from('freights').select('*', { count: 'exact', head: true }).eq('is_urgent', true).eq('status', 'active'),
    supabase.from('ratings').select('reported, overall_rating'),
    supabase.from('companies').select('*', { count: 'exact', head: true }),
    supabase.from('companies').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('messages').select('*', { count: 'exact', head: true }).eq('reported', true),
    supabase.from('chats').select('*', { count: 'exact', head: true }).eq('type', 'support').eq('is_archived', false),
  ]);

  const reviews = reviewsRes.data || [];
  const pendingReports = reviews.filter((r: any) => r.reported).length;
  const ratingsWithValue = reviews.filter((r: any) => (r.overall_rating || 0) > 0);
  const avgRating = ratingsWithValue.length
    ? ratingsWithValue.reduce((acc: number, r: any) => acc + (r.overall_rating || 0), 0) / ratingsWithValue.length
    : 0;

  return {
    totalUsers: profilesCount.count || 0,
    activeUsers: (profilesCount.count || 0) - (pendingProfiles.count || 0) - (blockedProfiles.count || 0),
    pendingUsers: pendingProfiles.count || 0,
    blockedUsers: blockedProfiles.count || 0,
    suspendedUsers: suspendedProfiles.count || 0,
    totalFreights: freightsCount.count || 0,
    activeFreights: activeFreights.count || 0,
    completedFreights: completedFreights.count || 0,
    cancelledFreights: cancelledFreights.count || 0,
    scheduledFreights: scheduledFreights.count || 0,
    pendingReports,
    avgRating,
    totalCompanies: companiesCount.count || 0,
    pendingCompanies: pendingCompanies.count || 0,
    reportedMessages: messagesCount.count || 0,
    openTickets: openSupportChats.count || 0,
    criticalFreights: criticalFreightsCount.count || 0,
  };
}




export interface ChartPoint {
  month: string;
  users?: number;
}

export async function fetchUserGrowthData(): Promise<ChartPoint[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('created_at')
    .order('created_at', { ascending: true });

  if (error || !data) return [];

  const months: Record<string, number> = {};
  data.forEach((p: any) => {
    const d = new Date(p.created_at);
    const key = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
    months[key] = (months[key] || 0) + 1;
  });

  let cumulative = 0;
  return Object.entries(months).map(([month, count]) => {
    cumulative += count;
    return { month, users: cumulative };
  });
}

export interface FreightStatusPoint {
  name: string;
  value: number;
  color: string;
}

export async function fetchFreightStatusData(): Promise<FreightStatusPoint[]> {
  const { data } = await supabase.from('freights').select('status');
  const freights = data || [];

  const counts: Record<string, number> = {
    active: 0, completed: 0, cancelled: 0, scheduled: 0, 'in-transit': 0, draft: 0,
  };
  freights.forEach((f: any) => { counts[f.status] = (counts[f.status] || 0) + 1; });

  return [
    { name: 'Ativos', value: counts.active, color: '#253663' },
    { name: 'Concluídos', value: counts.completed, color: '#22c55e' },
    { name: 'Cancelados', value: counts.cancelled, color: '#ef4444' },
    { name: 'Agendados', value: counts.scheduled, color: '#f59e0b' },
    { name: 'Em Trânsito', value: counts['in-transit'], color: '#6366f1' },
  ].filter((d) => d.value > 0);
}

export interface UserTypePoint {
  name: string;
  value: number;
  color: string;
}

export async function fetchUserTypeDistribution(): Promise<UserTypePoint[]> {
  const { data } = await supabase.from('profiles').select('user_type');
  const profiles = data || [];

  const counts: Record<string, number> = {};
  profiles.forEach((p: any) => { counts[p.user_type] = (counts[p.user_type] || 0) + 1; });

  const labels: Record<string, { name: string; color: string }> = {
    caminhoneiro: { name: 'Caminhoneiros', color: '#253663' },
    driver: { name: 'Caminhoneiros', color: '#253663' },
    transportadora: { name: 'Transportadoras', color: '#3b82f6' },
    carrier: { name: 'Transportadoras', color: '#3b82f6' },
    embarcador: { name: 'Embarcadores', color: '#22c55e' },
    shipper: { name: 'Embarcadores', color: '#22c55e' },
    agenciador: { name: 'Agenciadores', color: '#f59e0b' },
    collaborator: { name: 'Colaboradores', color: '#8b5cf6' },
  };

  // Merge driver→caminhoneiro, carrier→transportadora, shipper→embarcador
  const merged: Record<string, number> = {};
  Object.entries(counts).forEach(([type, count]) => {
    const label = labels[type]?.name || type;
    merged[label] = (merged[label] || 0) + count;
  });

  const colorByLabel: Record<string, string> = {
    'Caminhoneiros': '#253663',
    'Transportadoras': '#3b82f6',
    'Embarcadores': '#22c55e',
    'Agenciadores': '#f59e0b',
    'Colaboradores': '#8b5cf6',
  };

  return Object.entries(merged).map(([name, value]) => ({
    name,
    value,
    color: colorByLabel[name] || '#6b7280',
  }));
}

// ─── Verification & Approvals ──────────────────────────────────────────────────
import type { VerificationRequest, SupportTicket, CriticalFreight } from '../components/admin/admin-mock-data';

export async function fetchVerificationRequests(): Promise<VerificationRequest[]> {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, name, user_type, avatar_url, created_at, status, verification_status')
    .or('status.eq.pending,verification_status.eq.pending')
    .order('created_at', { ascending: false });

  if (error || !profiles) return [];

  return profiles.map((p: any) => ({
    id: p.id,
    userId: p.id,
    userName: p.name || 'Usuário',
    userType: p.user_type,
    documentType: 'cnh', // Defaulting to CNH if not specified in profiles
    documentUrl: p.avatar_url || 'https://via.placeholder.com/600x400?text=Documento',
    status: p.verification_status === 'verified' ? 'approved' : (p.verification_status === 'rejected' ? 'rejected' : 'pending'),
    submittedAt: p.created_at,
  }));
}

// ─── Support Tickets ──────────────────────────────────────────────────────────
export async function fetchSupportTickets(): Promise<SupportTicket[]> {
  const { data: chats, error } = await supabase
    .from('chats')
    .select('id, last_message, created_at, updated_at, participants')
    .eq('type', 'support')
    .order('updated_at', { ascending: false });

  if (error || !chats) return [];

  // Fetch names of participants
  const userIds = new Set<string>();
  chats.forEach((c: any) => (c.participants || []).forEach((p: any) => userIds.add(p)));
  
  const { data: profiles } = userIds.size
    ? await supabase.from('profiles').select('id, name').in('id', [...userIds])
    : { data: [] };
  const nameMap = new Map((profiles || []).map((p: any) => [p.id, p.name]));

  return chats.map((c: any) => {
    const userId = c.participants?.find((p: string) => p !== 'admin-system') || 'system';
    return {
      id: c.id,
      userId: userId,
      userName: nameMap.get(userId) || 'Usuário',
      subject: c.last_message?.content || 'Sem assunto',
      status: c.is_archived ? 'closed' : 'open',
      priority: 'medium',
      category: 'outro',
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      lastMessage: c.last_message?.content || '',
    };
  });
}

// ─── Critical Freights ────────────────────────────────────────────────────────
export async function fetchCriticalFreights(): Promise<CriticalFreight[]> {
  const { data: freights, error } = await supabase
    .from('freights')
    .select('id, freight_code, status, origin_city, destination_city, value_estimate, publisher_id, is_urgent, created_at')
    .eq('status', 'active')
    .or('is_urgent.eq.true,created_at.lt.' + new Date(Date.now() - 86400000).toISOString())
    .order('created_at', { ascending: false });

  if (error || !freights) return [];

  const publisherIds = [...new Set(freights.map((f: any) => f.publisher_id))];
  const { data: profiles } = publisherIds.length
    ? await supabase.from('profiles').select('id, name').in('id', publisherIds)
    : { data: [] };
  const nameMap = new Map((profiles || []).map((p: any) => [p.id, p.name]));

  return freights.map((f: any) => ({
    id: f.id,
    freightCode: f.freight_code || f.id.slice(0, 8).toUpperCase(),
    status: f.status,
    issue: f.is_urgent ? 'atrasado' : 'sem_motorista',
    severity: f.is_urgent ? 'critical' : 'high',
    shipper: nameMap.get(f.publisher_id) || 'Embarcador',
    origin: f.origin_city,
    destination: f.destination_city,
    value: Number(f.value_estimate) || 0,
    timeInStatus: '—',
  }));
}

// ─── Notifications ────────────────────────────────────────────────────────────
export async function fetchAdminNotifications() {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('type', 'system')
    .order('created_at', { ascending: false })
    .limit(50);
  
  if (error || !data) return [];
  return data;
}

export async function sendAdminNotification(payload: { title: string, message: string, audience: string, userTypes?: string[] }) {
  // If audience is all, we might need an edge function to fan out
  // For now, let's just insert one 'system' notification if target is specific
  // or a broadcast mechanism if supported.
  // Placeholder for real broadcast logic:
  const { error } = await supabase.from('notifications').insert({
    user_id: '00000000-0000-0000-0000-000000000000', // System target
    title: payload.title,
    message: payload.message,
    type: 'system',
    metadata: { audience: payload.audience, userTypes: payload.userTypes }
  });
  return { error };
}

// ─── Master Settings ─────────────────────────────────────────────────────────
export async function fetchMasterSettings() {
  const { data, error } = await supabase.from('admin_config').select('*').single();
  if (error) return null;
  return data.config;
}

export async function updateMasterSettings(config: any) {
  await supabase.from('admin_config').upsert({ id: 1, config, updated_at: new Date().toISOString() });
}


export async function approveVerificationRequest(userId: string) {
  const { error } = await supabase
    .from('profiles')
    .update({ 
      verification_status: 'verified', 
      status: 'active',
      updated_at: new Date().toISOString() 
    })
    .eq('id', userId);
  return { error };
}

export async function rejectVerificationRequest(userId: string, reason: string) {
  const { error } = await supabase
    .from('profiles')
    .update({ 
      verification_status: 'rejected', 
      status: 'pending',
      metadata: { rejection_reason: reason },
      updated_at: new Date().toISOString() 
    })
    .eq('id', userId);
  return { error };
}

export async function updateSupportTicketStatus(chatId: string, status: string) {
  const isArchived = status === 'resolved' || status === 'closed';
  const { error } = await supabase
    .from('chats')
    .update({ 
      is_archived: isArchived,
      updated_at: new Date().toISOString()
    })
    .eq('id', chatId);
  return { error };
}

export async function sendSupportReply(chatId: string, content: string) {
  const { data: { user } } = await supabase.auth.getUser();
  const adminId = user?.id || '00000000-0000-0000-0000-000000000000';

  const { error } = await supabase
    .from('messages')
    .insert({
      conversation_id: chatId,
      sender_id: adminId,
      content: content,
      message_type: 'text'
    });
  
  if (!error) {
    await supabase.from('chats').update({
      last_message: { content, sender_id: adminId, created_at: new Date().toISOString() },
      updated_at: new Date().toISOString()
    }).eq('id', chatId);
  }

  return { error };
}
