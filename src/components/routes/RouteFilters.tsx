import React from 'react';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { CityAutocomplete } from '../CityAutocomplete';
import { FilterAccordion, FilterSection, FilterCountBadge } from '../filters/FilterAccordion';

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

const VEHICLE_GROUPS: { title: string; items: string[] }[] = [
  { title: 'Pesados', items: ['Carreta', 'Carreta LS', 'Vanderléia', 'Bitrem', 'Rodotrem'] },
  { title: 'Médios', items: ['Truck', 'Bitruck'] },
  { title: 'Leves', items: ['Fiorino', 'VLC', '3/4', 'Toco'] },
];

const TRAILER_GROUPS: { title: string; items: string[] }[] = [
  { title: 'Abertas', items: ['Graneleiro', 'Grade Baixa', 'Prancha', 'Caçamba', 'Plataforma'] },
  { title: 'Fechadas', items: ['Sider', 'Baú', 'Baú Frigorífico', 'Baú Refrigerado'] },
  {
    title: 'Especiais',
    items: ['Silo', 'Cegonheiro', 'Gaiola', 'Tanque', 'Bug Porta Container', 'Munck', 'Apenas Cavalo', 'Cavaqueira', 'Hopper'],
  },
];

const RATING_OPTIONS = [
  { label: 'Todas', value: '' },
  { label: '4+ estrelas', value: '4' },
  { label: '4.5+ estrelas', value: '4.5' },
];

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

  const renderCheckboxGroups = (
    key: 'vehicleTypes' | 'trailerTypes',
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
        value="trailer"
        title="Carroceria"
        badge={<FilterCountBadge count={filters.trailerTypes.length} />}
      >
        {renderCheckboxGroups('trailerTypes', TRAILER_GROUPS)}
      </FilterSection>

      {/* Avaliação Mínima do Motorista */}
      <FilterSection
        value="rating"
        title="Avaliação Mínima"
        badge={filters.minRating ? <FilterCountBadge count={1} /> : null}
      >
        <div className="space-y-2">
          {RATING_OPTIONS.map((option) => (
            <div key={option.value || 'all'} className="flex items-center space-x-2">
              <Checkbox
                id={`rating-${option.value || 'all'}`}
                checked={filters.minRating === option.value}
                onCheckedChange={() => handleSingleSelect('minRating', option.value)}
                className={checkboxStyle}
              />
              <Label htmlFor={`rating-${option.value || 'all'}`} className="font-normal text-gray-600">{option.label}</Label>
            </div>
          ))}
        </div>
      </FilterSection>
    </FilterAccordion>
  );
}
