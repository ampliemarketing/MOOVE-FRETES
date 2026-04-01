/**
 * Contador de Disponibilidade
 * Mostra quanto tempo falta para a disponibilidade expirar
 */

import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

interface AvailabilityCountdownProps {
  expiresAt: Date;
  onExpired?: () => void;
  onRenew?: () => void;
}

export const AvailabilityCountdown: React.FC<AvailabilityCountdownProps> = ({ 
  expiresAt, 
  onExpired,
  onRenew
}) => {
  const [timeRemaining, setTimeRemaining] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    total: number;
  }>({ hours: 0, minutes: 0, seconds: 0, total: 0 });

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const difference = expiry - now;

      if (difference <= 0) {
        setTimeRemaining({ hours: 0, minutes: 0, seconds: 0, total: 0 });
        onExpired?.();
        return;
      }

      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeRemaining({ hours, minutes, seconds, total: difference });
    };

    // Calcular imediatamente
    calculateTimeRemaining();

    // Atualizar a cada segundo
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpired]);

  // Definir cor baseado no tempo restante
  const getColorClass = () => {
    const hoursRemaining = timeRemaining.total / (1000 * 60 * 60);
    
    if (hoursRemaining <= 2) {
      return 'bg-red-100 text-red-700 border-red-300'; // Últimas 2 horas
    } else if (hoursRemaining <= 6) {
      return 'bg-yellow-100 text-yellow-700 border-yellow-300'; // Últimas 6 horas
    } else {
      return 'bg-green-100 text-green-700 border-green-300'; // Mais de 6 horas
    }
  };

  // Formatar tempo de forma legível
  const formatTime = () => {
    if (timeRemaining.total <= 0) {
      return 'Expirado';
    }

    const { hours, minutes } = timeRemaining;
    
    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    } else {
      return `${minutes}min`;
    }
  };

  // Mostrar ícone apropriado
  const Icon = timeRemaining.total <= 2 * 60 * 60 * 1000 ? AlertTriangle : Clock;

  // Mostrar botão de renovar se estiver nas últimas 6 horas
  const showRenewButton = timeRemaining.total <= 6 * 60 * 60 * 1000 && timeRemaining.total > 0;

  if (!showRenewButton) {
    return (
      <div 
        className={`flex items-center gap-2 px-3 h-10 rounded-lg border transition-all ${getColorClass()}`}
      >
        <Icon className="w-4 h-4" />
        <span className="text-xs font-medium whitespace-nowrap">{formatTime()}</span>
      </div>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="h-10">
          <div 
            className={`flex items-center gap-2 px-3 h-10 rounded-lg border transition-all cursor-pointer hover:opacity-80 ${getColorClass()}`}
          >
            <Icon className="w-4 h-4" />
            <span className="text-xs font-medium whitespace-nowrap">{formatTime()}</span>
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="end">
        <div className="space-y-3">
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {timeRemaining.total <= 2 * 60 * 60 * 1000 
                ? '⚠️ Expirando em breve!' 
                : '🕒 Disponibilidade acabando'}
            </p>
            <p className="text-xs text-muted-foreground">
              Sua disponibilidade expira em <strong>{formatTime()}</strong>. 
              Deseja renovar por mais 24 horas?
            </p>
          </div>
          
          {onRenew && (
            <Button 
              onClick={() => {
                onRenew();
              }}
              size="sm" 
              className="w-full gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Renovar por 24h
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};