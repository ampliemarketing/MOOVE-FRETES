import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  MapPin, 
  Calendar,
  Weight,
  DollarSign,
  Clock,
  Search, 
  Filter,
  Plus,
  Eye,
  Edit3,
  Truck,
  Package,
  Route,
  User,
  Phone,
  MessageCircle,
  MoreHorizontal,
  ArrowRight,
  Download,
  RefreshCw,
  Settings
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface Freight {
  id: string;
  freight_code?: string; // Código único no padrão placa brasileira (AAA0A00)
  type: 'plus' | 'standard';
  exposure: 'alta' | 'media' | 'baixa';
  origin: {
    city: string;
    state: string;
  };
  destination: {
    city: string;
    state: string;
  };
  weight: string;
  vehicleType: string;
  cargoType: string;
  price: string;
  status: 'active' | 'inactive' | 'completed';
  createdAt: string;
}

// Demo freights removed - system uses only real data from database
const DEMO_FREIGHTS: Freight[] = [];

export function FreightSummaryScreen() {
  const [freights, setFreights] = useState<Freight[]>(DEMO_FREIGHTS);
  const [filteredFreights, setFilteredFreights] = useState<Freight[]>(DEMO_FREIGHTS);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState<'ativo' | 'agendados' | 'desativados'>('ativo');

  useEffect(() => {
    let filtered = [...freights];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(freight =>
        freight.origin?.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        freight.destination?.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        freight.cargoType?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredFreights(filtered);
  }, [freights, searchTerm]);

  const getExposureColor = (exposure: string) => {
    switch (exposure) {
      case 'alta':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'media':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'baixa':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getExposureText = (exposure: string) => {
    switch (exposure) {
      case 'alta':
        return 'Alta exposição';
      case 'media':
        return 'Média exposição';
      case 'baixa':
        return 'Baixa exposição';
      default:
        return 'Exposição padrão';
    }
  };

  const handleDownloadList = () => {
    toast.success('[Demo] Download da listagem iniciado');
  };

  const handleRefresh = () => {
    toast.success('[Demo] Lista atualizada');
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b border-border bg-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-medium text-foreground">Fretes</h1>
            
            {/* Navigation Tabs */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSelectedTab('ativo')}
                className={`px-3 py-1 text-sm transition-colors ${
                  selectedTab === 'ativo'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Fretes
              </button>
              <span className="text-muted-foreground">•</span>
              <button className="text-sm text-muted-foreground hover:text-foreground">
                Gestão de Risco
              </button>
              <span className="text-muted-foreground">•</span>
              <button className="text-sm text-muted-foreground hover:text-foreground">
                Monitoramento
              </button>
              <span className="text-muted-foreground">•</span>
              <button className="text-sm text-muted-foreground hover:text-foreground">
                Documentação
              </button>
              <span className="text-muted-foreground">•</span>
              <button className="text-sm text-muted-foreground hover:text-foreground">
                Relatórios
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              Pré-consulta
            </Button>
            <span className="text-sm text-muted-foreground">GS</span>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="border-b border-border bg-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar frete"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filtros
            </Button>

            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-gray-900 rounded"></span>
                <span>Ativos: 1</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-gray-300 rounded"></span>
                <span>Agendados: {filteredFreights.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-gray-200 rounded"></span>
                <span>Desativados: 704</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
            <Button size="sm" className="bg-red-500 hover:bg-red-600 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Criar frete
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {filteredFreights.map((freight, index) => (
                <motion.div
                  key={freight.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                  layout
                >
                  <Card className="hover:shadow-card-hover transition-all duration-200 border-border">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        {/* Left Section */}
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-4">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-foreground">
                                  Frete {freight.type === 'plus' ? 'Plus' : 'Standard'}
                                </span>
                              </div>
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${getExposureColor(freight.exposure)}`}
                              >
                                {getExposureText(freight.exposure)}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {/* Center Section - Route */}
                        <div className="flex-1 px-8">
                          <div className="text-center">
                            <div className="text-base font-medium text-foreground mb-1">
                              {freight.origin.city}, {freight.origin.state}
                            </div>
                            <div className="text-sm text-muted-foreground mb-2">
                              {freight.destination.city}, {freight.destination.state}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              <div>{freight.weight}</div>
                              <div>{freight.vehicleType} | {freight.cargoType}</div>
                            </div>
                          </div>
                        </div>

                        {/* Right Section */}
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-base font-medium text-foreground">
                              {freight.price}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>

            {filteredFreights.length === 0 && (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Nenhum frete encontrado
                </h3>
                <p className="text-muted-foreground mb-4">
                  Tente ajustar os filtros
                </p>
              </div>
            )}
          </div>

          {/* Bottom Actions */}
          <div className="mt-8 flex justify-start">
            <Button 
              variant="outline" 
              onClick={handleDownloadList}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download da listagem
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}