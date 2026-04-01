/**
 * Painel de Debug para Disponibilidade de Motoristas
 * Mostra em tempo real o status da sincronização
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { checkDriverExists, createDriverIfNotExists } from '../utils/debug-driver-check';
import { database } from '../utils/database';
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface DriverAvailabilityDebugPanelProps {
  userId: string;
}

export const DriverAvailabilityDebugPanel: React.FC<DriverAvailabilityDebugPanelProps> = ({ userId }) => {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const checkStatus = async () => {
    setLoading(true);
    console.log('🔍 Verificando status do motorista...');
    
    try {
      const result = await checkDriverExists(userId);
      setStatus(result);
      setLastCheck(new Date());
      
      if (!result.exists && result.needsCreation) {
        toast.error('Motorista não existe na tabela drivers!');
      } else if (result.exists) {
        toast.success('Motorista encontrado no Supabase!');
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error);
      toast.error('Erro ao verificar status');
    } finally {
      setLoading(false);
    }
  };

  const createDriver = async () => {
    setLoading(true);
    try {
      const result = await createDriverIfNotExists(userId);
      if (result.success) {
        toast.success('Motorista criado com sucesso!');
        await checkStatus();
      } else {
        toast.error('Erro ao criar motorista');
      }
    } catch (error) {
      console.error('Erro ao criar motorista:', error);
      toast.error('Erro ao criar motorista');
    } finally {
      setLoading(false);
    }
  };

  const testUpdate = async () => {
    setLoading(true);
    try {
      const result = await database.updateDriverAvailability(userId, {
        isAvailable: true,
        location: { city: 'São Paulo', state: 'SP' },
        expiresAt: new Date(Date.now() + 24*60*60*1000).toISOString()
      });

      if (result.success) {
        toast.success('Teste de update bem-sucedido!');
        await checkStatus();
      } else {
        toast.error('Falha no teste: ' + result.error);
      }
    } catch (error) {
      console.error('Erro no teste:', error);
      toast.error('Erro no teste de update');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, [userId]);

  return (
    <Card className="border-2 border-orange-400 bg-orange-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          🔧 Debug de Disponibilidade
          <Button 
            onClick={checkStatus} 
            disabled={loading}
            variant="ghost" 
            size="sm"
            className="h-6 w-6 p-0"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {/* Status da Conexão */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-gray-600">User ID:</span>
            <code className="text-xs bg-white px-2 py-1 rounded">{userId.slice(0, 8)}...</code>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-gray-600">Status no Supabase:</span>
            {status === null ? (
              <Badge variant="outline">Verificando...</Badge>
            ) : status.exists ? (
              <Badge className="bg-green-600 gap-1">
                <CheckCircle className="w-3 h-3" />
                Existe
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1">
                <XCircle className="w-3 h-3" />
                Não existe
              </Badge>
            )}
          </div>

          {status?.exists && status.driver && (
            <div className="p-2 bg-white rounded border text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">Disponível:</span>
                <span className="font-medium">{status.driver.available ? '✅ Sim' : '❌ Não'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Localização:</span>
                <span className="font-medium">
                  {status.driver.current_location?.city || 'Não definida'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Expira em:</span>
                <span className="font-medium">
                  {status.driver.availability_expires_at 
                    ? new Date(status.driver.availability_expires_at).toLocaleString('pt-BR')
                    : 'N/A'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Ações */}
        <div className="flex gap-2">
          {!status?.exists && (
            <Button
              onClick={createDriver}
              disabled={loading}
              size="sm"
              className="flex-1 text-xs h-8"
            >
              Criar Motorista
            </Button>
          )}
          
          {status?.exists && (
            <Button
              onClick={testUpdate}
              disabled={loading}
              variant="outline"
              size="sm"
              className="flex-1 text-xs h-8"
            >
              Testar Update
            </Button>
          )}
        </div>

        {/* Última Verificação */}
        {lastCheck && (
          <div className="text-xs text-gray-500 pt-2 border-t">
            Última verificação: {lastCheck.toLocaleTimeString('pt-BR')}
          </div>
        )}

        {/* Alerta */}
        {!status?.exists && status?.needsCreation && (
          <div className="flex items-start gap-2 p-2 bg-yellow-100 border border-yellow-300 rounded text-xs">
            <AlertCircle className="w-4 h-4 text-yellow-700 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-900">Ação Necessária</p>
              <p className="text-yellow-800 mt-1">
                O registro do motorista precisa ser criado na tabela 'drivers' do Supabase antes de usar a funcionalidade de disponibilidade.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
