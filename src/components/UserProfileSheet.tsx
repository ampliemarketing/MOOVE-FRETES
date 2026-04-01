import React from 'react';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from './ui/sheet';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { 
  User, 
  Star, 
  MessageCircle, 
  MapPin, 
  Route, 
  CheckCircle, 
  TrendingUp 
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import type { Driver } from '../utils/database/schema';

interface UserProfileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver: Driver | null;
  showContactButton?: boolean;
}

export function UserProfileSheet({ 
  open, 
  onOpenChange, 
  driver, 
  showContactButton = true 
}: UserProfileSheetProps) {
  if (!driver) return null;

  const handleWhatsAppContact = () => {
    if (!driver.phone) {
      toast.error('Telefone não disponível');
      return;
    }
    
    const message = `Olá ${driver.name}, vi seu perfil no MaisFrete e gostaria de conversar.`;
    const phone = driver.phone.replace(/\D/g, '');
    const url = `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    toast.success(`Abrindo WhatsApp para ${driver.name}`);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0">
        <SheetTitle className="sr-only">
          {`Perfil de ${driver.name}`}
        </SheetTitle>
        <SheetDescription className="sr-only">
          {`Informações completas sobre ${driver.name}`}
        </SheetDescription>
        
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="relative bg-gradient-to-br from-primary/5 via-background to-background p-6 pb-4 border-b">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-white shadow-lg">
                    <User className="w-8 h-8" />
                  </div>
                </div>
                
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <h2 className="font-medium">{driver.name}</h2>
                      </div>
                      
                      <div className="flex items-center space-x-3 text-sm text-muted-foreground mb-2">
                        <div className="flex items-center space-x-1">
                          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                          <span>{driver.rating.toFixed(1)}</span>
                        </div>
                        <span>•</span>
                        <span>{driver.totalTrips} viagens</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white rounded-lg p-2 text-center border">
                <div className="flex items-center justify-center space-x-1 mb-1">
                  <TrendingUp className="w-3 h-3 text-green-500" />
                  <span className="text-sm font-medium">{driver.completedTrips}</span>
                </div>
                <div className="text-xs text-muted-foreground">Viagens Completas</div>
              </div>
              <div className="bg-white rounded-lg p-2 text-center border">
                <div className="flex items-center justify-center space-x-1 mb-1">
                  <Star className="w-3 h-3 text-yellow-500" />
                  <span className="text-sm font-medium">{driver.rating.toFixed(1)}</span>
                </div>
                <div className="text-xs text-muted-foreground">Avaliação</div>
              </div>
              <div className="bg-white rounded-lg p-2 text-center border">
                <div className="flex items-center justify-center space-x-1 mb-1">
                  <CheckCircle className="w-3 h-3 text-blue-500" />
                  <span className="text-sm font-medium">{driver.verified ? 'Sim' : 'Não'}</span>
                </div>
                <div className="text-xs text-muted-foreground">Verificado</div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Informações de Contato */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Contato</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {driver.phone ? (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <MessageCircle className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">{driver.phone}</div>
                        <div className="text-xs text-muted-foreground">Telefone principal</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">Telefone não informado</div>
                  )}
                  {driver.email && (
                    <div className="text-sm text-muted-foreground">
                      Email: {driver.email}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Localização */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Localização</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {driver.currentLocation && driver.currentLocation.city ? (
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-3 h-3" />
                      <span>Localização Atual</span>
                    </div>
                    <span className="font-medium">
                      {driver.currentLocation.city}, {driver.currentLocation.state}
                    </span>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">Localização não informada</div>
                )}
              </CardContent>
            </Card>

            {/* Veículo */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Veículo</CardTitle>
              </CardHeader>
              <CardContent>
                {driver.vehicle ? (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground">Tipo</div>
                      <div className="font-medium">{driver.vehicle.type || 'Não informado'}</div>
                    </div>
                    {driver.vehicle.plate && (
                      <div>
                        <div className="text-xs text-muted-foreground">Placa</div>
                        <div className="font-medium">{driver.vehicle.plate}</div>
                      </div>
                    )}
                    {driver.vehicle.brand && (
                      <div>
                        <div className="text-xs text-muted-foreground">Marca</div>
                        <div className="font-medium">{driver.vehicle.brand}</div>
                      </div>
                    )}
                    {driver.vehicle.model && (
                      <div>
                        <div className="text-xs text-muted-foreground">Modelo</div>
                        <div className="font-medium">{driver.vehicle.model}</div>
                      </div>
                    )}
                    {driver.vehicle.year && (
                      <div>
                        <div className="text-xs text-muted-foreground">Ano</div>
                        <div className="font-medium">{driver.vehicle.year}</div>
                      </div>
                    )}
                    {driver.vehicle.capacity && driver.vehicle.capacity > 0 && (
                      <div>
                        <div className="text-xs text-muted-foreground">Capacidade</div>
                        <div className="font-medium">{driver.vehicle.capacity} kg</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">Informações do veículo não disponíveis</div>
                )}
              </CardContent>
            </Card>

            {/* CNH */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">CNH</CardTitle>
              </CardHeader>
              <CardContent>
                {driver.cnh ? (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground">Número</div>
                      <div className="font-medium">{driver.cnh}</div>
                    </div>
                    {driver.cnhCategory && (
                      <div>
                        <div className="text-xs text-muted-foreground">Categoria</div>
                        <div className="font-medium">{driver.cnhCategory}</div>
                      </div>
                    )}
                    {driver.cnhValidity && (
                      <div>
                        <div className="text-xs text-muted-foreground">Validade</div>
                        <div className="font-medium">
                          {new Date(driver.cnhValidity).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">Informações da CNH não disponíveis</div>
                )}
              </CardContent>
            </Card>

            {/* Rotas Preferidas */}
            {driver.preferredRoutes && driver.preferredRoutes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Rotas Preferidas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {driver.preferredRoutes.map((route, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <Route className="w-3 h-3 text-muted-foreground" />
                        <span>{route}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Especializações */}
            {driver.specializations && driver.specializations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Especializações</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {driver.specializations.map((spec, index) => (
                      <Badge key={index} variant="outline" className="bg-blue-50 text-blue-700">
                        {spec}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Estados de Operação */}
            {driver.operatingStates && driver.operatingStates.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Estados de Operação</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {driver.operatingStates.map((state, index) => (
                      <Badge key={index} variant="outline">
                        {state}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Informações Adicionais */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Informações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Membro desde</span>
                  <span className="font-medium">
                    {new Date(driver.createdAt).toLocaleDateString('pt-BR', { 
                      year: 'numeric', 
                      month: 'long' 
                    })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={driver.status === 'available' ? 'default' : 'secondary'}>
                    {driver.status === 'available' ? 'Disponível' : 
                     driver.status === 'busy' ? 'Ocupado' : 'Offline'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Actions Footer */}
          {showContactButton && driver.phone && (
            <div className="border-t p-4 bg-background">
              <Button 
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                onClick={handleWhatsAppContact}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Contatar via WhatsApp
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}