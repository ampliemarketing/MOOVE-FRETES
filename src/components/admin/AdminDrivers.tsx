import React, { useState } from 'react';
import { Eye, CheckCircle, XCircle, MapPin, Truck, Navigation, Shield } from 'lucide-react';
import { AdminDataTable } from './AdminDataTable';
import { mockUsers, type AdminUser } from './admin-mock-data';
import { toast } from 'sonner@2.0.3';

const drivers = mockUsers.filter(u => u.userType === 'caminhoneiro').map((u, i) => ({
  ...u,
  cnhValid: u.verified,
  vehicleType: ['Truck', 'Carreta', 'Bitrem', 'Toco', 'VUC'][i % 5],
  capacity: [25, 40, 57, 15, 8][i % 5],
  available: i % 3 !== 2,
  currentLocation: u.city,
  preferredRoutes: i % 2 === 0 ? `${u.city} → São Paulo` : `São Paulo → ${u.city}`,
  anttValid: u.verified,
}));

export function AdminDrivers() {
  const [driverList] = useState(drivers);

  const columns = [
    {
      key: 'name',
      label: 'Motorista',
      render: (d: typeof drivers[0]) => (
        <div>
          <p className="font-[500]">{d.name}</p>
          <p className="text-[0.75rem] text-[var(--muted-foreground)]">{d.cpfCnpj}</p>
        </div>
      ),
    },
    {
      key: 'vehicleType',
      label: 'Veículo',
      render: (d: typeof drivers[0]) => (
        <span className="flex items-center gap-1 text-[0.85rem]">
          <Truck className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
          {d.vehicleType}
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
      render: (d: typeof drivers[0]) => (
        <span className={`inline-flex px-2 py-0.5 rounded-full text-[0.75rem] font-[500] ${d.available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {d.available ? 'Sim' : 'Não'}
        </span>
      ),
    },
    {
      key: 'cnhValid',
      label: 'CNH',
      render: (d: typeof drivers[0]) => (
        <span className={`inline-flex items-center gap-1 text-[0.8rem] ${d.cnhValid ? 'text-green-600' : 'text-amber-600'}`}>
          {d.cnhValid ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
          {d.cnhValid ? 'Válida' : 'Pendente'}
        </span>
      ),
    },
    {
      key: 'rating',
      label: 'Rating',
      render: (d: typeof drivers[0]) => <span>{d.rating > 0 ? `★ ${d.rating.toFixed(1)}` : '—'}</span>,
    },
    {
      key: 'currentLocation',
      label: 'Localização',
      render: (d: typeof drivers[0]) => (
        <span className="flex items-center gap-1 text-[0.85rem]">
          <MapPin className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
          {d.currentLocation}, {d.state}
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
      render: (d: typeof drivers[0]) => (
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

  return (
    <div className="space-y-4">
      {/* Stats */}
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

      {/* Map placeholder */}
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
