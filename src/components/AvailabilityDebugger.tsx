/**
 * Componente de Debug para Disponibilidade de Motoristas
 * Use este componente para testar a integração com Supabase
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { database } from '../utils/database';
import { CheckCircle, XCircle, RefreshCw, MapPin, Clock } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface AvailabilityDebuggerProps {
  userId: string;
  userType: string;
}

export const AvailabilityDebugger: React.FC<AvailabilityDebuggerProps> = ({ userId, userType }) => {
  const [availability, setAvailability] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [availableDrivers, setAvailableDrivers] = useState<any[]>([]);

  const loadAvailability = async () => {
    setLoading(true);
    try {
      const data = await database.getDriverAvailability(userId);
      setAvailability(data);
      toast.success('Disponibilidade carregada do Supabase!');
    } catch (error) {
      toast.error('Erro ao carregar disponibilidade');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAvailability = async () => {
    setLoading(true);
    try {
      const newStatus = !availability?.isAvailable;
      const expiresAt = newStatus 
        ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        : null;

      const result = await database.updateDriverAvailability(userId, {
        isAvailable: newStatus,
        location: availability?.location || { city: 'São Paulo', state: 'SP' },
        expiresAt
      });

      if (result.success) {
        toast.success('Disponibilidade atualizada no Supabase!');
        await loadAvailability();
      } else {
        toast.error('Erro ao atualizar: ' + result.error);
      }
    } catch (error) {
      toast.error('Erro ao atualizar disponibilidade');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableDrivers = async () => {
    setLoading(true);
    try {
      const result = await database.getAvailableDriversByLocation();
      if (result.success) {
        setAvailableDrivers(result.data);
        toast.success(`Encontrados ${result.data.length} motoristas disponíveis!`);
      } else {
        toast.error('Erro ao buscar motoristas: ' + result.error);
      }
    } catch (error) {
      toast.error('Erro ao buscar motoristas');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userType === 'caminhoneiro') {
      loadAvailability();
    }
  }, [userId, userType]);

  if (userType !== 'caminhoneiro' && userType !== 'transportadora' && userType !== 'embarcador') {
    return null;
  }

  return (
    <div className="space-y-4 p-4">
      <Card className="bg-yellow-50 border-yellow-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            🧪 Debugger de Disponibilidade (Supabase)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status de Conexão */}
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="outline" className="gap-1">
              {availability ? (
                <>
                  <CheckCircle className="w-3 h-3 text-green-600" />
                  Conectado ao Supabase
                </>
              ) : (
                <>
                  <XCircle className="w-3 h-3 text-red-600" />
                  Não conectado
                </>
              )}
            </Badge>
          </div>

          {/* Apenas para motoristas */}
          {userType === 'caminhoneiro' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-gray-600">Status:</p>
                  <p className="font-medium">
                    {availability?.isAvailable ? (
                      <Badge className="bg-green-600">Disponível</Badge>
                    ) : (
                      <Badge variant="secondary">Indisponível</Badge>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Localização:</p>
                  <p className="font-medium flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {availability?.location?.city || 'Não definida'}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-600">Expira em:</p>
                  <p className="font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {availability?.expiresAt 
                      ? new Date(availability.expiresAt).toLocaleString('pt-BR')
                      : 'Não definido'}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={toggleAvailability}
                  disabled={loading}
                  size="sm"
                  className="flex-1"
                >
                  {loading ? 'Processando...' : 'Toggle Disponibilidade'}
                </Button>
                <Button
                  onClick={loadAvailability}
                  disabled={loading}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Para empresas e embarcadores */}
          {(userType === 'transportadora' || userType === 'embarcador') && (
            <div className="space-y-3">
              <Button
                onClick={loadAvailableDrivers}
                disabled={loading}
                className="w-full"
                size="sm"
              >
                {loading ? 'Buscando...' : `Buscar Motoristas Disponíveis (${availableDrivers.length})`}
              </Button>

              {availableDrivers.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {availableDrivers.map((driver: any) => (
                    <Card key={driver.id} className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">
                            {driver.profiles?.name || 'Motorista'}
                          </p>
                          <p className="text-xs text-gray-600 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {driver.current_location?.city}, {driver.current_location?.state}
                          </p>
                        </div>
                        <Badge className="bg-green-600 text-xs">
                          ⭐ {driver.profiles?.rating?.toFixed(1) || '0.0'}
                        </Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Informações técnicas */}
          <div className="text-xs text-gray-500 pt-2 border-t">
            <p>User ID: {userId.slice(0, 8)}...</p>
            <p>Tipo: {userType}</p>
            <p>Última atualização: {new Date().toLocaleTimeString('pt-BR')}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
