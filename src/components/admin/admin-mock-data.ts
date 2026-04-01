// Mock data for Super Admin Panel

export const SUPER_ADMIN_EMAILS = [
  'admin@moovefretes.com.br',
  'suporte@moovefretes.com.br',
  'dev@moovefretes.com.br',
];

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  userType: 'caminhoneiro' | 'transportadora' | 'embarcador' | 'agenciador';
  status: 'active' | 'pending' | 'blocked' | 'suspended';
  verified: boolean;
  rating: number;
  totalFreights: number;
  phone: string;
  cpfCnpj: string;
  city: string;
  state: string;
  createdAt: string;
  lastLogin: string;
}

export interface AdminCompany {
  id: string;
  name: string;
  cnpj: string;
  type: 'transportadora' | 'embarcador' | 'agenciador';
  status: 'active' | 'pending' | 'blocked';
  owner: string;
  collaborators: number;
  activeFreights: number;
  rntrc: string;
  state: string;
  createdAt: string;
}

export interface AdminFreight {
  id: string;
  code: string;
  status: 'draft' | 'active' | 'scheduled' | 'in_transit' | 'completed' | 'cancelled';
  origin: string;
  destination: string;
  value: number;
  shipper: string;
  carrier: string;
  cargoType: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminTransaction {
  id: string;
  freightCode: string;
  amount: number;
  platformFee: number;
  netAmount: number;
  method: 'pix' | 'transfer' | 'boleto';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  payer: string;
  receiver: string;
  createdAt: string;
}

export interface AdminLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  category: string;
  details: string;
  ip: string;
  createdAt: string;
}

export interface AdminReview {
  id: string;
  fromUser: string;
  toUser: string;
  rating: number;
  comment: string;
  freightCode: string;
  reported: boolean;
  reportReason?: string;
  status: 'visible' | 'hidden' | 'pending_review';
  createdAt: string;
}

export interface AdminMessage {
  id: string;
  from: string;
  to: string;
  content: string;
  freightCode?: string;
  hasAttachment: boolean;
  reported: boolean;
  createdAt: string;
}

// Generate mock users
export const mockUsers: AdminUser[] = [
  { id: '1', email: 'joao.silva@email.com', name: 'João Silva', userType: 'caminhoneiro', status: 'active', verified: true, rating: 4.8, totalFreights: 156, phone: '(11) 99999-1234', cpfCnpj: '123.456.789-00', city: 'São Paulo', state: 'SP', createdAt: '2025-01-15T10:00:00Z', lastLogin: '2026-03-10T08:30:00Z' },
  { id: '2', email: 'maria.santos@transp.com', name: 'Maria Santos', userType: 'transportadora', status: 'active', verified: true, rating: 4.5, totalFreights: 89, phone: '(21) 98888-5678', cpfCnpj: '12.345.678/0001-90', city: 'Rio de Janeiro', state: 'RJ', createdAt: '2025-02-20T14:00:00Z', lastLogin: '2026-03-09T18:45:00Z' },
  { id: '3', email: 'pedro.oliveira@email.com', name: 'Pedro Oliveira', userType: 'embarcador', status: 'pending', verified: false, rating: 0, totalFreights: 0, phone: '(31) 97777-9012', cpfCnpj: '98.765.432/0001-10', city: 'Belo Horizonte', state: 'MG', createdAt: '2026-03-08T09:00:00Z', lastLogin: '2026-03-08T09:00:00Z' },
  { id: '4', email: 'ana.costa@email.com', name: 'Ana Costa', userType: 'caminhoneiro', status: 'active', verified: true, rating: 4.9, totalFreights: 234, phone: '(41) 96666-3456', cpfCnpj: '987.654.321-00', city: 'Curitiba', state: 'PR', createdAt: '2024-11-10T11:00:00Z', lastLogin: '2026-03-10T07:15:00Z' },
  { id: '5', email: 'carlos.ferreira@agencia.com', name: 'Carlos Ferreira', userType: 'agenciador', status: 'blocked', verified: true, rating: 2.1, totalFreights: 12, phone: '(51) 95555-7890', cpfCnpj: '456.789.123-00', city: 'Porto Alegre', state: 'RS', createdAt: '2025-06-05T16:00:00Z', lastLogin: '2026-02-15T22:00:00Z' },
  { id: '6', email: 'lucia.mendes@transp.com', name: 'Lúcia Mendes', userType: 'transportadora', status: 'active', verified: true, rating: 4.7, totalFreights: 178, phone: '(62) 94444-1234', cpfCnpj: '11.222.333/0001-44', city: 'Goiânia', state: 'GO', createdAt: '2025-03-12T08:00:00Z', lastLogin: '2026-03-10T09:00:00Z' },
  { id: '7', email: 'roberto.lima@email.com', name: 'Roberto Lima', userType: 'caminhoneiro', status: 'suspended', verified: true, rating: 3.2, totalFreights: 45, phone: '(85) 93333-5678', cpfCnpj: '321.654.987-00', city: 'Fortaleza', state: 'CE', createdAt: '2025-08-20T13:00:00Z', lastLogin: '2026-01-30T14:00:00Z' },
  { id: '8', email: 'fernanda.alves@email.com', name: 'Fernanda Alves', userType: 'embarcador', status: 'active', verified: true, rating: 4.6, totalFreights: 67, phone: '(71) 92222-9012', cpfCnpj: '55.666.777/0001-88', city: 'Salvador', state: 'BA', createdAt: '2025-04-18T10:00:00Z', lastLogin: '2026-03-09T16:30:00Z' },
  { id: '9', email: 'marcos.souza@email.com', name: 'Marcos Souza', userType: 'caminhoneiro', status: 'active', verified: true, rating: 4.4, totalFreights: 98, phone: '(27) 91111-3456', cpfCnpj: '654.321.987-00', city: 'Vitória', state: 'ES', createdAt: '2025-05-25T15:00:00Z', lastLogin: '2026-03-10T06:45:00Z' },
  { id: '10', email: 'patricia.rocha@transp.com', name: 'Patrícia Rocha', userType: 'transportadora', status: 'pending', verified: false, rating: 0, totalFreights: 0, phone: '(48) 90000-7890', cpfCnpj: '77.888.999/0001-22', city: 'Florianópolis', state: 'SC', createdAt: '2026-03-09T11:00:00Z', lastLogin: '2026-03-09T11:00:00Z' },
  { id: '11', email: 'gustavo.pinto@email.com', name: 'Gustavo Pinto', userType: 'caminhoneiro', status: 'active', verified: true, rating: 4.1, totalFreights: 72, phone: '(67) 98765-4321', cpfCnpj: '111.222.333-44', city: 'Campo Grande', state: 'MS', createdAt: '2025-07-14T09:00:00Z', lastLogin: '2026-03-10T10:00:00Z' },
  { id: '12', email: 'isabela.martins@email.com', name: 'Isabela Martins', userType: 'embarcador', status: 'active', verified: true, rating: 4.3, totalFreights: 134, phone: '(65) 97654-3210', cpfCnpj: '33.444.555/0001-66', city: 'Cuiabá', state: 'MT', createdAt: '2025-01-28T12:00:00Z', lastLogin: '2026-03-09T20:00:00Z' },
];

export const mockCompanies: AdminCompany[] = [
  { id: '1', name: 'TransLog Express LTDA', cnpj: '12.345.678/0001-90', type: 'transportadora', status: 'active', owner: 'Maria Santos', collaborators: 8, activeFreights: 23, rntrc: '12345678', state: 'RJ', createdAt: '2025-02-20T14:00:00Z' },
  { id: '2', name: 'Mendes Transportes ME', cnpj: '11.222.333/0001-44', type: 'transportadora', status: 'active', owner: 'Lúcia Mendes', collaborators: 15, activeFreights: 41, rntrc: '87654321', state: 'GO', createdAt: '2025-03-12T08:00:00Z' },
  { id: '3', name: 'Alves Indústria S/A', cnpj: '55.666.777/0001-88', type: 'embarcador', status: 'active', owner: 'Fernanda Alves', collaborators: 5, activeFreights: 12, rntrc: '', state: 'BA', createdAt: '2025-04-18T10:00:00Z' },
  { id: '4', name: 'Rocha Logística EIRELI', cnpj: '77.888.999/0001-22', type: 'transportadora', status: 'pending', owner: 'Patrícia Rocha', collaborators: 0, activeFreights: 0, rntrc: '11223344', state: 'SC', createdAt: '2026-03-09T11:00:00Z' },
  { id: '5', name: 'Oliveira Distribuição LTDA', cnpj: '98.765.432/0001-10', type: 'embarcador', status: 'pending', owner: 'Pedro Oliveira', collaborators: 0, activeFreights: 0, rntrc: '', state: 'MG', createdAt: '2026-03-08T09:00:00Z' },
  { id: '6', name: 'Martins Agro Export', cnpj: '33.444.555/0001-66', type: 'embarcador', status: 'active', owner: 'Isabela Martins', collaborators: 3, activeFreights: 8, rntrc: '', state: 'MT', createdAt: '2025-01-28T12:00:00Z' },
];

export const mockFreights: AdminFreight[] = [
  { id: '1', code: 'FRT-2026-001', status: 'active', origin: 'São Paulo, SP', destination: 'Rio de Janeiro, RJ', value: 4500, shipper: 'Alves Indústria S/A', carrier: '', cargoType: 'Carga Geral', createdAt: '2026-03-10T08:00:00Z', updatedAt: '2026-03-10T08:00:00Z' },
  { id: '2', code: 'FRT-2026-002', status: 'in_transit', origin: 'Curitiba, PR', destination: 'Belo Horizonte, MG', value: 6200, shipper: 'Martins Agro Export', carrier: 'João Silva', cargoType: 'Grãos', createdAt: '2026-03-08T10:00:00Z', updatedAt: '2026-03-09T14:00:00Z' },
  { id: '3', code: 'FRT-2026-003', status: 'completed', origin: 'Goiânia, GO', destination: 'Salvador, BA', value: 8900, shipper: 'Alves Indústria S/A', carrier: 'Mendes Transportes ME', cargoType: 'Produtos Industriais', createdAt: '2026-03-01T09:00:00Z', updatedAt: '2026-03-07T16:00:00Z' },
  { id: '4', code: 'FRT-2026-004', status: 'cancelled', origin: 'Porto Alegre, RS', destination: 'Florianópolis, SC', value: 2800, shipper: 'Oliveira Distribuição LTDA', carrier: '', cargoType: 'Eletrônicos', createdAt: '2026-03-05T11:00:00Z', updatedAt: '2026-03-06T08:00:00Z' },
  { id: '5', code: 'FRT-2026-005', status: 'scheduled', origin: 'Campo Grande, MS', destination: 'Cuiabá, MT', value: 3400, shipper: 'Martins Agro Export', carrier: 'Gustavo Pinto', cargoType: 'Fertilizantes', createdAt: '2026-03-09T15:00:00Z', updatedAt: '2026-03-09T15:00:00Z' },
  { id: '6', code: 'FRT-2026-006', status: 'active', origin: 'Fortaleza, CE', destination: 'Recife, PE', value: 5100, shipper: 'Alves Indústria S/A', carrier: '', cargoType: 'Alimentos', createdAt: '2026-03-10T06:00:00Z', updatedAt: '2026-03-10T06:00:00Z' },
  { id: '7', code: 'FRT-2026-007', status: 'in_transit', origin: 'Vitória, ES', destination: 'São Paulo, SP', value: 7300, shipper: 'Martins Agro Export', carrier: 'Marcos Souza', cargoType: 'Minério', createdAt: '2026-03-07T12:00:00Z', updatedAt: '2026-03-09T10:00:00Z' },
  { id: '8', code: 'FRT-2026-008', status: 'completed', origin: 'Salvador, BA', destination: 'Goiânia, GO', value: 9500, shipper: 'Alves Indústria S/A', carrier: 'Ana Costa', cargoType: 'Máquinas Pesadas', createdAt: '2026-02-25T08:00:00Z', updatedAt: '2026-03-04T18:00:00Z' },
  { id: '9', code: 'FRT-2026-009', status: 'active', origin: 'Belo Horizonte, MG', destination: 'Brasília, DF', value: 4100, shipper: 'Oliveira Distribuição LTDA', carrier: '', cargoType: 'Materiais de Construção', createdAt: '2026-03-10T07:00:00Z', updatedAt: '2026-03-10T07:00:00Z' },
  { id: '10', code: 'FRT-2026-010', status: 'draft', origin: 'Manaus, AM', destination: 'Belém, PA', value: 12000, shipper: 'Martins Agro Export', carrier: '', cargoType: 'Carga Refrigerada', createdAt: '2026-03-10T09:00:00Z', updatedAt: '2026-03-10T09:00:00Z' },
];

export const mockTransactions: AdminTransaction[] = [
  { id: '1', freightCode: 'FRT-2026-003', amount: 8900, platformFee: 445, netAmount: 8455, method: 'pix', status: 'completed', payer: 'Alves Indústria S/A', receiver: 'Mendes Transportes ME', createdAt: '2026-03-07T16:30:00Z' },
  { id: '2', freightCode: 'FRT-2026-008', amount: 9500, platformFee: 475, netAmount: 9025, method: 'transfer', status: 'completed', payer: 'Alves Indústria S/A', receiver: 'Ana Costa', createdAt: '2026-03-04T19:00:00Z' },
  { id: '3', freightCode: 'FRT-2026-002', amount: 6200, platformFee: 310, netAmount: 5890, method: 'pix', status: 'pending', payer: 'Martins Agro Export', receiver: 'João Silva', createdAt: '2026-03-09T14:30:00Z' },
  { id: '4', freightCode: 'FRT-2026-007', amount: 7300, platformFee: 365, netAmount: 6935, method: 'boleto', status: 'processing', payer: 'Martins Agro Export', receiver: 'Marcos Souza', createdAt: '2026-03-09T11:00:00Z' },
  { id: '5', freightCode: 'FRT-2026-004', amount: 2800, platformFee: 140, netAmount: 2660, method: 'pix', status: 'refunded', payer: 'Oliveira Distribuição LTDA', receiver: '', createdAt: '2026-03-06T09:00:00Z' },
];

export const mockLogs: AdminLog[] = [
  { id: '1', userId: '1', userName: 'João Silva', action: 'login', category: 'auth', details: 'Login via email/senha', ip: '189.100.45.67', createdAt: '2026-03-10T08:30:00Z' },
  { id: '2', userId: '4', userName: 'Ana Costa', action: 'freight_completed', category: 'freight', details: 'Frete FRT-2026-008 concluído', ip: '200.150.30.12', createdAt: '2026-03-10T07:15:00Z' },
  { id: '3', userId: '6', userName: 'Lúcia Mendes', action: 'collaborator_added', category: 'company', details: 'Novo colaborador adicionado: carlos@mendes.com', ip: '177.88.20.45', createdAt: '2026-03-10T09:00:00Z' },
  { id: '4', userId: '5', userName: 'Carlos Ferreira', action: 'user_blocked', category: 'admin', details: 'Usuário bloqueado por violação de termos', ip: '192.168.1.100', createdAt: '2026-03-09T22:00:00Z' },
  { id: '5', userId: '8', userName: 'Fernanda Alves', action: 'freight_created', category: 'freight', details: 'Frete FRT-2026-006 criado: Fortaleza → Recife', ip: '201.77.55.89', createdAt: '2026-03-10T06:00:00Z' },
  { id: '6', userId: '2', userName: 'Maria Santos', action: 'quote_sent', category: 'freight', details: 'Cotação enviada para FRT-2026-001: R$ 4.500', ip: '186.220.10.33', createdAt: '2026-03-10T08:45:00Z' },
  { id: '7', userId: '9', userName: 'Marcos Souza', action: 'availability_updated', category: 'driver', details: 'Disponibilidade ativada por 24h', ip: '179.55.80.21', createdAt: '2026-03-10T06:45:00Z' },
  { id: '8', userId: '12', userName: 'Isabela Martins', action: 'payment_sent', category: 'financial', details: 'Pagamento PIX de R$ 6.200 para FRT-2026-002', ip: '168.90.40.67', createdAt: '2026-03-09T14:30:00Z' },
  { id: '9', userId: '3', userName: 'Pedro Oliveira', action: 'signup', category: 'auth', details: 'Novo cadastro: Embarcador', ip: '200.180.60.90', createdAt: '2026-03-08T09:00:00Z' },
  { id: '10', userId: '11', userName: 'Gustavo Pinto', action: 'route_published', category: 'route', details: 'Rota preferida publicada: Campo Grande → Cuiabá', ip: '187.45.70.12', createdAt: '2026-03-09T15:30:00Z' },
];

export const mockReviews: AdminReview[] = [
  { id: '1', fromUser: 'Fernanda Alves', toUser: 'Ana Costa', rating: 5, comment: 'Excelente motorista, entrega antes do prazo!', freightCode: 'FRT-2026-008', reported: false, status: 'visible', createdAt: '2026-03-05T10:00:00Z' },
  { id: '2', fromUser: 'Isabela Martins', toUser: 'João Silva', rating: 4, comment: 'Bom profissional, comunicação poderia ser melhor.', freightCode: 'FRT-2026-002', reported: false, status: 'visible', createdAt: '2026-03-09T16:00:00Z' },
  { id: '3', fromUser: 'João Silva', toUser: 'Carlos Ferreira', rating: 1, comment: 'Agenciador desonesto, cobrou taxa abusiva.', freightCode: 'FRT-2025-089', reported: true, reportReason: 'Linguagem ofensiva e acusações sem provas', status: 'pending_review', createdAt: '2026-02-14T20:00:00Z' },
  { id: '4', fromUser: 'Ana Costa', toUser: 'Alves Indústria S/A', rating: 5, comment: 'Empresa séria, pagamento sempre em dia.', freightCode: 'FRT-2026-008', reported: false, status: 'visible', createdAt: '2026-03-05T11:00:00Z' },
  { id: '5', fromUser: 'Marcos Souza', toUser: 'Martins Agro Export', rating: 3, comment: 'Carga não estava bem preparada, causou atraso.', freightCode: 'FRT-2026-007', reported: true, reportReason: 'Embarcador contesta a avaliação', status: 'pending_review', createdAt: '2026-03-09T12:00:00Z' },
];

export const mockMessages: AdminMessage[] = [
  { id: '1', from: 'João Silva', to: 'Isabela Martins', content: 'Bom dia! Estou a caminho, previsão de chegada às 14h.', freightCode: 'FRT-2026-002', hasAttachment: false, reported: false, createdAt: '2026-03-09T08:00:00Z' },
  { id: '2', from: 'Isabela Martins', to: 'João Silva', content: 'Perfeito, o galpão estará aberto. Obrigada!', freightCode: 'FRT-2026-002', hasAttachment: false, reported: false, createdAt: '2026-03-09T08:05:00Z' },
  { id: '3', from: 'Fernanda Alves', to: 'Ana Costa', content: 'Segue o comprovante do pagamento.', freightCode: 'FRT-2026-008', hasAttachment: true, reported: false, createdAt: '2026-03-04T19:30:00Z' },
  { id: '4', from: 'Carlos Ferreira', to: 'Maria Santos', content: 'Vocês são incompetentes, nunca mais trabalho com essa transportadora!', hasAttachment: false, reported: true, createdAt: '2026-02-14T19:00:00Z' },
  { id: '5', from: 'Marcos Souza', to: 'Isabela Martins', content: 'A carga chegou com pequenos danos na embalagem externa. Envio fotos.', freightCode: 'FRT-2026-007', hasAttachment: true, reported: false, createdAt: '2026-03-09T10:30:00Z' },
];

// KPI data
export const kpiData = {
  totalUsers: 1247,
  activeUsers: 892,
  pendingUsers: 43,
  blockedUsers: 18,
  suspendedUsers: 7,
  onlineNow: 156,
  totalFreights: 3421,
  activeFreights: 187,
  completedFreights: 2834,
  cancelledFreights: 245,
  scheduledFreights: 155,
  totalQuotes: 8923,
  acceptedQuotes: 3421,
  platformRevenue: 287450.00,
  monthlyRevenue: 42380.00,
  avgRating: 4.3,
  totalMessages: 45678,
  recentErrors: 3,
  pendingReports: 7,
  delayedFreights: 4,
};

// Chart data
export const userGrowthData = [
  { month: 'Out', users: 380 },
  { month: 'Nov', users: 520 },
  { month: 'Dez', users: 650 },
  { month: 'Jan', users: 780 },
  { month: 'Fev', users: 1020 },
  { month: 'Mar', users: 1247 },
];

export const freightStatusData = [
  { name: 'Ativos', value: 187, color: '#253663' },
  { name: 'Concluídos', value: 2834, color: '#22c55e' },
  { name: 'Cancelados', value: 245, color: '#ef4444' },
  { name: 'Agendados', value: 155, color: '#f59e0b' },
];

export const revenueData = [
  { month: 'Out', revenue: 28500 },
  { month: 'Nov', revenue: 35200 },
  { month: 'Dez', revenue: 41800 },
  { month: 'Jan', revenue: 38900 },
  { month: 'Fev', revenue: 45600 },
  { month: 'Mar', revenue: 42380 },
];

export const freightsByRegion = [
  { region: 'Sudeste', freights: 1420 },
  { region: 'Sul', freights: 680 },
  { region: 'Nordeste', freights: 520 },
  { region: 'Centro-Oeste', freights: 480 },
  { region: 'Norte', freights: 321 },
];

export const userTypeDistribution = [
  { name: 'Caminhoneiros', value: 620, color: '#253663' },
  { name: 'Transportadoras', value: 280, color: '#3b82f6' },
  { name: 'Embarcadores', value: 245, color: '#22c55e' },
  { name: 'Agenciadores', value: 102, color: '#f59e0b' },
];
