import React from 'react';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { CityAutocomplete } from '../CityAutocomplete';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { FilterAccordion, FilterSection, FilterCountBadge } from '../filters/FilterAccordion';

export interface CompanyFiltersState {
  location: { city: string; state: string };
  companyTypes: string[];
  services: string[];
  fleetSize: string;
  verified: string;
  minRating: string;
  paymentMethods: string[];
}

export const initialCompanyFiltersState: CompanyFiltersState = {
  location: { city: '', state: '' },
  companyTypes: [],
  services: [],
  fleetSize: '',
  verified: 'ambos',
  minRating: '',
  paymentMethods: [],
};

interface CompanyFiltersProps {
  filters: CompanyFiltersState;
  onFilterChange: (newFilters: CompanyFiltersState) => void;
  className?: string;
}

const COMPANY_TYPES = [
  { value: 'transportadora', label: 'Transportadora' },
  { value: 'embarcador', label: 'Embarcador' },
  { value: 'agenciador', label: 'Agenciador' },
];

const SERVICES = [
  'Transporte Rodoviário',
  'Transporte Aéreo',
  'Transporte Marítimo',
  'Armazenagem',
  'Cross-Docking',
  'Rastreamento',
  'Seguro de Carga',
  'Logística Reversa',
];

const FLEET_SIZES = [
  { value: 'pequena', label: 'Pequena (1-10 veículos)' },
  { value: 'media', label: 'Média (11-50 veículos)' },
  { value: 'grande', label: 'Grande (51-200 veículos)' },
  { value: 'muito-grande', label: 'Muito Grande (200+ veículos)' },
];

const PAYMENT_METHODS = [
  'PIX',
  'Boleto',
  'Transferência',
  'Cartão de Crédito',
  'Cartão de Débito',
  'Faturado (30/60/90 dias)',
];

const RATING_OPTIONS = [
  { value: '4', label: '4+ estrelas' },
  { value: '3', label: '3+ estrelas' },
  { value: '2', label: '2+ estrelas' },
];

export function CompanyFilters({ filters, onFilterChange, className = '' }: CompanyFiltersProps) {

  const updateFilter = (key: keyof CompanyFiltersState, value: any) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const toggleListFilter = (key: 'companyTypes' | 'services' | 'paymentMethods', item: string) => {
    const currentList = filters[key];
    const newList = currentList.includes(item)
      ? currentList.filter(i => i !== item)
      : [...currentList, item];
    updateFilter(key, newList);
  };

  const handleCityChange = (city: string, state: string) => {
    updateFilter('location', { city, state });
  };

  // Helper para checkbox de seleção única toggleável
  const handleToggleSingleSelect = (key: keyof CompanyFiltersState, value: string) => {
    if (filters[key] === value) {
      updateFilter(key, ''); // Desmarca se já estiver selecionado
    } else {
      updateFilter(key, value);
    }
  };

  // Estilo customizado para checkboxes "sem cor interna" (outline style)
  const checkboxStyle = "bg-transparent border-gray-300 data-[state=checked]:bg-transparent data-[state=checked]:text-primary data-[state=checked]:border-primary";

  return (
    <FilterAccordion defaultOpen={['location']} className={className}>
      {/* Localização */}
      <FilterSection
        value="location"
        title="Localização"
        badge={<FilterCountBadge count={filters.location.city ? 1 : 0} />}
      >
        <div className="space-y-1">
          <CityAutocomplete
            label="Cidade"
            value={filters.location.city ? `${filters.location.city} - ${filters.location.state}` : ''}
            onValueChange={(city, state) => handleCityChange(city, state)}
            placeholder="Escolha a localização"
          />
        </div>
      </FilterSection>

      {/* Tipo de Empresa */}
      <FilterSection
        value="company-type"
        title="Tipo de Empresa"
        badge={<FilterCountBadge count={filters.companyTypes.length} />}
      >
        <div className="space-y-2">
          {COMPANY_TYPES.map((type) => (
            <div key={type.value} className="flex items-center space-x-2">
              <Checkbox
                id={`company-type-${type.value}`}
                checked={filters.companyTypes.includes(type.value)}
                onCheckedChange={() => toggleListFilter('companyTypes', type.value)}
                className={checkboxStyle}
              />
              <Label htmlFor={`company-type-${type.value}`} className="font-normal text-gray-600">
                {type.label}
              </Label>
            </div>
          ))}
        </div>
      </FilterSection>

      {/* Serviços Oferecidos */}
      <FilterSection
        value="services"
        title="Serviços Oferecidos"
        badge={<FilterCountBadge count={filters.services.length} />}
      >
        <div className="space-y-2">
          {SERVICES.map((service) => (
            <div key={service} className="flex items-center space-x-2">
              <Checkbox
                id={`service-${service}`}
                checked={filters.services.includes(service)}
                onCheckedChange={() => toggleListFilter('services', service)}
                className={checkboxStyle}
              />
              <Label htmlFor={`service-${service}`} className="font-normal text-gray-600">
                {service}
              </Label>
            </div>
          ))}
        </div>
      </FilterSection>

      {/* Tamanho da Frota */}
      <FilterSection
        value="fleet"
        title="Tamanho da Frota"
        badge={filters.fleetSize ? <FilterCountBadge count={1} /> : null}
      >
        <div className="space-y-2">
          {FLEET_SIZES.map((size) => (
            <div key={size.value} className="flex items-center space-x-2">
              <Checkbox
                id={`fleet-${size.value}`}
                checked={filters.fleetSize === size.value}
                onCheckedChange={() => handleToggleSingleSelect('fleetSize', size.value)}
                className={checkboxStyle}
              />
              <Label htmlFor={`fleet-${size.value}`} className="font-normal text-gray-600">
                {size.label}
              </Label>
            </div>
          ))}
        </div>
      </FilterSection>

      {/* Formas de Pagamento */}
      <FilterSection
        value="payment"
        title="Formas de Pagamento"
        badge={<FilterCountBadge count={filters.paymentMethods.length} />}
      >
        <div className="space-y-2">
          {PAYMENT_METHODS.map((method) => (
            <div key={method} className="flex items-center space-x-2">
              <Checkbox
                id={`payment-${method}`}
                checked={filters.paymentMethods.includes(method)}
                onCheckedChange={() => toggleListFilter('paymentMethods', method)}
                className={checkboxStyle}
              />
              <Label htmlFor={`payment-${method}`} className="font-normal text-gray-600">
                {method}
              </Label>
            </div>
          ))}
        </div>
      </FilterSection>

      {/* Verificação */}
      <FilterSection
        value="verified"
        title="Verificação"
        badge={filters.verified !== 'ambos' ? <FilterCountBadge count={1} /> : null}
      >
        <RadioGroup
          value={filters.verified}
          onValueChange={(value) => updateFilter('verified', value)}
        >
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="ambos" id="verified-both" />
              <Label htmlFor="verified-both" className="font-normal text-gray-600">Todas</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="sim" id="verified-yes" />
              <Label htmlFor="verified-yes" className="font-normal text-gray-600">Apenas verificadas</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="nao" id="verified-no" />
              <Label htmlFor="verified-no" className="font-normal text-gray-600">Não verificadas</Label>
            </div>
          </div>
        </RadioGroup>
      </FilterSection>

      {/* Avaliação Mínima */}
      <FilterSection
        value="rating"
        title="Avaliação Mínima"
        badge={filters.minRating ? <FilterCountBadge count={1} /> : null}
      >
        <div className="space-y-2">
          {RATING_OPTIONS.map((rating) => (
            <div key={rating.value} className="flex items-center space-x-2">
              <Checkbox
                id={`rating-${rating.value}`}
                checked={filters.minRating === rating.value}
                onCheckedChange={() => handleToggleSingleSelect('minRating', rating.value)}
                className={checkboxStyle}
              />
              <Label htmlFor={`rating-${rating.value}`} className="font-normal text-gray-600">
                {rating.label}
              </Label>
            </div>
          ))}
        </div>
      </FilterSection>
    </FilterAccordion>
  );
}
