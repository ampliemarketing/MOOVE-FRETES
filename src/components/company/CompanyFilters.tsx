import React from 'react';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { CityAutocomplete } from '../CityAutocomplete';
import { Separator } from '../ui/separator';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';

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
    <div className={`space-y-6 pr-4 ${className}`}>
      {/* Localização */}
      <section className="space-y-4">
        <h3 className="font-semibold text-lg">Localização</h3>
        
        <div className="space-y-1">
          <CityAutocomplete
            label="Cidade"
            value={filters.location.city ? `${filters.location.city} - ${filters.location.state}` : ''}
            onValueChange={(city, state) => handleCityChange(city, state)}
            placeholder="Escolha a localização"
          />
        </div>
      </section>

      <Separator />

      {/* Tipo de Empresa */}
      <section className="space-y-3">
        <h3 className="font-semibold text-base">Tipo de Empresa</h3>
        <div className="space-y-2">
          {[
            { value: 'transportadora', label: 'Transportadora' },
            { value: 'embarcador', label: 'Embarcador' },
            { value: 'agenciador', label: 'Agenciador' }
          ].map((type) => (
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
      </section>

      <Separator />

      {/* Serviços Oferecidos */}
      <section className="space-y-3">
        <h3 className="font-semibold text-base">Serviços Oferecidos</h3>
        <div className="space-y-2">
          {[
            'Transporte Rodoviário',
            'Transporte Aéreo',
            'Transporte Marítimo',
            'Armazenagem',
            'Cross-Docking',
            'Rastreamento',
            'Seguro de Carga',
            'Logística Reversa'
          ].map((service) => (
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
      </section>

      <Separator />

      {/* Tamanho da Frota */}
      <section className="space-y-3">
        <h3 className="font-semibold text-base">Tamanho da Frota</h3>
        <div className="space-y-2">
          {[
            { value: 'pequena', label: 'Pequena (1-10 veículos)' },
            { value: 'media', label: 'Média (11-50 veículos)' },
            { value: 'grande', label: 'Grande (51-200 veículos)' },
            { value: 'muito-grande', label: 'Muito Grande (200+ veículos)' }
          ].map((size) => (
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
      </section>

      <Separator />

      {/* Formas de Pagamento */}
      <section className="space-y-3">
        <h3 className="font-semibold text-base">Formas de Pagamento</h3>
        <div className="space-y-2">
          {[
            'PIX',
            'Boleto',
            'Transferência',
            'Cartão de Crédito',
            'Cartão de Débito',
            'Faturado (30/60/90 dias)'
          ].map((method) => (
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
      </section>

      <Separator />

      {/* Verificação */}
      <section className="space-y-3">
        <h3 className="font-semibold text-base">Verificação</h3>
        <RadioGroup 
          value={filters.verified} 
          onValueChange={(value) => updateFilter('verified', value)}
        >
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="ambos" id="verified-both" />
              <Label htmlFor="verified-both" className="font-normal text-gray-600">
                Todas
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="sim" id="verified-yes" />
              <Label htmlFor="verified-yes" className="font-normal text-gray-600">
                Apenas verificadas
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="nao" id="verified-no" />
              <Label htmlFor="verified-no" className="font-normal text-gray-600">
                Não verificadas
              </Label>
            </div>
          </div>
        </RadioGroup>
      </section>

      <Separator />

      {/* Avaliação Mínima */}
      <section className="space-y-3">
        <h3 className="font-semibold text-base">Avaliação Mínima</h3>
        <div className="space-y-2">
          {[
            { value: '4', label: '4+ estrelas' },
            { value: '3', label: '3+ estrelas' },
            { value: '2', label: '2+ estrelas' }
          ].map((rating) => (
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
      </section>
    </div>
  );
}
