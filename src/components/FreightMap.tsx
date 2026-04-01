import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { 
  MapPin, 
  Navigation, 
  Truck, 
  Package, 
  DollarSign,
  Clock,
  Filter,
  Search,
  List,
  Map,
  X,
  Star,
  Phone,
  MessageCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Target,
  AlertCircle,
  Layers,
  SlidersHorizontal,
  User,
  Calendar,
  Route,
  Shield,
  Award,
  CheckCircle,
  XCircle,
  Info,
  Users,
  Building,
  Navigation2,
  Crosshair
} from "lucide-react";
// Supabase hooks disabled for demo mode
// import { useFreights, useDrivers } from './hooks/useSupabase';
import { motion, AnimatePresence } from "motion/react";
import { LoadingSpinner } from './LoadingSpinner';

interface MapItem {
  id: string;
  type: 'freight' | 'driver' | 'user';
  lat: number;
  lng: number;
  data: any;
}

export function FreightMap() {
  const [selectedItem, setSelectedItem] = useState<MapItem | null>(null);
  const [viewType, setViewType] = useState<'all' | 'fretes' | 'motoristas'>('all');
  const [showList, setShowList] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [mapZoom, setMapZoom] = useState(1);
  const [mapPosition, setMapPosition] = useState({ x: 0, y: 0 });
  const [selectedFilters, setSelectedFilters] = useState({
    urgency: 'all',
    status: 'all',
    available: 'all',
    truckType: 'all',
    distance: 'all'
  });
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);

  // Fetch data using hooks
  const { freights, loading: freightsLoading, refetch: refetchFreights } = useFreights({
    status: selectedFilters.status === 'all' ? undefined : selectedFilters.status,
    urgency: selectedFilters.urgency === 'all' ? undefined : selectedFilters.urgency,
    limit: 50
  });

  const { drivers, loading: driversLoading, refetch: refetchDrivers } = useDrivers({
    available: selectedFilters.available === 'all' ? undefined : selectedFilters.available === 'true',
    limit: 50
  });

  // Simulate getting user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        () => {
          // Default to São Paulo if geolocation fails
          setUserLocation({ lat: -23.5505, lng: -46.6333 });
        }
      );
    } else {
      setUserLocation({ lat: -23.5505, lng: -46.6333 });
    }
  }, []);

  // Create map items from data
  const mapItems: MapItem[] = React.useMemo(() => {
    const items: MapItem[] = [];
    
    // Add user location
    if (userLocation) {
      items.push({
        id: 'user-location',
        type: 'user',
        lat: userLocation.lat,
        lng: userLocation.lng,
        data: { name: 'Sua localização' }
      });
    }
    
    // Add freights with simulated locations around user
    if (freights && userLocation) {
      freights.forEach((freight, index) => {
        // Simulate locations within 50km radius
        const offsetLat = (Math.random() - 0.5) * 0.9; // ~50km range
        const offsetLng = (Math.random() - 0.5) * 0.9;
        
        items.push({
          id: freight.id,
          type: 'freight',
          lat: userLocation.lat + offsetLat,
          lng: userLocation.lng + offsetLng,
          data: freight
        });
      });
    }
    
    // Add drivers with simulated locations around user
    if (drivers && userLocation) {
      drivers.forEach((driver, index) => {
        // Simulate locations within 30km radius
        const offsetLat = (Math.random() - 0.5) * 0.5; // ~30km range
        const offsetLng = (Math.random() - 0.5) * 0.5;
        
        items.push({
          id: driver.id,
          type: 'driver',
          lat: userLocation.lat + offsetLat,
          lng: userLocation.lng + offsetLng,
          data: driver
        });
      });
    }
    
    return items;
  }, [freights, drivers, userLocation]);

  // Filter map items based on view type and search
  const filteredMapItems = mapItems.filter(item => {
    if (viewType === 'fretes' && item.type !== 'freight') return false;
    if (viewType === 'motoristas' && item.type !== 'driver') return false;
    if (viewType !== 'all' && item.type === 'user') return false;
    
    if (searchQuery && item.type !== 'user') {
      const searchLower = searchQuery.toLowerCase();
      if (item.type === 'freight') {
        const freight = item.data;
        return freight.origin?.toLowerCase().includes(searchLower) ||
               freight.destination?.toLowerCase().includes(searchLower) ||
               freight.cargo?.toLowerCase().includes(searchLower);
      } else if (item.type === 'driver') {
        const driver = item.data;
        return driver.name?.toLowerCase().includes(searchLower) ||
               driver.location?.toLowerCase().includes(searchLower) ||
               driver.truckType?.toLowerCase().includes(searchLower);
      }
    }
    
    return true;
  });

  // Convert lat/lng to screen coordinates
  const latLngToScreen = (lat: number, lng: number) => {
    if (!userLocation) return { x: 50, y: 50 };
    
    // Simple projection centered on user location
    const centerLat = userLocation.lat;
    const centerLng = userLocation.lng;
    
    // Convert degrees to pixels (simplified)
    const scale = 800; // pixels per degree
    const x = 50 + (lng - centerLng) * scale * Math.cos(centerLat * Math.PI / 180);
    const y = 50 - (lat - centerLat) * scale;
    
    return {
      x: Math.max(5, Math.min(95, x)), // Keep within bounds
      y: Math.max(5, Math.min(95, y))
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-gray-100 text-gray-600 border-gray-200';
      case 'negotiating': return 'bg-gray-100 text-gray-600 border-gray-200';
      case 'assigned': return 'bg-gray-100 text-gray-600 border-gray-200';
      case 'in_transit': return 'bg-gray-100 text-gray-600 border-gray-200';
      case 'delivered': return 'bg-gray-100 text-gray-600 border-gray-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const formatDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    }
    return `${distance.toFixed(1)}km`;
  };

  const MapMarker = ({ item }: { item: MapItem }) => {
    const position = latLngToScreen(item.lat, item.lng);
    const isSelected = selectedItem?.id === item.id;
    
    const getMarkerIcon = () => {
      switch (item.type) {
        case 'user':
          return (
            <div className="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg relative">
              <div className="absolute inset-0 bg-blue-600 rounded-full animate-ping opacity-75"></div>
            </div>
          );
        case 'freight':
          const urgency = item.data.urgency;
          const bgColor = urgency === 'urgent' ? 'bg-red-500' : 
                         urgency === 'high' ? 'bg-orange-500' : 'bg-green-500';
          return (
            <div className={`w-8 h-8 ${bgColor} rounded-lg border-2 border-white shadow-lg flex items-center justify-center text-white relative`}>
              <Package className="w-4 h-4" />
              {urgency === 'urgent' && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-2 h-2 text-white" />
                </div>
              )}
            </div>
          );
        case 'driver':
          const available = item.data.available;
          const bgColor2 = available ? 'bg-blue-500' : 'bg-gray-500';
          return (
            <div className={`w-8 h-8 ${bgColor2} rounded-lg border-2 border-white shadow-lg flex items-center justify-center text-white relative`}>
              <Truck className="w-4 h-4" />
              {available && (
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border border-white"></div>
              )}
              {item.data.verified && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-600 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-2 h-2 text-white" />
                </div>
              )}
            </div>
          );
        default:
          return null;
      }
    };

    return (
      <motion.div
        className="absolute cursor-pointer transform -translate-x-1/2 -translate-y-1/2 z-10"
        style={{
          left: `${position.x}%`,
          top: `${position.y}%`,
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ 
          scale: isSelected ? 1.2 : 1, 
          opacity: 1,
          zIndex: isSelected ? 20 : 10
        }}
        whileHover={{ scale: 1.1 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        onClick={() => setSelectedItem(item)}
      >
        {getMarkerIcon()}
        {isSelected && (
          <motion.div
            className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {item.type === 'user' ? (
              <div className="p-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Sua Localização</h3>
                    <p className="text-sm text-gray-500">Você está aqui</p>
                  </div>
                </div>
              </div>
            ) : item.type === 'freight' ? (
              <FreightPopup freight={item.data} userLocation={userLocation} />
            ) : (
              <DriverPopup driver={item.data} userLocation={userLocation} />
            )}
          </motion.div>
        )}
      </motion.div>
    );
  };

  const FreightPopup = ({ freight, userLocation }: { freight: any, userLocation: any }) => (
    <div className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <Package className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">Frete Disponível</h3>
            <p className="text-sm text-gray-500">{freight.embarcadorName}</p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setSelectedItem(null)}
          className="h-6 w-6 p-0"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="w-4 h-4 text-gray-400" />
          <span className="font-medium">{freight.origin}</span>
          <ChevronRight className="w-3 h-3 text-gray-400" />
          <span className="font-medium">{freight.destination}</span>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Carga:</span>
            <p className="font-medium">{freight.cargo}</p>
          </div>
          <div>
            <span className="text-gray-500">Peso:</span>
            <p className="font-medium">{freight.weight}</p>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="text-xl font-bold text-green-600">{freight.price}</div>
          <Badge className={`${getStatusColor(freight.status)} text-xs border`}>
            {freight.status === 'active' ? 'Disponível' : freight.status}
          </Badge>
        </div>
        
        {userLocation && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Navigation2 className="w-4 h-4" />
            <span>Distância: {formatDistance(userLocation.lat, userLocation.lng, freight.lat || userLocation.lat, freight.lng || userLocation.lng)}</span>
          </div>
        )}
        
        <div className="flex gap-2 pt-2">
          <Button size="sm" className="flex-1 bg-accent hover:bg-accent/90">
            Ver Detalhes
          </Button>
          <Button size="sm" variant="outline">
            <MessageCircle className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="outline">
            <Phone className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  const DriverPopup = ({ driver, userLocation }: { driver: any, userLocation: any }) => (
    <div className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center relative">
            <Truck className="w-4 h-4 text-blue-600" />
            {driver.available && (
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border border-white"></div>
            )}
          </div>
          <div>
            <h3 className="font-medium text-gray-900 flex items-center gap-1">
              {driver.name}
              {driver.verified && <Shield className="w-3 h-3 text-blue-500" />}
            </h3>
            <p className="text-sm text-gray-500">{driver.truckType}</p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setSelectedItem(null)}
          className="h-6 w-6 p-0"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="font-medium">{driver.rating}</span>
            <span className="text-sm text-gray-500">({driver.completedTrips} viagens)</span>
          </div>
          <Badge className={`text-xs border ${
            driver.available 
              ? 'bg-green-100 text-green-800 border-green-200' 
              : 'bg-red-100 text-red-800 border-red-200'
          }`}>
            {driver.available ? 'Disponível' : 'Ocupado'}
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Veículo:</span>
            <p className="font-medium">{driver.truckType}</p>
          </div>
          <div>
            <span className="text-gray-500">Capacidade:</span>
            <p className="font-medium">{driver.truckCapacity}</p>
          </div>
        </div>
        
        {driver.location && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span>{driver.location}</span>
          </div>
        )}
        
        {userLocation && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Navigation2 className="w-4 h-4" />
            <span>Distância: {formatDistance(userLocation.lat, userLocation.lng, driver.lat || userLocation.lat, driver.lng || userLocation.lng)}</span>
          </div>
        )}
        
        <div className="flex gap-2 pt-2">
          <Button size="sm" className="flex-1 bg-accent hover:bg-accent/90">
            Ver Perfil
          </Button>
          <Button size="sm" variant="outline">
            <MessageCircle className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="outline">
            <Phone className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  const MapControls = () => (
    <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-2 space-y-2 z-30">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setMapZoom(prev => Math.min(prev + 0.2, 2))}
        className="w-8 h-8 p-0"
      >
        <ZoomIn className="w-4 h-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setMapZoom(prev => Math.max(prev - 0.2, 0.5))}
        className="w-8 h-8 p-0"
      >
        <ZoomOut className="w-4 h-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setMapZoom(1);
          setMapPosition({ x: 0, y: 0 });
        }}
        className="w-8 h-8 p-0"
      >
        <RotateCcw className="w-4 h-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          if (userLocation && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
              setUserLocation({
                lat: position.coords.latitude,
                lng: position.coords.longitude
              });
            });
          }
        }}
        className="w-8 h-8 p-0"
      >
        <Crosshair className="w-4 h-4" />
      </Button>
    </div>
  );

  if (freightsLoading && driversLoading) {
    return (
      <div className="h-full bg-gray-50 flex items-center justify-center">
        <LoadingSpinner message="Carregando dados do mapa..." />
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-50 flex flex-col">
      {/* Header Controls */}
      <div className="bg-white border-b p-4 space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <Button
              variant={viewType === 'all' ? 'default' : 'outline'}
              onClick={() => setViewType('all')}
              size="sm"
              className={`${viewType === 'all' ? 'bg-accent hover:bg-accent/90' : ''} text-sm`}
            >
              <Map className="w-4 h-4 mr-1" />
              Todos
            </Button>
            <Button
              variant={viewType === 'fretes' ? 'default' : 'outline'}
              onClick={() => setViewType('fretes')}
              size="sm"
              className={`${viewType === 'fretes' ? 'bg-accent hover:bg-accent/90' : ''} text-sm`}
            >
              <Package className="w-4 h-4 mr-1" />
              Fretes
            </Button>
            <Button
              variant={viewType === 'motoristas' ? 'default' : 'outline'}
              onClick={() => setViewType('motoristas')}
              size="sm"
              className={`${viewType === 'motoristas' ? 'bg-accent hover:bg-accent/90' : ''} text-sm`}
            >
              <Truck className="w-4 h-4 mr-1" />
              Motoristas
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant={showFilters ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={`text-sm ${showFilters ? 'bg-accent hover:bg-accent/90' : ''}`}
            >
              <Filter className="w-4 h-4" />
            </Button>
            <Button
              variant={showList ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowList(!showList)}
              className="text-sm"
            >
              {showList ? <Map className="w-4 h-4" /> : <List className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Buscar ${viewType === 'fretes' ? 'fretes' : viewType === 'motoristas' ? 'motoristas' : 'fretes e motoristas'}...`}
            className="pl-10 h-10 rounded-lg text-sm bg-gray-50 border-gray-200"
          />
        </div>

        {/* Quick Stats */}
        <div className="flex gap-4 overflow-x-auto pb-1">
          <div className="bg-gray-100 px-3 py-2 rounded-lg min-w-fit text-center">
            <div className="text-lg font-bold text-gray-600">{filteredMapItems.filter(i => i.type !== 'user').length}</div>
            <div className="text-xs text-gray-600">Total</div>
          </div>
          <div className="bg-gray-100 px-3 py-2 rounded-lg min-w-fit text-center">
            <div className="text-lg font-bold text-gray-600">
              {filteredMapItems.filter(i => i.type === 'freight' && i.data.status === 'active').length}
            </div>
            <div className="text-xs text-gray-600">Fretes</div>
          </div>
          <div className="bg-gray-100 px-3 py-2 rounded-lg min-w-fit text-center">
            <div className="text-lg font-bold text-gray-600">
              {filteredMapItems.filter(i => i.type === 'driver' && i.data.available).length}
            </div>
            <div className="text-xs text-gray-600">Motoristas</div>
          </div>
          <div className="bg-gray-100 px-3 py-2 rounded-lg min-w-fit text-center">
            <div className="text-lg font-bold text-gray-600">
              {filteredMapItems.filter(i => i.type === 'freight' && i.data.urgency === 'urgent').length}
            </div>
            <div className="text-xs text-gray-600">Urgentes</div>
          </div>
        </div>
      </div>

      {/* Map View */}
      <div className="flex-1 relative overflow-hidden">
        <div 
          className="h-full bg-gradient-to-br from-blue-50 via-green-50 to-blue-100 relative"
          style={{
            transform: `scale(${mapZoom}) translate(${mapPosition.x}px, ${mapPosition.y}px)`,
            transition: 'transform 0.3s ease'
          }}
        >
          {/* Enhanced Map Background */}
          <div className="absolute inset-0">
            {/* Grid overlay */}
            <div className="absolute inset-0 opacity-10">
              <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="mapGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#94a3b8" strokeWidth="1"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#mapGrid)" />
              </svg>
            </div>

            {/* Simplified road network */}
            <div className="absolute inset-0 opacity-20">
              <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                {/* Main highways */}
                <path d="M10 20 Q30 25 50 20 Q70 15 90 25" stroke="#64748b" strokeWidth="0.8" fill="none" strokeDasharray="2,1"/>
                <path d="M20 10 Q25 30 30 50 Q35 70 40 90" stroke="#64748b" strokeWidth="0.8" fill="none" strokeDasharray="2,1"/>
                <path d="M60 10 Q65 30 70 50 Q75 70 80 90" stroke="#64748b" strokeWidth="0.8" fill="none" strokeDasharray="2,1"/>
                <path d="M10 50 Q30 55 50 50 Q70 45 90 55" stroke="#64748b" strokeWidth="0.8" fill="none" strokeDasharray="2,1"/>
                <path d="M10 80 Q30 75 50 80 Q70 85 90 75" stroke="#64748b" strokeWidth="0.8" fill="none" strokeDasharray="2,1"/>
              </svg>
            </div>

            {/* City markers */}
            <div className="absolute inset-0">
              <div className="absolute" style={{ left: '45%', top: '60%' }}>
                <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                <span className="text-xs text-gray-600 ml-2">São Paulo</span>
              </div>
              <div className="absolute" style={{ left: '55%', top: '55%' }}>
                <div className="w-1.5 h-1.5 bg-gray-600 rounded-full"></div>
                <span className="text-xs text-gray-600 ml-2">Rio de Janeiro</span>
              </div>
            </div>
          </div>

          {/* Render map markers */}
          {filteredMapItems.map(item => (
            <MapMarker key={item.id} item={item} />
          ))}

          {/* User location radius */}
          {userLocation && (
            <div 
              className="absolute rounded-full border-2 border-blue-300 border-dashed bg-blue-100 bg-opacity-20 pointer-events-none"
              style={{
                left: '45%',
                top: '45%',
                width: '30%',
                height: '30%',
                transform: 'translate(-50%, -50%)'
              }}
            />
          )}
        </div>

        {/* Map Controls */}
        <MapControls />

        {/* Legend */}
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg border border-gray-200 p-3 space-y-2 z-30">
          <h4 className="font-medium text-sm text-gray-900 mb-2">Legenda</h4>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-600 rounded-full border border-white"></div>
              <span className="text-xs text-gray-600">Sua localização</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded-sm border border-white flex items-center justify-center">
                <Package className="w-2.5 h-2.5 text-white" />
              </div>
              <span className="text-xs text-gray-600">Fretes disponíveis</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded-sm border border-white flex items-center justify-center">
                <Truck className="w-2.5 h-2.5 text-white" />
              </div>
              <span className="text-xs text-gray-600">Motoristas</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded-sm border border-white flex items-center justify-center">
                <AlertCircle className="w-2.5 h-2.5 text-white" />
              </div>
              <span className="text-xs text-gray-600">Urgente</span>
            </div>
          </div>
        </div>

        {/* Click outside to close popup */}
        {selectedItem && (
          <div 
            className="absolute inset-0 z-40" 
            onClick={() => setSelectedItem(null)}
          />
        )}
      </div>
    </div>
  );
}