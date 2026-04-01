import React from 'react';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { CityAutocomplete } from '../CityAutocomplete';
import { Separator } from '../ui/separator';
import { Heart } from 'lucide-react';

export interface DriverFiltersState {
  location: { city: string; state: string };
  destination: { city: string; state: string };
  radius: string;
  vehicleTypes: string[];
  trailerTypes: string[];
  availability: string;
  verified: string;
  minRating: string;
  showOnlyFavorites: boolean;
}

export const initialDriverFiltersState: DriverFiltersState = {
  location: { city: '', state: '' },
  destination: { city: '', state: '' },
  radius: '',
  vehicleTypes: [],
  trailerTypes: [],
  availability: 'todos',
  verified: 'ambos',
  minRating: '',
  showOnlyFavorites: false,
};

interface DriverFiltersProps {
  filters: DriverFiltersState;
  onFilterChange: (newFilters: DriverFiltersState) => void;
  className?: string;
  favoritesCount?: number;
}

export function DriverFilters({ filters, onFilterChange, className = '', favoritesCount = 0 }: DriverFiltersProps) {
  
  const updateFilter = (key: keyof DriverFiltersState, value: any) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const toggleListFilter = (key: 'vehicleTypes' | 'trailerTypes', item: string) => {
    const currentList = filters[key];
    const newList = currentList.includes(item)
      ? currentList.filter(i => i !== item)
      : [...currentList, item];
    updateFilter(key, newList);
  };

  const handleCityChange = (key: 'location' | 'destination', city: string, state: string) => {
    if (key === 'location' && !city) {
      // Ao limpar a origem, resetar o raio também
      onFilterChange({ ...filters, [key]: { city, state }, radius: '' });
    } else {
      updateFilter(key, { city, state });
    }
  };

  // Helper para checkbox de seleção única (comportamento de Radio Button)
  const handleSingleSelect = (key: keyof DriverFiltersState, value: string) => {
    if (filters[key] !== value) {
      updateFilter(key, value);
    }
  };

  // Helper para checkbox de seleção única toggleável (para Raio, que pode ser opcional)
  const handleToggleSingleSelect = (key: keyof DriverFiltersState, value: string) => {
    if (filters[key] === value) {
      updateFilter(key, ''); // Desmarca se já estiver selecionado
    } else {
      updateFilter(key, value);
    }
  };

  // Estilo customizado para checkboxes "sem cor interna" (outline style)
  const checkboxStyle = "bg-transparent border-gray-300 data-[state=checked]:bg-transparent data-[state=checked]:text-primary data-[state=checked]:border-primary";

  return (
    <div className={`space-y-6 pr-4 ${className}`}>
      {/* Localização e Destino */}
      <section className="space-y-4">
        <h3 className="font-semibold text-lg">Origem e destino</h3>
        
        <div className="space-y-1">
          <CityAutocomplete
            label="Origem"
            value={filters.location.city ? `${filters.location.city} - ${filters.location.state}` : ''}
            onValueChange={(city, state) => handleCityChange('location', city, state)}
            placeholder="Escolha a localização"
          />
        </div>

        <div className="space-y-1">
          <CityAutocomplete
            label="Destino"
            value={filters.destination.city ? `${filters.destination.city} - ${filters.destination.state}` : ''}
            onValueChange={(city, state) => handleCityChange('destination', city, state)}
            placeholder="Escolha o destino (opcional)"
          />
        </div>
      </section>

      <Separator />

      {/* Raio (Distância) */}
      <section className="space-y-3">
        <h3 className="font-semibold text-base">Raio (Distância)</h3>
        {!filters.location.city && (
          <p className="text-xs text-muted-foreground">Selecione uma origem acima para ativar o filtro de raio.</p>
        )}
        <div className="space-y-2">
          {['50Km', '100Km', '200Km'].map((label) => {
            const value = label.replace('Km', '');
            const isChecked = filters.radius === value;
            const isDisabled = !filters.location.city;
            return (
              <div key={value} className={`flex items-center space-x-2 ${isDisabled ? 'opacity-40' : ''}`}>
                <Checkbox 
                  id={`radius-${value}`} 
                  checked={isChecked}
                  onCheckedChange={() => !isDisabled && handleToggleSingleSelect('radius', value)}
                  className={checkboxStyle}
                  disabled={isDisabled}
                />
                <Label htmlFor={`radius-${value}`} className="font-normal text-gray-600">{label}</Label>
              </div>
            );
          })}
        </div>
      </section>

      <Separator />

      {/* Veículo */}
      <section className="space-y-4">
        <h3 className="font-semibold text-base">Veículo</h3>
        
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900">Pesados</h4>
          <div className="space-y-2 pl-1">
            {['Carreta', 'Carreta LS', 'Vanderléia', 'Bitrem', 'Rodotrem'].map((type) => (
              <div key={type} className="flex items-center space-x-2">
                <Checkbox 
                  id={`vehicle-${type}`} 
                  checked={filters.vehicleTypes.includes(type)}
                  onCheckedChange={() => toggleListFilter('vehicleTypes', type)}
                  className={checkboxStyle}
                />
                <Label htmlFor={`vehicle-${type}`} className="font-normal text-gray-600">{type}</Label>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900">Médios</h4>
          <div className="space-y-2 pl-1">
            {['Truck', 'Bitruck'].map((type) => (
              <div key={type} className="flex items-center space-x-2">
                <Checkbox 
                  id={`vehicle-${type}`} 
                  checked={filters.vehicleTypes.includes(type)}
                  onCheckedChange={() => toggleListFilter('vehicleTypes', type)}
                  className={checkboxStyle}
                />
                <Label htmlFor={`vehicle-${type}`} className="font-normal text-gray-600">{type}</Label>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900">Leves</h4>
          <div className="space-y-2 pl-1">
            {['Fiorino', 'VLC', '3/4', 'Toco'].map((type) => (
              <div key={type} className="flex items-center space-x-2">
                <Checkbox 
                  id={`vehicle-${type}`} 
                  checked={filters.vehicleTypes.includes(type)}
                  onCheckedChange={() => toggleListFilter('vehicleTypes', type)}
                  className={checkboxStyle}
                />
                <Label htmlFor={`vehicle-${type}`} className="font-normal text-gray-600">{type}</Label>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Separator />

      {/* Carroceria */}
      <section className="space-y-4">
        <h3 className="font-semibold text-base">Carroceria</h3>
        
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900">Abertas</h4>
          <div className="space-y-2 pl-1">
            {['Graneleiro', 'Grade Baixa', 'Prancha', 'Caçamba', 'Plataforma'].map((type) => (
              <div key={type} className="flex items-center space-x-2">
                <Checkbox 
                  id={`trailer-${type}`} 
                  checked={filters.trailerTypes.includes(type)}
                  onCheckedChange={() => toggleListFilter('trailerTypes', type)}
                  className={checkboxStyle}
                />
                <Label htmlFor={`trailer-${type}`} className="font-normal text-gray-600">{type}</Label>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900">Fechadas</h4>
          <div className="space-y-2 pl-1">
            {['Sider', 'Baú', 'Baú Frigorífico', 'Baú Refrigerado'].map((type) => (
              <div key={type} className="flex items-center space-x-2">
                <Checkbox 
                  id={`trailer-${type}`} 
                  checked={filters.trailerTypes.includes(type)}
                  onCheckedChange={() => toggleListFilter('trailerTypes', type)}
                  className={checkboxStyle}
                />
                <Label htmlFor={`trailer-${type}`} className="font-normal text-gray-600">{type}</Label>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900">Especiais</h4>
          <div className="space-y-2 pl-1">
            {['Silo', 'Cegonheiro', 'Gaiola', 'Tanque', 'Bug Porta Container', 'Munk', 'Apenas Cavalo', 'Cavaqueira', 'Hopper'].map((type) => (
              <div key={type} className="flex items-center space-x-2">
                <Checkbox 
                  id={`trailer-${type}`} 
                  checked={filters.trailerTypes.includes(type)}
                  onCheckedChange={() => toggleListFilter('trailerTypes', type)}
                  className={checkboxStyle}
                />
                <Label htmlFor={`trailer-${type}`} className="font-normal text-gray-600">{type}</Label>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Separator />

      {/* Disponibilidade */}
      <section className="space-y-3">
        <h3 className="font-semibold text-base">Disponibilidade</h3>
        <div className="space-y-2">
          {[
            { label: 'Todos', value: 'todos' },
            { label: 'Disponível', value: 'available' },
            { label: 'Ocupado', value: 'busy' },
            { label: 'Offline', value: 'offline' }
          ].map((option) => {
            const isChecked = filters.availability === option.value;
            return (
              <div key={option.value} className="flex items-center space-x-2">
                <Checkbox 
                  id={`availability-${option.value}`} 
                  checked={isChecked}
                  onCheckedChange={() => handleSingleSelect('availability', option.value)}
                  className={checkboxStyle}
                />
                <Label htmlFor={`availability-${option.value}`} className="font-normal text-gray-600">{option.label}</Label>
              </div>
            );
          })}
        </div>
      </section>

      <Separator />

      {/* Verificado */}
      <section className="space-y-3">
        <h3 className="font-semibold text-base">Verificado</h3>
        <div className="space-y-2">
          {['Sim', 'Não', 'Ambos'].map((option) => {
            const value = option.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const isChecked = filters.verified === value;
            
            return (
              <div key={option} className="flex items-center space-x-2">
                <Checkbox 
                  id={`verified-${value}`} 
                  checked={isChecked}
                  onCheckedChange={() => handleSingleSelect('verified', value)}
                  className={checkboxStyle}
                />
                <Label htmlFor={`verified-${value}`} className="font-normal text-gray-600">{option}</Label>
              </div>
            );
          })}
        </div>
      </section>

      <Separator />

      {/* Avaliação Mínima */}
      <section className="space-y-3">
        <h3 className="font-semibold text-base">Avaliação Mínima</h3>
        <div className="space-y-2">
          {[
            { label: 'Todas', value: '' },
            { label: '4+ estrelas', value: '4' },
            { label: '4.5+ estrelas', value: '4.5' }
          ].map((option) => {
            const isChecked = filters.minRating === option.value;
            return (
              <div key={option.value || 'all'} className="flex items-center space-x-2">
                <Checkbox 
                  id={`rating-${option.value || 'all'}`} 
                  checked={isChecked}
                  onCheckedChange={() => handleSingleSelect('minRating', option.value)}
                  className={checkboxStyle}
                />
                <Label htmlFor={`rating-${option.value || 'all'}`} className="font-normal text-gray-600">{option.label}</Label>
              </div>
            );
          })}
        </div>
      </section>

      <Separator />

      {/* Favoritos */}
      <section className="space-y-3">
        <h3 className="font-semibold text-base">Favoritos</h3>
        <div className="space-y-2">
          <div key="favorites" className="flex items-center space-x-2">
            <Checkbox 
              id="favorites" 
              checked={filters.showOnlyFavorites}
              onCheckedChange={() => updateFilter('showOnlyFavorites', !filters.showOnlyFavorites)}
              className={checkboxStyle}
            />
            <Label htmlFor="favorites" className="font-normal text-gray-600">Mostrar apenas favoritos ({favoritesCount})</Label>
          </div>
        </div>
      </section>

    </div>
  );
}