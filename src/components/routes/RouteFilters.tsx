import React from 'react';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { CityAutocomplete } from '../CityAutocomplete';
import { Separator } from '../ui/separator';

export interface RouteFiltersState {
  origin: { city: string; state: string };
  destination: { city: string; state: string };
  vehicleTypes: string[];
  trailerTypes: string[];
  minRating: string;
}

export const initialRouteFiltersState: RouteFiltersState = {
  origin: { city: '', state: '' },
  destination: { city: '', state: '' },
  vehicleTypes: [],
  trailerTypes: [],
  minRating: '',
};

interface RouteFiltersProps {
  filters: RouteFiltersState;
  onFilterChange: (newFilters: RouteFiltersState) => void;
  className?: string;
}

export function RouteFilters({ filters, onFilterChange, className = '' }: RouteFiltersProps) {
  
  const updateFilter = (key: keyof RouteFiltersState, value: any) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const toggleListFilter = (key: 'vehicleTypes' | 'trailerTypes', item: string) => {
    const currentList = filters[key];
    const newList = currentList.includes(item)
      ? currentList.filter(i => i !== item)
      : [...currentList, item];
    updateFilter(key, newList);
  };

  const handleCityChange = (key: 'origin' | 'destination', city: string, state: string) => {
    updateFilter(key, { city, state });
  };

  // Helper para checkbox de seleção única (comportamento de Radio Button)
  const handleSingleSelect = (key: keyof RouteFiltersState, value: string) => {
    if (filters[key] !== value) {
      updateFilter(key, value);
    }
  };

  // Estilo customizado para checkboxes "sem cor interna" (outline style)
  const checkboxStyle = "bg-transparent border-gray-300 data-[state=checked]:bg-transparent data-[state=checked]:text-primary data-[state=checked]:border-primary";

  return (
    <div className={`space-y-6 pr-4 ${className}`}>
      {/* Origem e Destino */}
      <section className="space-y-4">
        <h3 className="font-semibold text-lg">Origem e destino</h3>
        
        <div className="space-y-1">
          <CityAutocomplete
            label="Origem"
            value={filters.origin.city ? `${filters.origin.city} - ${filters.origin.state}` : ''}
            onValueChange={(city, state) => handleCityChange('origin', city, state)}
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

      {/* Avaliação Mínima do Motorista */}
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

    </div>
  );
}
