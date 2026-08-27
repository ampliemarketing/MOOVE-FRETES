import React from 'react';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { CityAutocomplete } from '../CityAutocomplete';
import { FilterAccordion, FilterSection, FilterCountBadge } from '../filters/FilterAccordion';

export interface FreightFiltersState {
  origin: { city: string; state: string };
  destination: { city: string; state: string };
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

const VEHICLE_GROUPS: { title: string; items: string[] }[] = [
  { title: 'Pesados', items: ['Carreta', 'Carreta LS', 'Vanderléia', 'Bitrem', 'Rodotrem'] },
  { title: 'Médios', items: ['Truck', 'Bitruck'] },
  { title: 'Leves', items: ['Fiorino', 'VLC', '3/4', 'Toco'] },
];

const BODY_GROUPS: { title: string; items: string[] }[] = [
  { title: 'Abertas', items: ['Graneleiro', 'Grade Baixa', 'Prancha', 'Caçamba', 'Plataforma'] },
  { title: 'Fechadas', items: ['Sider', 'Baú', 'Baú Frigorífico', 'Baú Refrigerado'] },
  {
    title: 'Especiais',
    items: ['Silo', 'Cegonheiro', 'Gaiola', 'Tanque', 'Bug Porta Container', 'Munck', 'Apenas Cavalo', 'Cavaqueira', 'Hopper'],
  },
];

const YES_NO_FILTERS: { id: 'hasTracker' | 'hasAgency' | 'hasPrice' | 'isComplement'; label: string }[] = [
  { id: 'hasTracker', label: 'Rastreador' },
  { id: 'hasAgency', label: 'Agenciador' },
  { id: 'hasPrice', label: 'Preço' },
  { id: 'isComplement', label: 'Complemento' },
];

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
    if (filters[key] !== value) {
      updateFilter(key, value);
    }
  };

  // Estilo customizado para checkboxes "sem cor interna" (outline style)
  const checkboxStyle = "bg-transparent border-gray-300 data-[state=checked]:bg-transparent data-[state=checked]:text-primary data-[state=checked]:border-primary";

  const renderCheckboxGroups = (
    key: 'vehicleTypes' | 'bodyTypes',
    groups: { title: string; items: string[] }[],
  ) => (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.title} className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900">{group.title}</h4>
          <div className="space-y-2 pl-1">
            {group.items.map((type) => (
              <div key={type} className="flex items-center space-x-2">
                <Checkbox
                  id={`${key}-${type}`}
                  checked={filters[key].includes(type)}
                  onCheckedChange={() => toggleListFilter(key, type)}
                  className={checkboxStyle}
                />
                <Label htmlFor={`${key}-${type}`} className="font-normal text-gray-600">{type}</Label>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const locationCount = (filters.origin.city ? 1 : 0) + (filters.destination.city ? 1 : 0);
  const yesNoActiveCount = YES_NO_FILTERS.filter(f => filters[f.id] !== 'ambos').length;

  return (
    <FilterAccordion defaultOpen={['origin-destination']} className={className}>
      {/* Origem e Destino */}
      <FilterSection
        value="origin-destination"
        title="Origem e destino"
        badge={<FilterCountBadge count={locationCount} />}
      >
        <div className="space-y-4">
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
        </div>
      </FilterSection>

      {/* Veículo */}
      <FilterSection
        value="vehicle"
        title="Veículo"
        badge={<FilterCountBadge count={filters.vehicleTypes.length} />}
      >
        {renderCheckboxGroups('vehicleTypes', VEHICLE_GROUPS)}
      </FilterSection>

      {/* Carroceria */}
      <FilterSection
        value="body"
        title="Carroceria"
        badge={<FilterCountBadge count={filters.bodyTypes.length} />}
      >
        {renderCheckboxGroups('bodyTypes', BODY_GROUPS)}
      </FilterSection>

      {/* Sim / Não / Ambos */}
      <FilterSection
        value="options"
        title="Outros"
        badge={<FilterCountBadge count={yesNoActiveCount} />}
      >
        <div className="space-y-4">
          {YES_NO_FILTERS.map((filter) => (
            <div key={filter.id} className="space-y-2">
              <h4 className="text-sm font-medium text-gray-900">{filter.label}</h4>
              <div className="space-y-2 pl-1">
                {['Sim', 'Não', 'Ambos'].map((option) => {
                  const value = option.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                  const isChecked = filters[filter.id] === value;
                  return (
                    <div key={option} className="flex items-center space-x-2">
                      <Checkbox
                        id={`${filter.id}-${value}`}
                        checked={isChecked}
                        onCheckedChange={() => handleSingleSelect(filter.id, value)}
                        className={checkboxStyle}
                      />
                      <Label htmlFor={`${filter.id}-${value}`} className="font-normal text-gray-600">{option}</Label>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </FilterSection>
    </FilterAccordion>
  );
}
