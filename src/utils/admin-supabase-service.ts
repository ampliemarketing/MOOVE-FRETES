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
}

export async function fetchAdminKPI(): Promise<AdminKPI> {
  const [profilesRes, freightsRes, reviewsRes] = await Promise.all([
    supabase.from('profiles').select('status, rating, is_active, verification_status'),
    supabase.from('freights').select('status'),
    supabase.from('ratings').select('reported, overall_rating'),
  ]);

  const profiles = profilesRes.data || [];
  const freights = freightsRes.data || [];
  const reviews = reviewsRes.data || [];

  const totalUsers = profiles.length;
  const activeUsers = profiles.filter((p: any) => (p.status || 'active') === 'active').length;
  const pendingUsers = profiles.filter((p: any) => (p.status || 'active') === 'pending' || p.verification_status === 'pending').length;
  const blockedUsers = profiles.filter((p: any) => (p.status || 'active') === 'blocked' || p.is_active === false).length;
  const suspendedUsers = profiles.filter((p: any) => (p.status || 'active') === 'suspended').length;

  const totalFreights = freights.length;
  const activeFreights = freights.filter((f: any) => f.status === 'active').length;
  const completedFreights = freights.filter((f: any) => f.status === 'completed').length;
  const cancelledFreights = freights.filter((f: any) => f.status === 'cancelled').length;
  const scheduledFreights = freights.filter((f: any) => f.status === 'scheduled').length;

  const pendingReports = reviews.filter((r: any) => r.reported).length;
  const ratingsWithValue = reviews.filter((r: any) => (r.overall_rating || 0) > 0);
  const avgRating = ratingsWithValue.length
    ? ratingsWithValue.reduce((acc: number, r: any) => acc + (r.overall_rating || 0), 0) / ratingsWithValue.length
    : 0;

  return {
    totalUsers,
    activeUsers,
    pendingUsers,
    blockedUsers,
    suspendedUsers,
    totalFreights,
    activeFreights,
    completedFreights,
    cancelledFreights,
    scheduledFreights,
    pendingReports,
    avgRating,
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
