import React, { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, MapPin } from 'lucide-react';
import { cn } from './ui/utils';
import { Button } from './ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';
import { Label } from './ui/label';
import { brazilianStates, getCitiesByState } from '../utils/brazil-locations';

interface LocationSelectorProps {
  stateValue: string;
  cityValue: string;
  onStateChange: (state: string) => void;
  onCityChange: (city: string) => void;
  stateLabel?: string;
  cityLabel?: string;
  stateError?: string;
  cityError?: string;
  disabled?: boolean;
  className?: string;
  required?: boolean;
}

export function LocationSelector({
  stateValue,
  cityValue,
  onStateChange,
  onCityChange,
  stateLabel = 'Estado',
  cityLabel = 'Cidade',
  stateError,
  cityError,
  disabled = false,
  className = '',
  required = false,
}: LocationSelectorProps) {
  const [stateOpen, setStateOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [availableCities, setAvailableCities] = useState<string[]>([]);

  // Update available cities when state changes
  useEffect(() => {
    if (stateValue) {
      const cities = getCitiesByState(stateValue);
      setAvailableCities(cities);
      
      // Clear city if it doesn't exist in new state
      if (cityValue && !cities.includes(cityValue)) {
        onCityChange('');
      }
    } else {
      setAvailableCities([]);
      onCityChange('');
    }
  }, [stateValue]);

  const selectedState = brazilianStates.find(s => s.value === stateValue);

  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 gap-4', className)}>
      {/* State Selector */}
      <div className="space-y-2">
        <Label>
          {stateLabel}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
        <Popover open={stateOpen} onOpenChange={setStateOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={stateOpen}
              className={cn(
                'w-full justify-between',
                !stateValue && 'text-muted-foreground',
                stateError && 'border-destructive'
              )}
              disabled={disabled}
            >
              {selectedState ? selectedState.label : 'Selecione o estado...'}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandInput placeholder="Buscar estado..." />
              <CommandList>
                <CommandEmpty>Nenhum estado encontrado.</CommandEmpty>
                <CommandGroup>
                  {brazilianStates.map((state) => (
                    <CommandItem
                      key={state.value}
                      value={state.label}
                      onSelect={() => {
                        onStateChange(state.value);
                        setStateOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          stateValue === state.value ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      {state.label} ({state.value})
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {stateError && (
          <p className="text-sm text-destructive">{stateError}</p>
        )}
      </div>

      {/* City Selector */}
      <div className="space-y-2">
        <Label>
          {cityLabel}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
        <Popover open={cityOpen} onOpenChange={setCityOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={cityOpen}
              className={cn(
                'w-full justify-between',
                !cityValue && 'text-muted-foreground',
                cityError && 'border-destructive'
              )}
              disabled={disabled || !stateValue}
            >
              {cityValue || 'Selecione a cidade...'}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandInput placeholder="Buscar cidade..." />
              <CommandList>
                <CommandEmpty>Nenhuma cidade encontrada.</CommandEmpty>
                <CommandGroup>
                  {availableCities.map((city) => (
                    <CommandItem
                      key={city}
                      value={city}
                      onSelect={(currentValue) => {
                        onCityChange(currentValue);
                        setCityOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          cityValue === city ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
                      {city}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {cityError && (
          <p className="text-sm text-destructive">{cityError}</p>
        )}
        {!stateValue && (
          <p className="text-xs text-muted-foreground">Selecione um estado primeiro</p>
        )}
      </div>
    </div>
  );
}