import React from 'react';
import { MapPin, Navigation } from 'lucide-react';
import { Button } from './ui/button';

interface DriverLocationMapProps {
  coordinates: [number, number];
  cityName: string;
  driverName: string;
  className?: string;
}

export function DriverLocationMap({ 
  coordinates, 
  cityName, 
  driverName, 
  className = "" 
}: DriverLocationMapProps) {
  // Validar coordenadas
  const validCoordinates = coordinates && Array.isArray(coordinates) && coordinates.length === 2;

  const handleNavigate = () => {
    if (!validCoordinates) return;
    // Abrir Google Maps com direções
    const url = `https://www.google.com/maps/dir/?api=1&destination=${coordinates[1]},${coordinates[0]}`;
    window.open(url, '_blank');
  };

  const handleViewMap = () => {
    if (!validCoordinates) return;
    // Abrir localização no Google Maps
    const url = `https://www.google.com/maps/search/?api=1&query=${coordinates[1]},${coordinates[0]}`;
    window.open(url, '_blank');
  };

  // Se coordenadas inválidas, mostrar fallback
  if (!validCoordinates) {
    return (
      <div className={`bg-gray-50 rounded-lg flex items-center justify-center relative overflow-hidden border ${className}`}>
        <div className="text-center p-6">
          <MapPin className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <div className="text-sm text-gray-600">
            Localização não disponível
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {cityName}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-50 rounded-lg relative overflow-hidden border ${className}`}>
      {/* Mapa estático usando OpenStreetMap */}
      <div 
        className="w-full h-full bg-cover bg-center relative cursor-pointer"
        style={{
          backgroundImage: `url(https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/${coordinates[0]},${coordinates[1]},12,0/600x400@2x?access_token=${import.meta.env.VITE_MAPBOX_TOKEN})`
        }}
        onClick={handleViewMap}
      >
        {/* Overlay escurecido */}
        <div className="absolute inset-0 bg-black/10" />
        
        {/* Marcador do motorista */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="relative">
            {/* Pin */}
            <div className="w-10 h-10 bg-red-500 rounded-full border-4 border-white shadow-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-white fill-white" />
            </div>
            {/* Label */}
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white px-3 py-1 rounded shadow-md whitespace-nowrap">
              <div className="text-xs font-medium text-gray-800">{driverName}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Nome da cidade */}
      <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-md">
        <div className="text-sm font-medium text-gray-700">{cityName}</div>
      </div>

      {/* Coordenadas */}
      <div className="absolute top-2 left-2 bg-white/95 backdrop-blur-sm px-2 py-1 rounded shadow-sm">
        <div className="text-xs text-gray-600 font-mono">
          {coordinates[1].toFixed(4)}, {coordinates[0].toFixed(4)}
        </div>
      </div>

      {/* Botão de navegação */}
      <Button 
        size="sm" 
        onClick={handleNavigate}
        className="absolute bottom-2 right-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
      >
        <Navigation className="w-3.5 h-3.5 mr-1.5" />
        Navegar
      </Button>
    </div>
  );
}
