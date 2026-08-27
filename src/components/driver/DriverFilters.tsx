import React from 'react';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { CityAutocomplete } from '../CityAutocomplete';
import { FilterAccordion, FilterSection, FilterCountBadge } from '../filters/FilterAccordion';

export interface DriverFiltersState {
  location: { city: string; state: string };
  destination: { city: string; state: string };
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

const AVAILABILITY_OPTIONS = [
  { label: 'Todos', value: 'todos' },
  { label: 'Disponível', value: 'available' },
  { label: 'Ocupado', value: 'busy' },
  { label: 'Offline', value: 'offline' },
];

const RATING_OPTIONS = [
  { label: 'Todas', value: '' },
  { label: '4+ estrelas', value: '4' },
  { label: '4.5+ estrelas', value: '4.5' },
];

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
    updateFilter(key, { city, state });
  };

  // Helper para checkbox de seleção única (comportamento de Radio Button)
  const handleSingleSelect = (key: keyof DriverFiltersState, value: string) => {
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

  const locationCount = (filters.location.city ? 1 : 0) + (filters.destination.city ? 1 : 0);
  const availabilityActive = filters.availability !== 'todos';
  const verifiedActive = filters.verified !== 'ambos';
  const ratingActive = filters.minRating !== '';

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

      {/* Disponibilidade */}
      <FilterSection
        value="availability"
        title="Disponibilidade"
        badge={availabilityActive ? <FilterCountBadge count={1} /> : null}
      >
        <div className="space-y-2">
          {AVAILABILITY_OPTIONS.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <Checkbox
                id={`availability-${option.value}`}
                checked={filters.availability === option.value}
                onCheckedChange={() => handleSingleSelect('availability', option.value)}
                className={checkboxStyle}
              />
              <Label htmlFor={`availability-${option.value}`} className="font-normal text-gray-600">{option.label}</Label>
            </div>
          ))}
        </div>
      </FilterSection>

      {/* Verificado */}
      <FilterSection
        value="verified"
        title="Verificado"
        badge={verifiedActive ? <FilterCountBadge count={1} /> : null}
      >
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
      </FilterSection>

      {/* Avaliação Mínima */}
      <FilterSection
        value="rating"
        title="Avaliação Mínima"
        badge={ratingActive ? <FilterCountBadge count={1} /> : null}
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

      {/* Favoritos */}
      <FilterSection
        value="favorites"
        title="Favoritos"
        badge={filters.showOnlyFavorites ? <FilterCountBadge count={1} /> : null}
      >
        <div className="flex items-center space-x-2">
          <Checkbox
            id="favorites"
            checked={filters.showOnlyFavorites}
            onCheckedChange={() => updateFilter('showOnlyFavorites', !filters.showOnlyFavorites)}
            className={checkboxStyle}
          />
          <Label htmlFor="favorites" className="font-normal text-gray-600">Mostrar apenas favoritos ({favoritesCount})</Label>
        </div>
      </FilterSection>
    </FilterAccordion>
  );
}
