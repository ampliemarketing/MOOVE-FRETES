import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Truck, Container } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from './ui/select';

interface VehicleTypeSelectorProps {
  selectedTypes?: string[];
  selectedBodyTypes?: string[];
  onTypesChange?: (types: string[]) => void;
  onBodyTypesChange?: (bodyTypes: string[]) => void;
  // Mantém compatibilidade com props antigas
  selectedVehicles?: string[];
  selectedTrailers?: string[];
  onVehiclesChange?: (vehicles: string[]) => void;
  onTrailersChange?: (trailers: string[]) => void;
}

export function VehicleTypeSelector({
  selectedTypes = [],
  selectedBodyTypes = [],
  onTypesChange,
  onBodyTypesChange,
  // Props antigas para compatibilidade
  selectedVehicles = [],
  selectedTrailers = [],
  onVehiclesChange,
  onTrailersChange,
}: VehicleTypeSelectorProps) {
  // Usar props novas se disponíveis, senão usar props antigas
  const vehicleList = selectedTypes.length > 0 ? selectedTypes : selectedVehicles;
  const trailerList = selectedBodyTypes.length > 0 ? selectedBodyTypes : selectedTrailers;
  const onVehicleChange = onTypesChange || onVehiclesChange;
  const onTrailerChange = onBodyTypesChange || onTrailersChange;

  const [vehicle, setVehicle] = useState<string | undefined>(vehicleList[0]);
  const [trailer, setTrailer] = useState<string | undefined>(trailerList[0]);

  // Definições de veículos por categoria
  const vehicleCategories = [
    {
      id: 'leves',
      title: 'Veículos Leves',
      options: ['3/4', 'Fiorino', 'Toco', 'VLC']
    },
    {
      id: 'medios',
      title: 'Veículos Médios',
      options: ['Bitruck', 'Truck']
    },
    {
      id: 'pesados',
      title: 'Veículos Pesados',
      options: ['Bitrem', 'Carreta', 'Carreta LS', 'Rodotrem', 'Vanderleia']
    }
  ];

  // Definições de carrocerias por categoria
  const trailerCategories = [
    {
      id: 'fechada',
      title: 'Carroceria Fechada',
      options: ['Baú', 'Baú Frigorífico', 'Baú Refrigerado', 'Sider']
    },
    {
      id: 'aberta',
      title: 'Carroceria Aberta',
      options: ['Caçamba', 'Grade Baixa', 'Graneleiro', 'Plataforma', 'Prancha']
    },
    {
      id: 'especial',
      title: 'Carroceria Especial',
      options: ['Apenas Cavalo', 'Bug Porta Container', 'Cavaqueira', 'Cegonheiro', 'Gaiola', 'Hopper', 'Munck', 'Silo', 'Tanque']
    }
  ];

  // Atualizar quando props mudarem
  useEffect(() => {
    setVehicle(vehicleList[0]);
  }, [vehicleList]);

  useEffect(() => {
    setTrailer(trailerList[0]);
  }, [trailerList]);

  // Selecionar veículo
  const handleVehicleChange = (value: string) => {
    setVehicle(value);
    onVehicleChange?.([value]);
  };

  // Selecionar carroceria
  const handleTrailerChange = (value: string) => {
    setTrailer(value);
    onTrailerChange?.([value]);
  };

  return (
    <div className="space-y-6">
      {/* Seleção de Tipo de Veículo */}
      <Card className="border-2 border-gray-200">
        <CardHeader className="bg-gray-50 border-b border-gray-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Truck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-medium">Tipo do Seu Veículo</CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                Selecione o tipo do seu veículo
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-2">
            <Label htmlFor="vehicle-select" className="text-sm font-medium">
              Tipo de Veículo <span className="text-red-500">*</span>
            </Label>
            <Select value={vehicle} onValueChange={handleVehicleChange}>
              <SelectTrigger id="vehicle-select" className="w-full">
                <SelectValue placeholder="Selecione o tipo de veículo" />
              </SelectTrigger>
              <SelectContent>
                {vehicleCategories.map((category) => (
                  <SelectGroup key={category.id}>
                    <SelectLabel className="font-semibold text-foreground">
                      {category.title}
                    </SelectLabel>
                    {category.options.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Seleção de Tipo de Carroceria */}
      <Card className="border-2 border-gray-200">
        <CardHeader className="bg-gray-50 border-b border-gray-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-600/10 flex items-center justify-center flex-shrink-0">
              <Container className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-base font-medium">Tipo de Carroceria</CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                Selecione o tipo de carroceria do seu veículo
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-2">
            <Label htmlFor="trailer-select" className="text-sm font-medium">
              Tipo de Carroceria <span className="text-red-500">*</span>
            </Label>
            <Select value={trailer} onValueChange={handleTrailerChange}>
              <SelectTrigger id="trailer-select" className="w-full">
                <SelectValue placeholder="Selecione o tipo de carroceria" />
              </SelectTrigger>
              <SelectContent>
                {trailerCategories.map((category) => (
                  <SelectGroup key={category.id}>
                    <SelectLabel className="font-semibold text-foreground">
                      {category.title}
                    </SelectLabel>
                    {category.options.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}