import React, { useState, useRef, useEffect } from 'react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { MapPin, X, Loader2 } from 'lucide-react';
import { brazilianStates } from '../utils/brazil-locations';

interface CityAutocompleteProps {
  label: string;
  value: string;
  onValueChange: (city: string, stateCode: string) => void;
  placeholder?: string;
  className?: string;
}

interface CitySuggestion {
  city: string;
  state: string;
  stateCode: string;
  label: string;
}

export function CityAutocomplete({ 
  label, 
  value, 
  onValueChange, 
  placeholder = "Digite o nome da cidade",
  className = ""
}: CityAutocompleteProps) {
  const [searchQuery, setSearchQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Update search query when value changes externally
  useEffect(() => {
    setSearchQuery(value);
  }, [value]);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Buscar cidades do IBGE
  const searchCities = async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Cancelar requisição anterior se existir
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setIsLoading(true);

    try {
      // Buscar todos os municípios do Brasil via API IBGE
      const response = await fetch(
        'https://servicodados.ibge.gov.br/api/v1/localidades/municipios',
        { signal: abortControllerRef.current.signal }
      );
      
      if (!response.ok) throw new Error('Erro ao buscar cidades');
      
      const data = await response.json();
      
      // Filtrar cidades que contêm o termo buscado
      const normalizedQuery = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      
      const filtered = data
        .filter((city: any) => {
          const cityName = city.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          return cityName.includes(normalizedQuery);
        })
        .slice(0, 50) // Limitar a 50 resultados
        .map((city: any) => ({
          city: city.nome,
          state: city.microrregiao.mesorregiao.UF.nome,
          stateCode: city.microrregiao.mesorregiao.UF.sigla,
          label: `${city.nome} - ${city.microrregiao.mesorregiao.UF.sigla}`
        }))
        .sort((a: CitySuggestion, b: CitySuggestion) => 
          a.city.localeCompare(b.city, 'pt-BR')
        );

      setSuggestions(filtered);
      setShowSuggestions(true);
      setSelectedIndex(-1);
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Erro ao buscar cidades:', error);
        setSuggestions([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (query.length >= 2) {
      searchCities(query);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectCity = (cityData: CitySuggestion) => {
    setSearchQuery(cityData.label);
    onValueChange(cityData.city, cityData.stateCode);
    setShowSuggestions(false);
    setSuggestions([]);
    setSelectedIndex(-1);
  };

  const handleClear = () => {
    setSearchQuery('');
    onValueChange('', '');
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelectCity(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  return (
    <div ref={wrapperRef} className={`space-y-2 relative ${className}`}>
      <Label>{label}</Label>
      <div className="relative">
        <Input
          ref={inputRef}
          value={searchQuery}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (searchQuery.length >= 2 && suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          placeholder={placeholder}
          className="bg-input-background border-input-border pr-10"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isLoading ? (
            <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
          ) : searchQuery ? (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {suggestions.map((cityData, index) => (
            <button
              key={`${cityData.city}-${cityData.stateCode}`}
              type="button"
              onClick={() => handleSelectCity(cityData)}
              className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 flex items-center gap-3 ${
                index === selectedIndex ? 'bg-gray-50' : ''
              }`}
            >
              <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">
                  {cityData.city} <span className="text-gray-500">- {cityData.stateCode}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {showSuggestions && searchQuery.length >= 2 && suggestions.length === 0 && !isLoading && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center text-sm text-gray-500">
          Nenhuma cidade encontrada
        </div>
      )}
    </div>
  );
}
