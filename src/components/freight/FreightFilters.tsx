import React from 'react';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { CityAutocomplete } from '../CityAutocomplete';
import { Separator } from '../ui/separator';

export interface FreightFiltersState {
  origin: { city: string; state: string };
  destination: { city: string; state: string };
  radius: string;
  vehicleTypes: string[];
  bodyTypes: string[];
  hasTracker: string;
  hasAgency: string;
  hasPrice: string;
  isComplement: string;
}

export const initialFiltersState: FreightFiltersState = {
  origin: { city: '', state: '' },
  destination: { city: '', state: '' },
  radius: '',
  vehicleTypes: [],
  bodyTypes: [],
  hasTracker: 'ambos',
  hasAgency: 'ambos',
  hasPrice: 'ambos',
  isComplement: 'ambos',
};

interface FreightFiltersProps {
  filters: FreightFiltersState;
  onFilterChange: (newFilters: FreightFiltersState) => void;
  className?: string;
}

export function FreightFilters({ filters, onFilterChange, className = '' }: FreightFiltersProps) {
  
  const updateFilter = (key: keyof FreightFiltersState, value: any) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const toggleListFilter = (key: 'vehicleTypes' | 'bodyTypes', item: string) => {
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
  const handleSingleSelect = (key: keyof FreightFiltersState, value: string) => {
    // Se clicar no item já selecionado, não faz nada (comportamento padrão de radio button)
    // Se clicar em outro, atualiza para o novo valor
    if (filters[key] !== value) {
      updateFilter(key, value);
    }
  };

  // Helper para checkbox de seleção única toggleável (para Raio, que pode ser opcional)
  const handleToggleSingleSelect = (key: keyof FreightFiltersState, value: string) => {
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
      {/* Origem e Destino */}
      <section className="space-y-4">
        <h3 className="font-semibold text-lg">Origem e destino</h3>
        
        <div className="space-y-1">
          <CityAutocomplete
            label="Origem"
            value={filters.origin.city ? `${filters.origin.city} - ${filters.origin.state}` : ''}
            onValueChange={(city, state) => handleCityChange('origin', city, state)}
            placeholder="Escolha sua origem"
          />
        </div>

        <div className="space-y-1">
          <CityAutocomplete
            label="Destino"
            value={filters.destination.city ? `${filters.destination.city} - ${filters.destination.state}` : ''}
            onValueChange={(city, state) => handleCityChange('destination', city, state)}
            placeholder="Escolha seu destino (opcional)"
          />
        </div>
      </section>

      <Separator />

      {/* Raio (Distância) */}
      <section className="space-y-3">
        <div>
          <h3 className="font-semibold text-base">Raio (Distância)</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Busca fretes próximos à sua localização atual ou à origem escolhida acima
          </p>
        </div>
        <div className="space-y-2">
          {['50Km', '100Km', '200Km'].map((label) => {
            const value = label.replace('Km', '');
            const isChecked = filters.radius === value;
            return (
              <div key={value} className="flex items-center space-x-2">
                <Checkbox 
                  id={`radius-${value}`} 
                  checked={isChecked}
                  onCheckedChange={() => handleToggleSingleSelect('radius', value)}
                  className={checkboxStyle}
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
                  id={`body-${type}`} 
                  checked={filters.bodyTypes.includes(type)}
                  onCheckedChange={() => toggleListFilter('bodyTypes', type)}
                  className={checkboxStyle}
                />
                <Label htmlFor={`body-${type}`} className="font-normal text-gray-600">{type}</Label>
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
                  id={`body-${type}`} 
                  checked={filters.bodyTypes.includes(type)}
                  onCheckedChange={() => toggleListFilter('bodyTypes', type)}
                  className={checkboxStyle}
                />
                <Label htmlFor={`body-${type}`} className="font-normal text-gray-600">{type}</Label>
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
                  id={`body-${type}`} 
                  checked={filters.bodyTypes.includes(type)}
                  onCheckedChange={() => toggleListFilter('bodyTypes', type)}
                  className={checkboxStyle}
                />
                <Label htmlFor={`body-${type}`} className="font-normal text-gray-600">{type}</Label>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Separator />

      {/* Common Radio Filters converted to Checkboxes */}
      {[
        { id: 'hasTracker', label: 'Rastreador' },
        { id: 'hasAgency', label: 'Agenciador' },
        { id: 'hasPrice', label: 'Preço' },
        { id: 'isComplement', label: 'Complemento' },
      ].map((filter) => (
        <div key={filter.id}>
          <section className="space-y-3">
            <h3 className="font-semibold text-base">{filter.label}</h3>
            <div className="space-y-2">
              {['Sim', 'Não', 'Ambos'].map((option) => {
                const value = option.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                const isChecked = filters[filter.id as keyof FreightFiltersState] === value;
                
                return (
                  <div key={option} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`${filter.id}-${value}`} 
                      checked={isChecked}
                      onCheckedChange={() => handleSingleSelect(filter.id as keyof FreightFiltersState, value)}
                      className={checkboxStyle}
                    />
                    <Label htmlFor={`${filter.id}-${value}`} className="font-normal text-gray-600">{option}</Label>
                  </div>
                );
              })}
            </div>
          </section>
          <Separator />
        </div>
      ))}

    </div>
  );
}