import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { 
  Search, 
  Filter, 
  X, 
  Clock, 
  MapPin, 
  Truck, 
  Package, 
  DollarSign,
  Calendar,
  Star,
  ArrowRight,
  TrendingUp,
  History,
  Bookmark,
  Navigation,
  Route,
  Target,
  Zap,
  CheckCircle,
  AlertTriangle,
  MessageCircle
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';

interface LogisticSearchFilters {
  origin: string;
  destination: string;
  type: 'all' | 'freights' | 'drivers' | 'companies';
  radius: number;
  dateRange: {
    start: string;
    end: string;
  };
  priceRange: {
    min: number;
    max: number;
  };
  rating: number;
  urgency: 'all' | 'normal' | 'urgent';
  cargoType: string[];
  truckType: string[];
  verified: boolean;
  weight: number;
  volume: number;
}

interface LogisticSearchResult {
  id: string;
  type: 'freight' | 'driver' | 'company';
  title: string;
  subtitle: string;
  description: string;
  origin: string;
  destination: string;
  distance?: string;
  estimatedTime?: string;
  rating?: number;
  price?: string;
  urgency?: 'normal' | 'urgent';
  verified: boolean;
  image?: string;
  tags: string[];
  matchScore: number;
  logisticScore: number;
  availability: 'available' | 'busy' | 'unavailable';
  route?: {
    distance: number;
    duration: number;
    efficiency: number;
  };
  experience?: {
    totalTrips: number;
    sameRoute: number;
    onTimeDelivery: number;
  };
}

const mockLogisticResults: LogisticSearchResult[] = [
  {
    id: '1',
    type: 'driver',
    title: 'Carlos Silva',
    subtitle: 'Caminhoneiro Especialista • Truck',
    description: 'Especialista na rota SP-RJ, 12 anos de experiência, sempre pontual',
    origin: 'São Paulo, SP',
    destination: 'Rio de Janeiro, RJ',
    distance: '0 km da origem',
    estimatedTime: '6h 30min',
    rating: 4.9,
    price: 'R$ 2.800',
    urgency: 'normal',
    verified: true,
    tags: ['Rota Especialista', 'Pontual', 'Experiência'],
    matchScore: 98,
    logisticScore: 95,
    availability: 'available',
    route: {
      distance: 430,
      duration: 390,
      efficiency: 95
    },
    experience: {
      totalTrips: 1250,
      sameRoute: 180,
      onTimeDelivery: 98
    }
  },
  {
    id: '2',
    type: 'freight',
    title: 'São Paulo → Rio de Janeiro',
    subtitle: 'Carga Compatível • Eletrônicos 2.1t',
    description: 'Frete de retorno disponível, carga similar, economia compartilhada',
    origin: 'São Paulo, SP',
    destination: 'Rio de Janeiro, RJ',
    distance: '8 km da origem',
    estimatedTime: '6h 45min',
    rating: 4.7,
    price: 'R$ 3.200',
    urgency: 'urgent',
    verified: true,
    tags: ['Carga Compartilhada', 'Urgente', 'Economia'],
    matchScore: 92,
    logisticScore: 88,
    availability: 'available',
    route: {
      distance: 435,
      duration: 405,
      efficiency: 88
    }
  },
  {
    id: '3',
    type: 'company',
    title: 'LogFast Transportes',
    subtitle: 'Transportadora Especializada',
    description: 'Especializada na rota SP-RJ, frota dedicada, rastreamento 24h',
    origin: 'São Paulo, SP',
    destination: 'Rio de Janeiro, RJ',
    distance: '5 km da origem',
    estimatedTime: '6h 15min',
    rating: 4.8,
    price: 'R$ 3.100',
    urgency: 'normal',
    verified: true,
    tags: ['Frota Dedicada', 'Rastreamento', 'Especializada'],
    matchScore: 90,
    logisticScore: 92,
    availability: 'available',
    route: {
      distance: 428,
      duration: 375,
      efficiency: 92
    }
  },
  {
    id: '4',
    type: 'driver',
    title: 'Ana Costa',
    subtitle: 'Caminhoneira • Bitruck',
    description: 'Disponível para cargas pesadas, ótima avaliação na rota',
    origin: 'Santos, SP',
    destination: 'Rio de Janeiro, RJ',
    distance: '15 km da origem',
    estimatedTime: '7h 10min',
    rating: 4.6,
    price: 'R$ 3.400',
    urgency: 'normal',
    verified: false,
    tags: ['Cargas Pesadas', 'Disponível'],
    matchScore: 82,
    logisticScore: 78,
    availability: 'available',
    route: {
      distance: 485,
      duration: 430,
      efficiency: 78
    },
    experience: {
      totalTrips: 890,
      sameRoute: 45,
      onTimeDelivery: 94
    }
  }
];

const POPULAR_ROUTES = [
  'São Paulo → Rio de Janeiro',
  'Belo Horizonte → Salvador',
  'Curitiba → Florianópolis',
  'Porto Alegre → São Paulo',
  'Brasília → Goiânia'
];

const defaultFilters: LogisticSearchFilters = {
  origin: '',
  destination: '',
  type: 'all',
  radius: 50,
  dateRange: {
    start: '',
    end: ''
  },
  priceRange: {
    min: 0,
    max: 50000
  },
  rating: 0,
  urgency: 'all',
  cargoType: [],
  truckType: [],
  verified: false,
  weight: 0,
  volume: 0
};

const cargoTypes = [
  'Carga Geral', 'Granel sólido', 'Granel líquido', 'Granel pressurizada', 
  'Conteiner', 'Frigorificada ou Aquecida', 'Neogranel', 'Perigosa (Carga Geral)',
  'Perigosa (Granel sólido)', 'Perigosa (Granel liquido)', 'Perigosa (Container)', 
  'Perigosa (Frigorificada ou Aquecida)'
];

const truckTypes = [
  '3/4', 'Fiorino', 'Toco', 'VLC', 'Bitruck', 'Truck', 
  'Bitrem', 'Carreta', 'Carreta LS', 'Rodotrem', 'Vanderléia'
];

export function AdvancedSearch() {
  const { state, actions } = useApp();
  const [isSearching, setIsSearching] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<LogisticSearchFilters>(defaultFilters);
  const [results, setResults] = useState<LogisticSearchResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<LogisticSearchResult | null>(null);
  const originInputRef = useRef<HTMLInputElement>(null);
  const destinationInputRef = useRef<HTMLInputElement>(null);

  // Calculate logistic optimization score
  const calculateLogisticScore = (result: LogisticSearchResult, origin: string, destination: string): number => {
    let score = 0;

    // Route match bonus (higher for exact route match)
    const routeMatch = result.origin.toLowerCase().includes(origin.toLowerCase()) && 
                      result.destination.toLowerCase().includes(destination.toLowerCase());
    if (routeMatch) score += 40;

    // Experience bonus
    if (result.experience) {
      score += Math.min(result.experience.sameRoute * 0.2, 20); // Max 20 points for route experience
      score += Math.min(result.experience.onTimeDelivery * 0.3, 30); // Max 30 points for on-time delivery
    }

    // Efficiency bonus
    if (result.route) {
      score += result.route.efficiency * 0.1; // Max 10 points for route efficiency
    }

    return Math.min(score, 100);
  };

  // Perform intelligent logistic search
  const performLogisticSearch = async (origin: string, destination: string) => {
    if (!origin.trim() || !destination.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    actions.addSearch(`${origin} → ${destination}`);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1200));

    // Filter and optimize results based on logistic criteria
    let filteredResults = mockLogisticResults.filter(result => {
      // Route relevance
      const originMatch = result.origin.toLowerCase().includes(origin.toLowerCase()) ||
                         origin.toLowerCase().includes(result.origin.toLowerCase());
      const destinationMatch = result.destination.toLowerCase().includes(destination.toLowerCase()) ||
                              destination.toLowerCase().includes(result.destination.toLowerCase());

      // Filter criteria
      const matchesType = filters.type === 'all' || 
                         (filters.type === 'freights' && result.type === 'freight') ||
                         (filters.type === 'drivers' && result.type === 'driver') ||
                         (filters.type === 'companies' && result.type === 'company');

      const matchesVerified = !filters.verified || result.verified;
      const matchesRating = !filters.rating || (result.rating && result.rating >= filters.rating);
      const matchesUrgency = filters.urgency === 'all' || result.urgency === filters.urgency;

      return (originMatch || destinationMatch) && matchesType && matchesVerified && matchesRating && matchesUrgency;
    });

    // Calculate logistic scores and sort by optimization
    filteredResults = filteredResults.map(result => ({
      ...result,
      logisticScore: calculateLogisticScore(result, origin, destination)
    }));

    // Sort by combined logistic score and match score
    filteredResults.sort((a, b) => {
      const aTotal = (a.logisticScore * 0.6) + (a.matchScore * 0.4);
      const bTotal = (b.logisticScore * 0.6) + (b.matchScore * 0.4);
      return bTotal - aTotal;
    });

    setResults(filteredResults);
    setIsSearching(false);
  };

  const handleRouteSearch = () => {
    if (filters.origin && filters.destination) {
      performLogisticSearch(filters.origin, filters.destination);
    }
  };

  const handlePopularRoute = (route: string) => {
    const [origin, destination] = route.split(' → ');
    setFilters(prev => ({
      ...prev,
      origin,
      destination
    }));
    performLogisticSearch(origin, destination);
  };

  const clearSearch = () => {
    setFilters(defaultFilters);
    setResults([]);
    setSelectedResult(null);
    originInputRef.current?.focus();
  };

  const handleFilterChange = (key: keyof LogisticSearchFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    if (filters.origin && filters.destination) {
      performLogisticSearch(filters.origin, filters.destination);
    }
  };

  const clearFilters = () => {
    const origin = filters.origin;
    const destination = filters.destination;
    setFilters({ ...defaultFilters, origin, destination });
    if (origin && destination) {
      performLogisticSearch(origin, destination);
    }
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'freight':
        return <Package className="w-5 h-5" />;
      case 'driver':
        return <Truck className="w-5 h-5" />;
      case 'company':
        return <Navigation className="w-5 h-5" />;
      default:
        return <Search className="w-5 h-5" />;
    }
  };

  const getResultColor = (type: string) => {
    switch (type) {
      case 'freight':
        return 'text-gray-600 bg-gray-100';
      case 'driver':
        return 'text-gray-600 bg-gray-100';
      case 'company':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getLogisticBadge = (score: number) => {
    if (score >= 90) return { label: 'Ótima Logística', color: 'bg-gray-100 text-gray-600' };
    if (score >= 80) return { label: 'Boa Logística', color: 'bg-gray-100 text-gray-600' };
    if (score >= 70) return { label: 'Logística OK', color: 'bg-gray-100 text-gray-600' };
    return { label: 'Revisar Rota', color: 'bg-gray-100 text-gray-600' };
  };

  useEffect(() => {
    originInputRef.current?.focus();
  }, []);

  return (
    <div className="space-y-6">
      {/* Logistic Search Header */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Route Search */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <Route className="w-5 h-5 text-primary" />
                <h3 className="font-medium">Busca Otimizada por Rota</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-600" />
                  <Input
                    ref={originInputRef}
                    type="text"
                    placeholder="Cidade de origem"
                    value={filters.origin}
                    onChange={(e) => handleFilterChange('origin', e.target.value)}
                    className="pl-10 h-11 bg-muted/50 border-0 focus:bg-white"
                  />
                </div>
                
                <div className="relative">
                  <Target className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-red-600" />
                  <Input
                    ref={destinationInputRef}
                    type="text"
                    placeholder="Cidade de destino"
                    value={filters.destination}
                    onChange={(e) => handleFilterChange('destination', e.target.value)}
                    className="pl-10 h-11 bg-muted/50 border-0 focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  onClick={handleRouteSearch}
                  disabled={!filters.origin || !filters.destination}
                  className="bg-accent hover:bg-accent/90 text-white"
                >
                  <Search className="w-4 h-4 mr-2" />
                  Buscar Melhor Logística
                </Button>
                
                {(filters.origin || filters.destination) && (
                  <Button variant="outline" onClick={clearSearch}>
                    <X className="w-4 h-4 mr-2" />
                    Limpar
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className={showFilters ? 'bg-accent text-accent-foreground' : ''}
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Filtros
                </Button>
              </div>
            </div>

            {/* Popular Routes */}
            {!filters.origin && !filters.destination && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Rotas Populares
                </h4>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_ROUTES.map((route, index) => (
                    <motion.button
                      key={index}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handlePopularRoute(route)}
                      className="text-sm px-3 py-2 bg-muted rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                      {route}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Filters */}
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Caminhoneiros', value: 'drivers', icon: Truck },
                { label: 'Fretes', value: 'freights', icon: Package },
                { label: 'Transportadoras', value: 'companies', icon: Navigation },
                { label: 'Verificados', value: 'verified', icon: CheckCircle }
              ].map((filter) => {
                const Icon = filter.icon;
                const isActive = (filter.value === 'verified' && filters.verified) || 
                               (filter.value !== 'verified' && filters.type === filter.value);
                
                return (
                  <motion.button
                    key={filter.value}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      if (filter.value === 'verified') {
                        handleFilterChange('verified', !filters.verified);
                      } else {
                        handleFilterChange('type', isActive ? 'all' : filter.value);
                      }
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive 
                        ? 'bg-accent text-accent-foreground' 
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {filter.label}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Filtros Avançados</CardTitle>
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Limpar Filtros
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Cargo Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Peso da Carga (t)</label>
                    <Input
                      type="number"
                      placeholder="Ex: 2.5"
                      value={filters.weight || ''}
                      onChange={(e) => handleFilterChange('weight', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Volume (m³)</label>
                    <Input
                      type="number"
                      placeholder="Ex: 15"
                      value={filters.volume || ''}
                      onChange={(e) => handleFilterChange('volume', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                {/* Date Range */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Período de Entrega</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Input
                        type="date"
                        placeholder="Data início"
                        value={filters.dateRange.start}
                        onChange={(e) => handleFilterChange('dateRange', {
                          ...filters.dateRange,
                          start: e.target.value
                        })}
                      />
                    </div>
                    <div>
                      <Input
                        type="date"
                        placeholder="Data fim"
                        value={filters.dateRange.end}
                        onChange={(e) => handleFilterChange('dateRange', {
                          ...filters.dateRange,
                          end: e.target.value
                        })}
                      />
                    </div>
                  </div>
                </div>

                {/* Price Range */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Faixa de Preço (R$)</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="number"
                        placeholder="Mín"
                        value={filters.priceRange.min || ''}
                        onChange={(e) => handleFilterChange('priceRange', {
                          ...filters.priceRange,
                          min: parseInt(e.target.value) || 0
                        })}
                        className="pl-10"
                      />
                    </div>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="number"
                        placeholder="Máx"
                        value={filters.priceRange.max || ''}
                        onChange={(e) => handleFilterChange('priceRange', {
                          ...filters.priceRange,
                          max: parseInt(e.target.value) || 50000
                        })}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>

                {/* Rating & Urgency */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Avaliação Mínima</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <motion.button
                          key={rating}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleFilterChange('rating', rating === filters.rating ? 0 : rating)}
                          className={`p-2 rounded-lg transition-colors ${
                            rating <= filters.rating 
                              ? 'bg-yellow-100 text-yellow-600' 
                              : 'bg-muted hover:bg-muted/80'
                          }`}
                        >
                          <Star className={`w-4 h-4 ${rating <= filters.rating ? 'fill-current' : ''}`} />
                        </motion.button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Urgência</label>
                    <div className="flex gap-2">
                      {[
                        { label: 'Todos', value: 'all' },
                        { label: 'Normal', value: 'normal' },
                        { label: 'Urgente', value: 'urgent' }
                      ].map((option) => (
                        <motion.button
                          key={option.value}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleFilterChange('urgency', option.value)}
                          className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                            filters.urgency === option.value
                              ? 'bg-accent text-accent-foreground'
                              : 'bg-muted hover:bg-muted/80'
                          }`}
                        >
                          {option.label}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Cargo Types */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Tipos de Carga</label>
                  <div className="flex flex-wrap gap-2">
                    {cargoTypes.map((type) => (
                      <motion.button
                        key={type}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          const newTypes = filters.cargoType.includes(type)
                            ? filters.cargoType.filter(t => t !== type)
                            : [...filters.cargoType, type];
                          handleFilterChange('cargoType', newTypes);
                        }}
                        className={`px-3 py-1 rounded-full text-sm transition-colors ${
                          filters.cargoType.includes(type)
                            ? 'bg-accent text-accent-foreground'
                            : 'bg-muted hover:bg-muted/80'
                        }`}
                      >
                        {type}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Truck Types */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Tipos de Veículo</label>
                  <div className="flex flex-wrap gap-2">
                    {truckTypes.map((type) => (
                      <motion.button
                        key={type}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          const newTypes = filters.truckType.includes(type)
                            ? filters.truckType.filter(t => t !== type)
                            : [...filters.truckType, type];
                          handleFilterChange('truckType', newTypes);
                        }}
                        className={`px-3 py-1 rounded-full text-sm transition-colors ${
                          filters.truckType.includes(type)
                            ? 'bg-accent text-accent-foreground'
                            : 'bg-muted hover:bg-muted/80'
                        }`}
                      >
                        {type}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Optimized Search Results */}
      <AnimatePresence>
        {(isSearching || results.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Route className="w-5 h-5 text-accent" />
                    Resultados Otimizados {filters.origin && filters.destination && `para ${filters.origin} → ${filters.destination}`}
                  </CardTitle>
                  {results.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {results.length} encontrado{results.length > 1 ? 's' : ''}
                      </Badge>
                      <Badge className="bg-accent text-accent-foreground">
                        Ordenado por Logística
                      </Badge>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isSearching ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                      <span className="text-muted-foreground">Analisando melhor logística...</span>
                    </div>
                  </div>
                ) : results.length > 0 ? (
                  <div className="space-y-4">
                    {results.map((result, index) => {
                      const logisticBadge = getLogisticBadge(result.logisticScore);
                      
                      return (
                        <motion.div
                          key={result.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                          className="border border-light rounded-lg p-5 cursor-pointer hover:shadow-card-hover transition-all bg-white shadow-card"
                          onClick={() => setSelectedResult(result)}
                        >
                          <div className="flex items-start gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getResultColor(result.type)}`}>
                              {getResultIcon(result.type)}
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <h3 className="font-semibold text-lg flex items-center gap-2 mb-1">
                                    {result.title}
                                    {result.verified && (
                                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                        ✓ Verificado
                                      </Badge>
                                    )}
                                    {result.urgency === 'urgent' && (
                                      <Badge className="bg-red-100 text-red-800">
                                        <Zap className="w-3 h-3 mr-1" />
                                        Urgente
                                      </Badge>
                                    )}
                                  </h3>
                                  <p className="text-muted-foreground mb-1">{result.subtitle}</p>
                                  <p className="text-sm text-muted-foreground">{result.description}</p>
                                </div>
                                
                                <div className="text-right">
                                  {result.price && (
                                    <div className="text-xl font-semibold text-accent mb-1">{result.price}</div>
                                  )}
                                  {result.rating && (
                                    <div className="flex items-center gap-1 text-sm mb-1">
                                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                      <span className="font-medium">{result.rating}</span>
                                    </div>
                                  )}
                                  <Badge className={logisticBadge.color}>
                                    {logisticBadge.label}
                                  </Badge>
                                </div>
                              </div>

                              {/* Route Information */}
                              <div className="bg-muted/30 rounded-lg p-3 mb-3">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                  <div className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-green-600" />
                                    <span className="font-medium">Origem:</span>
                                    <span>{result.origin}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Target className="w-4 h-4 text-red-600" />
                                    <span className="font-medium">Destino:</span>
                                    <span>{result.destination}</span>
                                  </div>
                                  {result.estimatedTime && (
                                    <div className="flex items-center gap-2">
                                      <Clock className="w-4 h-4 text-blue-600" />
                                      <span className="font-medium">Tempo:</span>
                                      <span>{result.estimatedTime}</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Experience & Efficiency */}
                              {result.experience && (
                                <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
                                  <div className="text-center">
                                    <div className="font-semibold text-blue-600">{result.experience.totalTrips}</div>
                                    <div className="text-muted-foreground">Viagens</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="font-semibold text-green-600">{result.experience.sameRoute}</div>
                                    <div className="text-muted-foreground">Nesta Rota</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="font-semibold text-purple-600">{result.experience.onTimeDelivery}%</div>
                                    <div className="text-muted-foreground">Pontualidade</div>
                                  </div>
                                </div>
                              )}
                              
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  {result.distance && (
                                    <div className="flex items-center gap-1">
                                      <Navigation className="w-3 h-3" />
                                      <span>{result.distance}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3 text-green-600" />
                                    <span>Score: {result.logisticScore}/100</span>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  <div className="flex flex-wrap gap-1">
                                    {result.tags.slice(0, 2).map((tag, tagIndex) => (
                                      <Badge key={tagIndex} variant="outline" className="text-xs">
                                        {tag}
                                      </Badge>
                                    ))}
                                  </div>
                                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Route className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <h3 className="font-medium mb-2">Nenhuma opção logística encontrada</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Tente ajustar a origem, destino ou filtros para encontrar melhores opções
                    </p>
                    <Button variant="outline" onClick={clearFilters}>
                      Limpar Filtros
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Result Detail Modal */}
      <AnimatePresence>
        {selectedResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedResult(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getResultColor(selectedResult.type)}`}>
                      {getResultIcon(selectedResult.type)}
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold">{selectedResult.title}</h2>
                      <p className="text-muted-foreground">{selectedResult.subtitle}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedResult(null)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium mb-2">Detalhes da Rota</h3>
                    <div className="bg-muted/30 rounded-lg p-4">
                      <div className="flex items-center gap-4 mb-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-green-600" />
                          <span className="font-medium">{selectedResult.origin}</span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-red-600" />
                          <span className="font-medium">{selectedResult.destination}</span>
                        </div>
                      </div>
                      {selectedResult.route && (
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Distância:</span>
                            <p className="font-medium">{selectedResult.route.distance} km</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Duração:</span>
                            <p className="font-medium">{Math.floor(selectedResult.route.duration / 60)}h {selectedResult.route.duration % 60}min</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Eficiência:</span>
                            <p className="font-medium">{selectedResult.route.efficiency}%</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedResult.experience && (
                    <div>
                      <h3 className="font-medium mb-2">Experiência & Performance</h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <div className="text-2xl font-semibold text-blue-600">{selectedResult.experience.totalTrips}</div>
                          <div className="text-sm text-muted-foreground">Total de Viagens</div>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <div className="text-2xl font-semibold text-green-600">{selectedResult.experience.sameRoute}</div>
                          <div className="text-sm text-muted-foreground">Nesta Rota</div>
                        </div>
                        <div className="text-center p-3 bg-purple-50 rounded-lg">
                          <div className="text-2xl font-semibold text-purple-600">{selectedResult.experience.onTimeDelivery}%</div>
                          <div className="text-sm text-muted-foreground">Pontualidade</div>
                        </div>
                      </div>
                    </div>
                  )}

                  <Separator />
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-medium mb-2">Informações Gerais</h3>
                      <div className="space-y-2 text-sm">
                        {selectedResult.rating && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Avaliação:</span>
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              <span className="font-medium">{selectedResult.rating}</span>
                            </div>
                          </div>
                        )}
                        {selectedResult.price && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Preço:</span>
                            <span className="font-medium text-accent">{selectedResult.price}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Status:</span>
                          <Badge className={
                            selectedResult.availability === 'available' ? 'bg-green-100 text-green-800' :
                            selectedResult.availability === 'busy' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }>
                            {selectedResult.availability === 'available' ? 'Disponível' :
                             selectedResult.availability === 'busy' ? 'Ocupado' : 'Indisponível'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-medium mb-2">Score Logístico</h3>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Otimização:</span>
                          <span className="font-medium">{selectedResult.logisticScore}/100</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              selectedResult.logisticScore >= 90 ? 'bg-green-500' :
                              selectedResult.logisticScore >= 80 ? 'bg-blue-500' :
                              selectedResult.logisticScore >= 70 ? 'bg-yellow-500' : 'bg-gray-500'
                            }`}
                            style={{ width: `${selectedResult.logisticScore}%` }}
                          />
                        </div>
                        <Badge className={getLogisticBadge(selectedResult.logisticScore).color}>
                          {getLogisticBadge(selectedResult.logisticScore).label}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium mb-2">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedResult.tags.map((tag, index) => (
                        <Badge key={index} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button className="flex-1 bg-accent hover:bg-accent/90">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Contratar Serviço
                    </Button>
                    <Button variant="outline" className="flex-1">
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Enviar Mensagem
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}