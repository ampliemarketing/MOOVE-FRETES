-- ============================================================
-- MooveFretes — Schema unificado
-- 0015: SEED de dados de demonstração
--   10 caminhoneiros  (auth.users + profiles + drivers)
--   10 empresas       (auth.users + profiles + companies)  -> 5 transportadora, 3 embarcador, 2 agenciador
--   10 fretes         (freights, publicados pelas empresas acima)
--
-- Todos os campos relevantes preenchidos, cobrindo categorias variadas de
-- veículo / carroceria / tipo de carga / operação ANTT.
--
-- IDEMPOTENTE: usa UUIDs fixos + ON CONFLICT, pode rodar de novo sem duplicar.
-- Rodar no SQL Editor do Supabase Studio (precisa de acesso às tabelas auth.*).
-- Senha de todos os usuários demo: Moove@2026
--
-- Para REMOVER tudo depois:
--   delete from auth.users where email like '%@moovedemo.com';
--   (cascata apaga profiles/companies/drivers; fretes:)
--   delete from public.freights where freight_code like 'MF-26-%';
-- ============================================================

-- pgcrypto (crypt/gen_salt) pode estar em `public` ou em `extensions` conforme
-- o projeto — garante que ambos resolvam, seja no SQL Editor ou no `db push`.
set search_path = public, extensions, auth;

-- ------------------------------------------------------------
-- 1. AUTH USERS (20)  — a senha usa crypt/gen_salt (extensão pgcrypto)
-- ------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  '00000000-0000-0000-0000-000000000000',
  u.id, 'authenticated', 'authenticated', u.email,
  crypt('Moove@2026', gen_salt('bf')), now() - (random() * interval '120 days'),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('name', u.name, 'user_type', u.user_type, 'phone', u.phone),
  now() - (random() * interval '120 days'), now(),
  '', '', '', ''
from (values
  -- caminhoneiros
  ('d1111111-1111-4111-8111-000000000001'::uuid, 'joao.mt@moovedemo.com',       'João Batista Nogueira',  'caminhoneiro', '(66) 99961-0001'),
  ('d1111111-1111-4111-8111-000000000002'::uuid, 'marcos.sp@moovedemo.com',     'Marcos Aurélio Lima',    'caminhoneiro', '(19) 99961-0002'),
  ('d1111111-1111-4111-8111-000000000003'::uuid, 'sebastiao.mt@moovedemo.com',  'Sebastião Ferreira',     'caminhoneiro', '(66) 99961-0003'),
  ('d1111111-1111-4111-8111-000000000004'::uuid, 'antonio.go@moovedemo.com',    'Antônio Carlos Souza',   'caminhoneiro', '(64) 99961-0004'),
  ('d1111111-1111-4111-8111-000000000005'::uuid, 'roberto.sp@moovedemo.com',    'Roberto Nunes Vieira',   'caminhoneiro', '(19) 99961-0005'),
  ('d1111111-1111-4111-8111-000000000006'::uuid, 'luiz.sc@moovedemo.com',       'Luiz Henrique Prado',    'caminhoneiro', '(49) 99961-0006'),
  ('d1111111-1111-4111-8111-000000000007'::uuid, 'paulo.pr@moovedemo.com',      'Paulo César Almeida',    'caminhoneiro', '(41) 99961-0007'),
  ('d1111111-1111-4111-8111-000000000008'::uuid, 'fernando.sp@moovedemo.com',   'Fernando Gomes Rocha',   'caminhoneiro', '(11) 99961-0008'),
  ('d1111111-1111-4111-8111-000000000009'::uuid, 'ricardo.mg@moovedemo.com',    'Ricardo Teixeira',       'caminhoneiro', '(31) 99961-0009'),
  ('d1111111-1111-4111-8111-000000000010'::uuid, 'anderson.sp@moovedemo.com',   'Anderson Moreira',       'caminhoneiro', '(11) 99961-0010'),
  -- empresas
  ('c2222222-2222-4222-8222-000000000001'::uuid, 'rotanorte@moovedemo.com',     'Rota Norte Transportes', 'transportadora', '(65) 3300-0001'),
  ('c2222222-2222-4222-8222-000000000002'::uuid, 'logprime@moovedemo.com',      'LogPrime Transportes',   'transportadora', '(19) 3300-0002'),
  ('c2222222-2222-4222-8222-000000000003'::uuid, 'cargauniao@moovedemo.com',    'Coop. CargaUnião',       'transportadora', '(43) 3300-0003'),
  ('c2222222-2222-4222-8222-000000000004'::uuid, 'friolog@moovedemo.com',       'Friolog Refrigerados',   'transportadora', '(49) 3300-0004'),
  ('c2222222-2222-4222-8222-000000000005'::uuid, 'expressosul@moovedemo.com',   'Expresso Sul Cargas',    'transportadora', '(54) 3300-0005'),
  ('c2222222-2222-4222-8222-000000000006'::uuid, 'agrograos@moovedemo.com',     'AgroGrãos Exportadora',  'embarcador',     '(66) 3300-0006'),
  ('c2222222-2222-4222-8222-000000000007'::uuid, 'serraazul@moovedemo.com',     'Bebidas Serra Azul',     'embarcador',     '(31) 3300-0007'),
  ('c2222222-2222-4222-8222-000000000008'::uuid, 'techdist@moovedemo.com',      'TechDistribuição',       'embarcador',     '(11) 3300-0008'),
  ('c2222222-2222-4222-8222-000000000009'::uuid, 'conectafretes@moovedemo.com', 'Conecta Fretes',         'agenciador',     '(62) 3300-0009'),
  ('c2222222-2222-4222-8222-000000000010'::uuid, 'malhalog@moovedemo.com',      'Malha Logística',        'agenciador',     '(16) 3300-0010')
) as u(id, email, name, user_type, phone)
on conflict (id) do nothing;

-- identidade e-mail/senha (necessária p/ login) — protegida contra variações de versão do GoTrue
do $$
begin
  insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  select u.id::text, u.id,
         jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
         'email', now(), now(), now()
  from auth.users u
  where u.email like '%@moovedemo.com'
  on conflict do nothing;
exception when others then
  raise notice 'auth.identities ignorado (%).', sqlerrm;
end $$;

-- ------------------------------------------------------------
-- 2. PROFILES (upsert — enriquece a linha criada pelo trigger handle_new_user)
-- ------------------------------------------------------------
insert into public.profiles (
  id, email, name, phone, cpf, cnpj, user_type, bio, city, state,
  status, verification_status, email_verified, is_online, last_seen,
  rating, total_ratings, total_freights, completed_freights
)
select p.id, p.email, p.name, p.phone, p.cpf, p.cnpj, p.user_type, p.bio, p.city, p.state,
       'active', 'verified', true, (random() < 0.5), now() - (random() * interval '3 days'),
       p.rating, p.total_ratings, p.total_freights, p.completed_freights
from (values
  ('d1111111-1111-4111-8111-000000000001'::uuid, 'joao.mt@moovedemo.com',     'João Batista Nogueira', '(66) 99961-0001', '011.222.333-01', null, 'caminhoneiro', 'Autônomo há 15 anos, especialista em grãos no Centro-Oeste.', 'Sorriso', 'MT', 4.8, 132, 140, 132),
  ('d1111111-1111-4111-8111-000000000002'::uuid, 'marcos.sp@moovedemo.com',   'Marcos Aurélio Lima',   '(19) 99961-0002', '011.222.333-02', null, 'caminhoneiro', 'Carreta LS sider, rotas SP/Sul, carga paletizada.', 'Campinas', 'SP', 4.6, 88, 95, 88),
  ('d1111111-1111-4111-8111-000000000003'::uuid, 'sebastiao.mt@moovedemo.com','Sebastião Ferreira',    '(66) 99961-0003', '011.222.333-03', null, 'caminhoneiro', 'Vanderléia graneleira, safra de soja e milho.', 'Rondonópolis', 'MT', 4.9, 210, 220, 210),
  ('d1111111-1111-4111-8111-000000000004'::uuid, 'antonio.go@moovedemo.com',  'Antônio Carlos Souza',  '(64) 99961-0004', '011.222.333-04', null, 'caminhoneiro', 'Bitrem, grãos e farelo, base em Rio Verde.', 'Rio Verde', 'GO', 4.3, 54, 60, 54),
  ('d1111111-1111-4111-8111-000000000005'::uuid, 'roberto.sp@moovedemo.com',  'Roberto Nunes Vieira',  '(19) 99961-0005', '011.222.333-05', null, 'caminhoneiro', 'Rodotrem tanque, MOPP em dia, transporte de combustível.', 'Paulínia', 'SP', 4.7, 76, 80, 76),
  ('d1111111-1111-4111-8111-000000000006'::uuid, 'luiz.sc@moovedemo.com',     'Luiz Henrique Prado',   '(49) 99961-0006', '011.222.333-06', null, 'caminhoneiro', 'Truck baú frigorífico, cargas refrigeradas do Oeste catarinense.', 'Chapecó', 'SC', 4.5, 61, 66, 61),
  ('d1111111-1111-4111-8111-000000000007'::uuid, 'paulo.pr@moovedemo.com',    'Paulo César Almeida',   '(41) 99961-0007', '011.222.333-07', null, 'caminhoneiro', 'Bitruck sider, carga geral, região metropolitana de Curitiba.', 'Curitiba', 'PR', 4.4, 47, 52, 47),
  ('d1111111-1111-4111-8111-000000000008'::uuid, 'fernando.sp@moovedemo.com', 'Fernando Gomes Rocha',  '(11) 99961-0008', '011.222.333-08', null, 'caminhoneiro', 'Toco baú, e-commerce e distribuição na Grande São Paulo.', 'Guarulhos', 'SP', 4.1, 33, 38, 33),
  ('d1111111-1111-4111-8111-000000000009'::uuid, 'ricardo.mg@moovedemo.com',  'Ricardo Teixeira',      '(31) 99961-0009', '011.222.333-09', null, 'caminhoneiro', 'Caminhão 3/4, entregas fracionadas urbanas em BH.', 'Belo Horizonte', 'MG', 4.2, 40, 44, 40),
  ('d1111111-1111-4111-8111-000000000010'::uuid, 'anderson.sp@moovedemo.com', 'Anderson Moreira',      '(11) 99961-0010', '011.222.333-10', null, 'caminhoneiro', 'Fiorino, encomendas expressas e last mile.', 'São Paulo', 'SP', 4.0, 28, 30, 28),

  ('c2222222-2222-4222-8222-000000000001'::uuid, 'rotanorte@moovedemo.com',     'Rota Norte Transportes', '(65) 3300-0001', null, '11.222.333/0001-01', 'transportadora', 'Transportadora de grãos e insumos no Centro-Oeste.',      'Cuiabá', 'MT', 4.7, 320, 0, 0),
  ('c2222222-2222-4222-8222-000000000002'::uuid, 'logprime@moovedemo.com',      'LogPrime Transportes',   '(19) 3300-0002', null, '11.222.333/0001-02', 'transportadora', 'Frota própria para carga geral paletizada SP e Sul.',     'Campinas', 'SP', 4.8, 540, 0, 0),
  ('c2222222-2222-4222-8222-000000000003'::uuid, 'cargauniao@moovedemo.com',    'Coop. CargaUnião',       '(43) 3300-0003', null, '11.222.333/0001-03', 'transportadora', 'Cooperativa de transporte rodoviário de cargas.',         'Londrina', 'PR', 4.5, 275, 0, 0),
  ('c2222222-2222-4222-8222-000000000004'::uuid, 'friolog@moovedemo.com',       'Friolog Refrigerados',   '(49) 3300-0004', null, '11.222.333/0001-04', 'transportadora', 'Especializada em cargas frigorificadas e refrigeradas.',  'Chapecó', 'SC', 4.6, 190, 0, 0),
  ('c2222222-2222-4222-8222-000000000005'::uuid, 'expressosul@moovedemo.com',   'Expresso Sul Cargas',    '(54) 3300-0005', null, '11.222.333/0001-05', 'transportadora', 'Transportadora equiparada a TAC, operação na Serra Gaúcha.', 'Caxias do Sul', 'RS', 4.3, 96, 0, 0),
  ('c2222222-2222-4222-8222-000000000006'::uuid, 'agrograos@moovedemo.com',     'AgroGrãos Exportadora',  '(66) 3300-0006', null, '11.222.333/0001-06', 'embarcador',     'Trading agrícola, embarque de soja e milho para exportação.', 'Sorriso', 'MT', 4.4, 130, 0, 0),
  ('c2222222-2222-4222-8222-000000000007'::uuid, 'serraazul@moovedemo.com',     'Bebidas Serra Azul',     '(31) 3300-0007', null, '11.222.333/0001-07', 'embarcador',     'Indústria de bebidas, distribuição regional Sudeste.',    'Belo Horizonte', 'MG', 4.5, 210, 0, 0),
  ('c2222222-2222-4222-8222-000000000008'::uuid, 'techdist@moovedemo.com',      'TechDistribuição',       '(11) 3300-0008', null, '11.222.333/0001-08', 'embarcador',     'Distribuidora de eletrônicos, cargas de alto valor agregado.', 'Guarulhos', 'SP', 4.6, 175, 0, 0),
  ('c2222222-2222-4222-8222-000000000009'::uuid, 'conectafretes@moovedemo.com', 'Conecta Fretes',         '(62) 3300-0009', null, '11.222.333/0001-09', 'agenciador',     'Agenciamento de cargas, matching motorista x embarcador.', 'Goiânia', 'GO', 4.2, 88, 0, 0),
  ('c2222222-2222-4222-8222-000000000010'::uuid, 'malhalog@moovedemo.com',      'Malha Logística',        '(16) 3300-0010', null, '11.222.333/0001-10', 'agenciador',     'Agenciador de fretes, foco em rotas interior de SP e MG.', 'Ribeirão Preto', 'SP', 4.3, 112, 0, 0)
) as p(id, email, name, phone, cpf, cnpj, user_type, bio, city, state, rating, total_ratings, total_freights, completed_freights)
on conflict (id) do update set
  phone = excluded.phone,
  cpf = excluded.cpf,
  cnpj = excluded.cnpj,
  user_type = excluded.user_type,
  bio = excluded.bio,
  city = excluded.city,
  state = excluded.state,
  status = 'active',
  verification_status = 'verified',
  email_verified = true,
  rating = excluded.rating,
  total_ratings = excluded.total_ratings,
  total_freights = excluded.total_freights,
  completed_freights = excluded.completed_freights,
  updated_at = now();

-- ------------------------------------------------------------
-- 3. DRIVERS (10) — categorias de veículo/carroceria variadas
-- ------------------------------------------------------------
insert into public.drivers (
  user_id, name, phone, cpf, rg, birth_date,
  cnh, cnh_category, cnh_expiry,
  rntrc, rntrc_expiry, rntrc_status, driver_classification,
  profile_image, vehicle_type, vehicle_plate, vehicle_model, vehicle_year,
  vehicle_capacity, renavam, antt_vehicle, vehicle_types, body_types, trailer_type,
  experience_years, specializations, current_location, address,
  available, availability_expires_at, rating, punctuality, completed_trips
) values
  ('d1111111-1111-4111-8111-000000000001', 'João Batista Nogueira', '(66) 99961-0001', '011.222.333-01', 'MT-1230001', date '1979-03-12',
   '01230000001', 'E', current_date + interval '18 months',
   '11220000001', current_date + interval '10 months', 'ativo', 'TAC',
   null, 'Carreta', 'JBN1A01', 'Scania R450', '2021',
   33000, '01230000001', 'ANTT-000001', array['Carreta'], array['Graneleiro','Grade Baixa'], 'Graneleiro',
   15, array['Grãos','Granel sólido'],
   jsonb_build_object('lat', -12.5426, 'lng', -55.7211, 'city', 'Sorriso', 'state', 'MT', 'lastUpdated', now()),
   jsonb_build_object('street', 'Rod. BR-163, km 745', 'city', 'Sorriso', 'state', 'MT', 'cep', '78890-000'),
   true, now() + interval '5 days', 4.8, 96.5, 132),

  ('d1111111-1111-4111-8111-000000000002', 'Marcos Aurélio Lima', '(19) 99961-0002', '011.222.333-02', 'SP-1230002', date '1985-07-22',
   '01230000002', 'E', current_date + interval '20 months',
   '11220000002', current_date + interval '8 months', 'ativo', 'TAC_AGREGADO',
   null, 'Carreta LS', 'MAL2B02', 'Volvo FH 460', '2020',
   30000, '01230000002', 'ANTT-000002', array['Carreta LS'], array['Sider'], 'Sider',
   11, array['Carga geral','Paletizada'],
   jsonb_build_object('lat', -22.9099, 'lng', -47.0626, 'city', 'Campinas', 'state', 'SP', 'lastUpdated', now()),
   jsonb_build_object('street', 'Av. John Boyd Dunlop, 1200', 'city', 'Campinas', 'state', 'SP', 'cep', '13060-000'),
   true, now() + interval '3 days', 4.6, 92.0, 88),

  ('d1111111-1111-4111-8111-000000000003', 'Sebastião Ferreira', '(66) 99961-0003', '011.222.333-03', 'MT-1230003', date '1972-11-02',
   '01230000003', 'E', current_date + interval '12 months',
   '11220000003', current_date + interval '14 months', 'ativo', 'TAC',
   null, 'Vanderléia', 'SBF3C03', 'Mercedes-Benz Actros 2651', '2022',
   37000, '01230000003', 'ANTT-000003', array['Vanderléia'], array['Graneleiro'], 'Graneleiro',
   22, array['Grãos','Safra','Granel sólido'],
   jsonb_build_object('lat', -16.4707, 'lng', -54.6356, 'city', 'Rondonópolis', 'state', 'MT', 'lastUpdated', now()),
   jsonb_build_object('street', 'Rua dos Tropeiros, 340', 'city', 'Rondonópolis', 'state', 'MT', 'cep', '78700-000'),
   true, now() + interval '7 days', 4.9, 98.2, 210),

  ('d1111111-1111-4111-8111-000000000004', 'Antônio Carlos Souza', '(64) 99961-0004', '011.222.333-04', 'GO-1230004', date '1981-01-19',
   '01230000004', 'E', current_date + interval '6 months',
   '11220000004', current_date + interval '3 months', 'ativo', 'TAC',
   null, 'Bitrem', 'ACS4D04', 'Scania R500', '2019',
   40000, '01230000004', 'ANTT-000004', array['Bitrem'], array['Graneleiro','Grade Baixa'], 'Graneleiro',
   17, array['Grãos','Farelo'],
   jsonb_build_object('lat', -17.7923, 'lng', -50.9192, 'city', 'Rio Verde', 'state', 'GO', 'lastUpdated', now() - interval '2 days'),
   jsonb_build_object('street', 'Av. Presidente Vargas, 900', 'city', 'Rio Verde', 'state', 'GO', 'cep', '75901-000'),
   false, null, 4.3, 85.0, 54),

  ('d1111111-1111-4111-8111-000000000005', 'Roberto Nunes Vieira', '(19) 99961-0005', '011.222.333-05', 'SP-1230005', date '1983-05-30',
   '01230000005', 'E', current_date + interval '22 months',
   '11220000005', current_date + interval '9 months', 'ativo', 'TAC_AGREGADO',
   null, 'Rodotrem', 'RNV5E05', 'Volvo FH 540', '2021',
   45000, '01230000005', 'ANTT-000005', array['Rodotrem'], array['Tanque'], 'Tanque',
   13, array['Carga perigosa','Combustível','MOPP'],
   jsonb_build_object('lat', -22.7592, 'lng', -47.1543, 'city', 'Paulínia', 'state', 'SP', 'lastUpdated', now()),
   jsonb_build_object('street', 'Rod. SP-332, km 128', 'city', 'Paulínia', 'state', 'SP', 'cep', '13140-000'),
   true, now() + interval '4 days', 4.7, 94.0, 76),

  ('d1111111-1111-4111-8111-000000000006', 'Luiz Henrique Prado', '(49) 99961-0006', '011.222.333-06', 'SC-1230006', date '1988-09-08',
   '01230000006', 'D', current_date + interval '16 months',
   '11220000006', current_date + interval '11 months', 'ativo', 'TAC',
   null, 'Truck', 'LHP6F06', 'Mercedes-Benz Atego 2426', '2020',
   14000, '01230000006', 'ANTT-000006', array['Truck'], array['Baú Frigorífico','Baú Refrigerado'], 'Baú Frigorífico',
   9, array['Frigorificada','Refrigerada','Alimentos'],
   jsonb_build_object('lat', -27.1004, 'lng', -52.6152, 'city', 'Chapecó', 'state', 'SC', 'lastUpdated', now()),
   jsonb_build_object('street', 'Av. Nereu Ramos, 2200', 'city', 'Chapecó', 'state', 'SC', 'cep', '89801-000'),
   true, now() + interval '2 days', 4.5, 90.5, 61),

  ('d1111111-1111-4111-8111-000000000007', 'Paulo César Almeida', '(41) 99961-0007', '011.222.333-07', 'PR-1230007', date '1980-12-15',
   '01230000007', 'D', current_date + interval '9 months',
   '11220000007', current_date + interval '5 months', 'ativo', 'TAC',
   null, 'Bitruck', 'PCA7G07', 'Volkswagen Constellation 24.280', '2018',
   16000, '01230000007', 'ANTT-000007', array['Bitruck'], array['Sider','Grade Baixa'], 'Sider',
   19, array['Carga geral','Distribuição'],
   jsonb_build_object('lat', -25.4284, 'lng', -49.2733, 'city', 'Curitiba', 'state', 'PR', 'lastUpdated', now()),
   jsonb_build_object('street', 'Av. das Torres, 4500', 'city', 'Curitiba', 'state', 'PR', 'cep', '81690-000'),
   true, now() + interval '6 days', 4.4, 88.0, 47),

  ('d1111111-1111-4111-8111-000000000008', 'Fernando Gomes Rocha', '(11) 99961-0008', '011.222.333-08', 'SP-1230008', date '1990-02-27',
   '01230000008', 'C', current_date + interval '14 months',
   '11220000008', current_date + interval '7 months', 'ativo', 'TAC',
   null, 'Toco', 'FGR8H08', 'Ford Cargo 1119', '2019',
   6000, '01230000008', 'ANTT-000008', array['Toco'], array['Baú'], 'Baú',
   6, array['E-commerce','Fracionada','Distribuição urbana'],
   jsonb_build_object('lat', -23.4543, 'lng', -46.5337, 'city', 'Guarulhos', 'state', 'SP', 'lastUpdated', now() - interval '1 day'),
   jsonb_build_object('street', 'Av. Monteiro Lobato, 800', 'city', 'Guarulhos', 'state', 'SP', 'cep', '07190-000'),
   false, null, 4.1, 82.0, 33),

  ('d1111111-1111-4111-8111-000000000009', 'Ricardo Teixeira', '(31) 99961-0009', '011.222.333-09', 'MG-1230009', date '1986-06-11',
   '01230000009', 'C', current_date + interval '19 months',
   '11220000009', current_date + interval '12 months', 'ativo', 'TAC',
   null, '3/4', 'RTX9I09', 'Iveco Daily 70C17', '2021',
   3500, '01230000009', 'ANTT-000009', array['3/4'], array['Baú'], 'Baú',
   8, array['Fracionada','Distribuição urbana','Mudanças'],
   jsonb_build_object('lat', -19.9167, 'lng', -43.9345, 'city', 'Belo Horizonte', 'state', 'MG', 'lastUpdated', now()),
   jsonb_build_object('street', 'Av. Cristiano Machado, 3000', 'city', 'Belo Horizonte', 'state', 'MG', 'cep', '31160-000'),
   true, now() + interval '3 days', 4.2, 86.0, 40),

  ('d1111111-1111-4111-8111-000000000010', 'Anderson Moreira', '(11) 99961-0010', '011.222.333-10', 'SP-1230010', date '1993-10-05',
   '01230000010', 'B', current_date + interval '24 months',
   null, null, 'pendente_verificacao', 'TAC',
   null, 'Fiorino', 'ADM0J10', 'Fiat Fiorino Furgão', '2022',
   650, '01230000010', null, array['Fiorino'], array['Baú'], 'Baú',
   4, array['Encomendas','Last mile','Expresso'],
   jsonb_build_object('lat', -23.5505, 'lng', -46.6333, 'city', 'São Paulo', 'state', 'SP', 'lastUpdated', now()),
   jsonb_build_object('street', 'Av. do Estado, 5000', 'city', 'São Paulo', 'state', 'SP', 'cep', '01516-000'),
   true, now() + interval '8 days', 4.0, 80.0, 28)
on conflict (user_id) do nothing;

-- ------------------------------------------------------------
-- 4. COMPANIES (10) — 5 transportadora, 3 embarcador, 2 agenciador
-- ------------------------------------------------------------
insert into public.companies (
  user_id, company_name, trading_name, company_type, company_subtype,
  cnpj, is_individual, state_registration, email, phone, website, description,
  address, certifications, fleet_size, operating_states,
  representative_name, representative_cpf, representative_rg, representative_phone, representative_email, representative_role,
  rntrc, rntrc_expiry, rntrc_status, status, verification_status,
  rating, active_freights, completed_freights, review_count
) values
  ('c2222222-2222-4222-8222-000000000001', 'Rota Norte Transportes Ltda', 'Rota Norte', 'transportadora', 'etc_padrao',
   '11.222.333/0001-01', false, '13.333.444.555', 'contato@rotanorte.com.br', '(65) 3300-0001', 'https://rotanorte.com.br', 'Transportadora rodoviária de grãos, farelo e insumos agrícolas no Centro-Oeste.',
   jsonb_build_object('street', 'Av. Fernando Corrêa da Costa, 2500', 'city', 'Cuiabá', 'state', 'MT', 'cep', '78060-000'),
   '["ISO 9001","SASSMAQ"]'::jsonb, 45, array['MT','GO','SP','PR','MS'],
   'Carlos Eduardo Prado', '111.222.333-01', '10.111.222', '(65) 99900-0001', 'carlos@rotanorte.com.br', 'Diretor de Operações',
   'RNTRC-10000001', current_date + interval '10 months', 'ativo', 'active', 'verified',
   4.7, 6, 320, 210),

  ('c2222222-2222-4222-8222-000000000002', 'LogPrime Transportes S.A.', 'LogPrime', 'transportadora', 'etc_padrao',
   '11.222.333/0001-02', false, '24.444.555.666', 'comercial@logprime.com.br', '(19) 3300-0002', 'https://logprime.com.br', 'Frota própria para carga geral paletizada, com rastreamento e escolta.',
   jsonb_build_object('street', 'Rod. Anhanguera, km 98', 'city', 'Campinas', 'state', 'SP', 'cep', '13052-000'),
   '["ISO 9001","ISO 14001","SASSMAQ"]'::jsonb, 120, array['SP','MG','RJ','PR','SC','RS'],
   'Fernanda Alves Ribeiro', '111.222.333-02', '11.222.333', '(19) 99900-0002', 'fernanda@logprime.com.br', 'Gerente Comercial',
   'RNTRC-10000002', current_date + interval '14 months', 'ativo', 'active', 'verified',
   4.8, 9, 540, 415),

  ('c2222222-2222-4222-8222-000000000003', 'Cooperativa de Transporte CargaUnião', 'CargaUnião', 'transportadora', 'ctc_cooperativa',
   '11.222.333/0001-03', false, '35.555.666.777', 'sac@cargauniao.coop.br', '(43) 3300-0003', 'https://cargauniao.coop.br', 'Cooperativa de transportadores autônomos de carga, atuação no Sul e Sudeste.',
   jsonb_build_object('street', 'Av. Tiradentes, 4100', 'city', 'Londrina', 'state', 'PR', 'cep', '86072-000'),
   '["OCB"]'::jsonb, 80, array['PR','SP','SC','MS','MG'],
   'José Roberto Menezes', '111.222.333-03', '12.333.444', '(43) 99900-0003', 'jose@cargauniao.coop.br', 'Presidente',
   'RNTRC-10000003', current_date + interval '7 months', 'ativo', 'active', 'verified',
   4.5, 4, 275, 180),

  ('c2222222-2222-4222-8222-000000000004', 'Friolog Transportes Refrigerados Ltda', 'Friolog', 'transportadora', 'etc_padrao',
   '11.222.333/0001-04', false, '46.666.777.888', 'operacoes@friolog.com.br', '(49) 3300-0004', 'https://friolog.com.br', 'Especializada em cargas frigorificadas e refrigeradas (carnes, laticínios, congelados).',
   jsonb_build_object('street', 'Rua Marechal Deodoro, 1500', 'city', 'Chapecó', 'state', 'SC', 'cep', '89802-000'),
   '["ISO 22000","SASSMAQ"]'::jsonb, 30, array['SC','RS','PR','SP'],
   'Marina Foppa', '111.222.333-04', '13.444.555', '(49) 99900-0004', 'marina@friolog.com.br', 'Coordenadora de Frota',
   'RNTRC-10000004', current_date + interval '9 months', 'ativo', 'active', 'verified',
   4.6, 3, 190, 132),

  ('c2222222-2222-4222-8222-000000000005', 'Expresso Sul Cargas ME', 'Expresso Sul', 'transportadora', 'tac_equiparado',
   '11.222.333/0001-05', true, null, 'contato@expressosul.com.br', '(54) 3300-0005', null, 'Transportadora equiparada a TAC, operação regional na Serra Gaúcha.',
   jsonb_build_object('street', 'Rua Os Dezoito do Forte, 600', 'city', 'Caxias do Sul', 'state', 'RS', 'cep', '95020-000'),
   '[]'::jsonb, 8, array['RS','SC','PR'],
   'Gustavo Bencke', '111.222.333-05', '14.555.666', '(54) 99900-0005', 'gustavo@expressosul.com.br', 'Proprietário',
   'RNTRC-10000005', current_date + interval '4 months', 'ativo', 'active', 'verified',
   4.3, 2, 96, 61),

  ('c2222222-2222-4222-8222-000000000006', 'AgroGrãos Exportadora Ltda', 'AgroGrãos', 'embarcador', 'etc_padrao',
   '11.222.333/0001-06', false, '57.777.888.999', 'logistica@agrograos.com.br', '(66) 3300-0006', 'https://agrograos.com.br', 'Trading agrícola, originação e embarque de soja e milho para portos.',
   jsonb_build_object('street', 'Rod. BR-163, km 760', 'city', 'Sorriso', 'state', 'MT', 'cep', '78890-000'),
   '["ABICEV"]'::jsonb, null, array['MT','PA','GO','MS'],
   'Ana Paula Kremer', '111.222.333-06', '15.666.777', '(66) 99900-0006', 'anapaula@agrograos.com.br', 'Gerente de Logística',
   null, null, 'pendente_verificacao', 'active', 'verified',
   4.4, 5, 130, 88),

  ('c2222222-2222-4222-8222-000000000007', 'Indústria de Bebidas Serra Azul S.A.', 'Serra Azul', 'embarcador', 'etc_padrao',
   '11.222.333/0001-07', false, '68.888.999.000', 'expedicao@serraazul.com.br', '(31) 3300-0007', 'https://serraazul.com.br', 'Indústria de bebidas (águas, refrigerantes e cervejas), distribuição no Sudeste.',
   jsonb_build_object('street', 'Rod. Fernão Dias, km 420', 'city', 'Belo Horizonte', 'state', 'MG', 'cep', '31170-000'),
   '["ISO 9001","FSSC 22000"]'::jsonb, null, array['MG','SP','RJ','ES','BA'],
   'Rodrigo Sampaio', '111.222.333-07', '16.777.888', '(31) 99900-0007', 'rodrigo@serraazul.com.br', 'Supervisor de Expedição',
   null, null, 'pendente_verificacao', 'active', 'verified',
   4.5, 4, 210, 150),

  ('c2222222-2222-4222-8222-000000000008', 'TechDistribuição Eletrônicos Ltda', 'TechDist', 'embarcador', 'etc_padrao',
   '11.222.333/0001-08', false, '79.999.000.111', 'supply@techdist.com.br', '(11) 3300-0008', 'https://techdist.com.br', 'Distribuidora de eletrônicos e informática, cargas de alto valor agregado.',
   jsonb_build_object('street', 'Av. Papa João XXIII, 1200', 'city', 'Guarulhos', 'state', 'SP', 'cep', '07115-000'),
   '["ISO 28000"]'::jsonb, null, array['SP','RJ','PR','MG','DF'],
   'Juliana Watanabe', '111.222.333-08', '17.888.999', '(11) 99900-0008', 'juliana@techdist.com.br', 'Coordenadora de Supply Chain',
   null, null, 'pendente_verificacao', 'active', 'verified',
   4.6, 3, 175, 130),

  ('c2222222-2222-4222-8222-000000000009', 'Conecta Fretes Agenciamento Ltda', 'Conecta Fretes', 'agenciador', 'etc_padrao',
   '11.222.333/0001-09', false, '80.000.111.222', 'operacao@conectafretes.com.br', '(62) 3300-0009', 'https://conectafretes.com.br', 'Agenciamento de cargas, conectando embarcadores a transportadores e autônomos.',
   jsonb_build_object('street', 'Av. 85, 2100', 'city', 'Goiânia', 'state', 'GO', 'cep', '74160-000'),
   '[]'::jsonb, null, array['GO','MT','MG','SP','BA','TO'],
   'Thiago Barcelos', '111.222.333-09', '18.999.000', '(62) 99900-0009', 'thiago@conectafretes.com.br', 'Head de Operações',
   'RNTRC-10000009', current_date + interval '12 months', 'ativo', 'active', 'verified',
   4.2, 7, 88, 55),

  ('c2222222-2222-4222-8222-000000000010', 'Malha Logística Agenciamento ME', 'Malha Log', 'agenciador', 'etc_padrao',
   '11.222.333/0001-10', false, '91.111.222.333', 'contato@malhalog.com.br', '(16) 3300-0010', null, 'Agenciador de fretes com foco em rotas do interior de SP, MG e Centro-Oeste.',
   jsonb_build_object('street', 'Av. Presidente Vargas, 2500', 'city', 'Ribeirão Preto', 'state', 'SP', 'cep', '14020-000'),
   '[]'::jsonb, null, array['SP','MG','MT','GO','MS'],
   'Patrícia Nascimento', '111.222.333-10', '19.000.111', '(16) 99900-0010', 'patricia@malhalog.com.br', 'Sócia-Gerente',
   'RNTRC-10000010', current_date + interval '6 months', 'ativo', 'active', 'verified',
   4.3, 5, 112, 70)
on conflict (user_id) do nothing;

-- ------------------------------------------------------------
-- 5. FREIGHTS (10) — categorias de carga / operação ANTT / veículo variadas
--    status active/scheduled p/ ficarem visíveis a todos (RLS 0007).
-- ------------------------------------------------------------
insert into public.freights (
  id, freight_code, title, description, publisher_id, publisher_phone, created_by,
  status, visibility,
  origin_city, origin_state, origin_address, origin_cep,
  destination_city, destination_state, destination_address, destination_cep,
  cargo_type, weight_kg, volume_m3, quantity, vehicle_types, body_types, requirements,
  value_estimate, distance_km, duration_hours,
  is_urgent, is_fractioned, is_full_load,
  pickup_date, delivery_date, deadline_date,
  operation_type, load_classification, piso_minimo_valor, abaixo_do_piso,
  ciot_status, vale_pedagio_status, payment_account_type, advance_payment_percent,
  views_count, published_at
) values
  ('f3333333-3333-4333-8333-000000000001', 'MF-26-0001', 'Soja a granel — Sorriso/MT → Rondonópolis/MT',
   'Carga de soja em grão, 33 t, granel sólido. Carreta graneleira. Descarga em terminal.',
   'c2222222-2222-4222-8222-000000000006', '(66) 3300-0006', 'c2222222-2222-4222-8222-000000000006',
   'active', 'public',
   'Sorriso', 'MT', 'Rod. BR-163, km 760', '78890-000',
   'Rondonópolis', 'MT', 'Terminal Intermodal, s/n', '78740-000',
   'Grãos', 33000, 40, '1 carga fechada', array['Carreta','Vanderléia'], array['Graneleiro'],
   jsonb_build_object('lona', true, 'rastreador', true, 'seguro', 'RCTR-C'),
   9800, 520, 9,
   true, false, true,
   now() + interval '2 days', now() + interval '3 days', now() + interval '4 days',
   'TAC', 'lotacao', 8650.00, false,
   'generated', 'registered', 'propria', 30,
   42, now() - interval '1 day'),

  ('f3333333-3333-4333-8333-000000000002', 'MF-26-0002', 'Carga geral paletizada — Campinas/SP → Curitiba/PR',
   'Produtos de consumo paletizados, 28 t, 90 m³. Sider. Agendamento de entrega obrigatório.',
   'c2222222-2222-4222-8222-000000000002', '(19) 3300-0002', 'c2222222-2222-4222-8222-000000000002',
   'active', 'public',
   'Campinas', 'SP', 'Rod. Anhanguera, km 98', '13052-000',
   'Curitiba', 'PR', 'CD Cidade Industrial, Av. das Torres, 4500', '81690-000',
   'Carga Geral', 28000, 90, '30 paletes PBR', array['Carreta LS','Carreta','Bitruck'], array['Sider','Baú'],
   jsonb_build_object('agendamento', true, 'rastreador', true, 'paletizado', true),
   6200, 410, 7,
   false, false, true,
   now() + interval '1 day', now() + interval '2 days', now() + interval '3 days',
   'ETC_FROTA_PROPRIA', 'lotacao', 5400.00, false,
   'not_required', 'not_applicable', 'propria', 0,
   77, now() - interval '2 days'),

  ('f3333333-3333-4333-8333-000000000003', 'MF-26-0003', 'Milho a granel — Londrina/PR → Paranaguá/PR',
   'Milho para exportação, 40 t, bitrem graneleiro. Fila no porto — necessário paciência operacional.',
   'c2222222-2222-4222-8222-000000000003', '(43) 3300-0003', 'c2222222-2222-4222-8222-000000000003',
   'active', 'public',
   'Londrina', 'PR', 'Av. Tiradentes, 4100', '86072-000',
   'Paranaguá', 'PR', 'Porto de Paranaguá, Corredor de Exportação', '83203-000',
   'Grãos', 40000, 48, '1 carga fechada', array['Bitrem','Rodotrem'], array['Graneleiro'],
   jsonb_build_object('lona', true, 'rastreador', true, 'porto', true),
   7100, 360, 6,
   false, false, true,
   now() + interval '3 days', now() + interval '4 days', now() + interval '6 days',
   'CTC', 'lotacao', 6300.00, false,
   'generated', 'registered', 'propria', 40,
   35, now() - interval '3 days'),

  ('f3333333-3333-4333-8333-000000000004', 'MF-26-0004', 'Carne congelada — Chapecó/SC → São Paulo/SP',
   'Carga frigorificada -18°C, 14 t. Baú frigorífico com registrador de temperatura. Urgente.',
   'c2222222-2222-4222-8222-000000000004', '(49) 3300-0004', 'c2222222-2222-4222-8222-000000000004',
   'active', 'private',
   'Chapecó', 'SC', 'Rua Marechal Deodoro, 1500', '89802-000',
   'São Paulo', 'SP', 'CEAGESP, Av. Dr. Gastão Vidigal, 1946', '05314-000',
   'Frigorificada', 14000, 42, '1 carga fechada', array['Truck','Carreta'], array['Baú Frigorífico','Baú Refrigerado'],
   jsonb_build_object('temperatura', '-18C', 'registrador_temp', true, 'higienizacao', true, 'rastreador', true),
   8900, 640, 11,
   true, false, true,
   now() + interval '1 day', now() + interval '2 days', now() + interval '2 days',
   'ETC_SUBCONTRATACAO', 'lotacao', 7800.00, false,
   'pending', 'registered', 'terceiro_autorizado', 50,
   58, now() - interval '12 hours'),

  ('f3333333-3333-4333-8333-000000000005', 'MF-26-0005', 'Farelo de soja — Sorriso/MT → Santos/SP',
   'Farelo de soja ensacado em big bags, 45 t. Rodotrem. Embarque programado para exportação.',
   'c2222222-2222-4222-8222-000000000006', '(66) 3300-0006', 'c2222222-2222-4222-8222-000000000006',
   'scheduled', 'public',
   'Sorriso', 'MT', 'Rod. BR-163, km 760', '78890-000',
   'Santos', 'SP', 'Porto de Santos, Armazém 29', '11013-000',
   'Insumos Agrícolas', 45000, 55, '30 big bags de 1500 kg', array['Rodotrem','Bitrem'], array['Graneleiro','Grade Baixa'],
   jsonb_build_object('lona', true, 'rastreador', true, 'agendamento_porto', true),
   16500, 1750, 30,
   false, false, true,
   now() + interval '9 days', now() + interval '12 days', now() + interval '14 days',
   'TAC_AGREGADO', 'lotacao', 15200.00, false,
   'manual_pending', 'pending', 'propria', 25,
   21, now() - interval '4 days'),

  ('f3333333-3333-4333-8333-000000000006', 'MF-26-0006', 'Combustível (diesel S10) — Paulínia/SP → Uberlândia/MG',
   'Produto perigoso classe 3, 30.000 L. Rodotrem tanque. Exige MOPP, CIV/CIPP e kit de emergência.',
   'c2222222-2222-4222-8222-000000000009', '(62) 3300-0009', 'c2222222-2222-4222-8222-000000000009',
   'active', 'public',
   'Paulínia', 'SP', 'Rod. SP-332, km 128 (REPLAN)', '13140-000',
   'Uberlândia', 'MG', 'Base de Distribuição, Av. Rondon Pacheco, 5000', '38405-000',
   'Perigosa', 25000, 30, '30.000 litros', array['Rodotrem'], array['Tanque'],
   jsonb_build_object('mopp', true, 'civ_cipp', true, 'kit_emergencia', true, 'rastreador', true, 'classe_risco', '3'),
   11200, 480, 8,
   false, false, true,
   now() + interval '2 days', now() + interval '3 days', now() + interval '4 days',
   'ETC_FROTA_PROPRIA', 'lotacao', 9900.00, false,
   'generated', 'registered', 'propria', 20,
   44, now() - interval '2 days'),

  ('f3333333-3333-4333-8333-000000000007', 'MF-26-0007', 'Cerveja em lata — Belo Horizonte/MG → Rio de Janeiro/RJ',
   'Bebidas paletizadas, 27 t. Sider. Descarga em CD com hora marcada.',
   'c2222222-2222-4222-8222-000000000007', '(31) 3300-0007', 'c2222222-2222-4222-8222-000000000007',
   'active', 'public',
   'Belo Horizonte', 'MG', 'Rod. Fernão Dias, km 420', '31170-000',
   'Rio de Janeiro', 'RJ', 'CD Pavuna, Av. Nazaré, 3200', '21525-000',
   'Bebidas', 27000, 80, '26 paletes', array['Carreta LS','Carreta','Bitruck'], array['Sider'],
   jsonb_build_object('agendamento', true, 'paletizado', true, 'rastreador', true),
   5300, 440, 8,
   false, false, true,
   now() + interval '2 days', now() + interval '3 days', now() + interval '5 days',
   'ETC_FROTA_PROPRIA', 'lotacao', 4700.00, false,
   'not_required', 'not_applicable', 'propria', 0,
   29, now() - interval '1 day'),

  ('f3333333-3333-4333-8333-000000000008', 'MF-26-0008', 'Eletrônicos (fracionado) — Guarulhos/SP → Campinas/SP',
   'Carga fracionada de eletrônicos, 4 t, alto valor. Baú fechado com lacre e rastreamento redundante.',
   'c2222222-2222-4222-8222-000000000008', '(11) 3300-0008', 'c2222222-2222-4222-8222-000000000008',
   'active', 'public',
   'Guarulhos', 'SP', 'Av. Papa João XXIII, 1200', '07115-000',
   'Campinas', 'SP', 'Rua Bernardo Sayão, 400', '13050-000',
   'Eletrônicos', 4000, 18, '80 volumes', array['Toco','3/4','Truck'], array['Baú'],
   jsonb_build_object('lacre', true, 'rastreador_redundante', true, 'gerenciamento_risco', true, 'escolta_opcional', true),
   2600, 95, 3,
   true, true, false,
   now() + interval '1 day', now() + interval '1 day', now() + interval '2 days',
   'ETC_SUBCONTRATACAO', 'fracionada', 2900.00, true,
   'blocked_below_piso', 'not_applicable', 'terceiro_autorizado', 0,
   63, now() - interval '18 hours'),

  ('f3333333-3333-4333-8333-000000000009', 'MF-26-0009', 'Colheitadeira — Goiânia/GO → Sinop/MT',
   'Máquina agrícola, 12 t, dimensões especiais. Prancha rebaixada. Necessária AET e batedor.',
   'c2222222-2222-4222-8222-000000000009', '(62) 3300-0009', 'c2222222-2222-4222-8222-000000000009',
   'active', 'public',
   'Goiânia', 'GO', 'Av. 85, 2100', '74160-000',
   'Sinop', 'MT', 'Rod. BR-163, km 815', '78550-000',
   'Máquinas', 12000, 60, '1 unidade', array['Carreta'], array['Prancha','Plataforma'],
   jsonb_build_object('aet', true, 'batedor', true, 'carga_dimensao_especial', true, 'amarracao', true),
   14800, 900, 16,
   false, false, true,
   now() + interval '5 days', now() + interval '7 days', now() + interval '9 days',
   'CTC', 'lotacao', 13100.00, false,
   'manual_pending', 'pending', 'propria', 35,
   18, now() - interval '2 days'),

  ('f3333333-3333-4333-8333-000000000010', 'MF-26-0010', 'Fertilizante ensacado — Ribeirão Preto/SP → Rio Verde/GO',
   'Fertilizante NPK em sacaria, 32 t. Bitruck ou carreta graneleira com lona. Carga programada.',
   'c2222222-2222-4222-8222-000000000010', '(16) 3300-0010', 'c2222222-2222-4222-8222-000000000010',
   'scheduled', 'public',
   'Ribeirão Preto', 'SP', 'Av. Presidente Vargas, 2500', '14020-000',
   'Rio Verde', 'GO', 'Rod. BR-060, km 405', '75901-000',
   'Insumos Agrícolas', 32000, 45, '640 sacas de 50 kg', array['Bitruck','Carreta','Truck'], array['Graneleiro','Grade Baixa','Sider'],
   jsonb_build_object('lona', true, 'rastreador', true, 'carga_programada', true),
   8300, 560, 10,
   false, false, true,
   now() + interval '6 days', now() + interval '8 days', now() + interval '10 days',
   'TAC', 'lotacao', 7400.00, false,
   'pending', 'pending', 'propria', 30,
   24, now() - interval '3 days')
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- 6. Ajusta contadores das empresas conforme os fretes semeados
-- ------------------------------------------------------------
update public.companies c set active_freights = sub.n, updated_at = now()
from (
  select publisher_id, count(*) filter (where status in ('active','scheduled')) as n
  from public.freights where freight_code like 'MF-26-%' group by publisher_id
) sub
where c.user_id = sub.publisher_id;
