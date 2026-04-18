import React, { useState, useEffect } from 'react';
import { Eye, CheckCircle, XCircle, MapPin, Truck, Navigation, Shield } from 'lucide-react';
import { AdminDataTable } from './AdminDataTable';
import { supabase } from '../../utils/supabase/client';
import { toast } from 'sonner@2.0.3';

interface AdminDriver {
  id: string;
  name: string;
  email: string;
  cpfCnpj: string;
  phone: string;
  rating: number;
  totalFreights: number;
  city: string;
  state: string;
  vehicleType: string;
  capacity: string;
  available: boolean;
  cnhValid: boolean;
  status: string;
}

async function fetchAdminDrivers(): Promise<AdminDriver[]> {
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name, email, phone, cpf, rating, completed_freights, city, state, status')
    .eq('user_type', 'caminhoneiro')
    .order('created_at', { ascending: false });

  if (!profiles) return [];

  const ids = profiles.map((p: any) => p.id);
  const { data: drivers } = ids.length
    ? await supabase.from('drivers').select('user_id, vehicle_type, vehicle_capacity, cnh, available, address').in('user_id', ids)
    : { data: [] };

  const driverMap = new Map((drivers || []).map((d: any) => [d.user_id, d]));

  return profiles.map((p: any) => {
    const d: any = driverMap.get(p.id) || {};
    return {
      id: p.id,
      name: p.name || p.email || 'Usuário',
      email: p.email || '',
      cpfCnpj: p.cpf || '',
      phone: p.phone || '',
      rating: p.rating || 0,
      totalFreights: p.completed_freights || 0,
      city: d.address?.city || p.city || '',
      state: d.address?.state || p.state || '',
      vehicleType: d.vehicle_type || '',
      capacity: d.vehicle_capacity ? `${d.vehicle_capacity}` : '—',
      available: d.available || false,
      cnhValid: !!d.cnh,
      status: p.status || 'active',
    };
  });
}

export function AdminDrivers() {
  const [driverList, setDriverList] = useState<AdminDriver[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminDrivers().then((data) => { setDriverList(data); setLoading(false); });
  }, []);

  const columns = [
    {
      key: 'name',
      label: 'Motorista',
      render: (d: AdminDriver) => (
        <div>
          <p className="font-[500]">{d.name}</p>
          <p className="text-[0.75rem] text-[var(--muted-foreground)]">{d.cpfCnpj}</p>
        </div>
      ),
    },
    {
      key: 'vehicleType',
      label: 'Veículo',
      render: (d: AdminDriver) => (
        <span className="flex items-center gap-1 text-[0.85rem]">
          <Truck className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
          {d.vehicleType || '—'}
        </span>
      ),
    },
    {
      key: 'capacity',
      label: 'Cap. (t)',
    },
    {
      key: 'available',
      label: 'Disponível',
      render: (d: AdminDriver) => (
        <span className={`inline-flex px-2 py-0.5 rounded-full text-[0.75rem] font-[500] ${d.available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {d.available ? 'Sim' : 'Não'}
        </span>
      ),
    },
    {
      key: 'cnhValid',
      label: 'CNH',
      render: (d: AdminDriver) => (
        <span className={`inline-flex items-center gap-1 text-[0.8rem] ${d.cnhValid ? 'text-green-600' : 'text-amber-600'}`}>
          {d.cnhValid ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
          {d.cnhValid ? 'Válida' : 'Pendente'}
        </span>
      ),
    },
    {
      key: 'rating',
      label: 'Rating',
      render: (d: AdminDriver) => <span>{d.rating > 0 ? `★ ${d.rating.toFixed(1)}` : '—'}</span>,
    },
    {
      key: 'city',
      label: 'Localização',
      render: (d: AdminDriver) => (
        <span className="flex items-center gap-1 text-[0.85rem]">
          <MapPin className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
          {[d.city, d.state].filter(Boolean).join(', ') || '—'}
        </span>
      ),
    },
    {
      key: 'totalFreights',
      label: 'Fretes',
    },
    {
      key: 'actions',
      label: 'Ações',
      sortable: false,
      render: (d: AdminDriver) => (
        <div className="flex items-center gap-1">
          <button onClick={() => toast.info(`Perfil de ${d.name}`)} className="p-1.5 rounded-[0.5rem] hover:bg-[var(--background)] text-[var(--muted-foreground)] hover:text-[#253663]" title="Ver perfil">
            <Eye className="w-4 h-4" />
          </button>
          {!d.cnhValid && (
            <button onClick={() => toast.success(`CNH de ${d.name} validada`)} className="p-1.5 rounded-[0.5rem] hover:bg-green-50 text-[var(--muted-foreground)] hover:text-green-600" title="Validar CNH">
              <Shield className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  if (loading) return <div className="flex items-center justify-center py-12 text-[var(--muted-foreground)]">Carregando motoristas...</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-[0.75rem] border border-[var(--border)] p-3 text-center">
          <p className="text-[1.25rem] font-[500] text-[#253663]">{driverList.length}</p>
          <p className="text-[0.75rem] text-[var(--muted-foreground)]">Total</p>
        </div>
        <div className="bg-white rounded-[0.75rem] border border-[var(--border)] p-3 text-center">
          <p className="text-[1.25rem] font-[500] text-green-600">{driverList.filter(d => d.available).length}</p>
          <p className="text-[0.75rem] text-[var(--muted-foreground)]">Disponíveis</p>
        </div>
        <div className="bg-white rounded-[0.75rem] border border-[var(--border)] p-3 text-center">
          <p className="text-[1.25rem] font-[500] text-green-600">{driverList.filter(d => d.cnhValid).length}</p>
          <p className="text-[0.75rem] text-[var(--muted-foreground)]">CNH Válida</p>
        </div>
        <div className="bg-white rounded-[0.75rem] border border-[var(--border)] p-3 text-center">
          <p className="text-[1.25rem] font-[500] text-amber-500">{driverList.filter(d => !d.cnhValid).length}</p>
          <p className="text-[0.75rem] text-[var(--muted-foreground)]">CNH Pendente</p>
        </div>
      </div>

      <div className="bg-white rounded-[0.75rem] border border-[var(--border)] p-5">
        <h3 className="font-[500] text-[var(--foreground)] mb-3 flex items-center gap-2">
          <Navigation className="w-4 h-4 text-[#253663]" />
          Mapa de Motoristas Online
        </h3>
        <div className="bg-[var(--background)] rounded-[0.75rem] h-48 flex items-center justify-center text-[var(--muted-foreground)] text-[0.85rem] border border-dashed border-[var(--border)]">
          <div className="text-center">
            <MapPin className="w-8 h-8 mx-auto mb-2 text-[var(--muted-foreground)] opacity-50" />
            <p>Mapa interativo com {driverList.filter(d => d.available).length} motoristas online</p>
            <p className="text-[0.75rem] mt-1">(Integração com Google Maps / Mapbox)</p>
          </div>
        </div>
      </div>

      <AdminDataTable
        data={driverList}
        columns={columns}
        searchPlaceholder="Buscar por nome, CPF, veículo, cidade..."
        searchKeys={['name', 'cpfCnpj', 'vehicleType', 'city']}
        title="motoristas"
      />
    </div>
  );
}
