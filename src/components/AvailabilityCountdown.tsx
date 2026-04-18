import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

interface AvailabilityCountdownProps {
  expiresAt: Date;
  onExpired?: () => void;
  onRenew?: () => void;
  /** Renderiza sem borda/fundo próprios — para uso dentro de uma pílula unificada */
  inline?: boolean;
}

export const AvailabilityCountdown: React.FC<AvailabilityCountdownProps> = ({
  expiresAt,
  onExpired,
  onRenew,
  inline = false,
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

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, onExpired]);

  const getPillColorClass = () => {
    const h = timeRemaining.total / (1000 * 60 * 60);
    if (h <= 2) return 'bg-red-100 text-red-700 border-red-300';
    if (h <= 6) return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    return 'bg-green-100 text-green-700 border-green-300';
  };

  const getInlineTextClass = () => {
    const h = timeRemaining.total / (1000 * 60 * 60);
    if (h <= 2) return 'text-red-600';
    if (h <= 6) return 'text-yellow-600';
    return 'text-gray-500';
  };

  const formatTime = () => {
    if (timeRemaining.total <= 0) return 'Expirado';
    const { hours, minutes } = timeRemaining;
    return hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
  };

  const Icon = timeRemaining.total <= 2 * 60 * 60 * 1000 ? AlertTriangle : Clock;
  const showRenewButton = timeRemaining.total <= 6 * 60 * 60 * 1000 && timeRemaining.total > 0;

  const popoverContent = (
    <PopoverContent className="w-64 p-3" align="end">
      <div className="space-y-3">
        <div className="space-y-1">
          <p className="text-sm font-medium">
            {timeRemaining.total <= 2 * 60 * 60 * 1000
              ? 'Expirando em breve!'
              : 'Disponibilidade acabando'}
          </p>
          <p className="text-xs text-muted-foreground">
            Sua disponibilidade expira em <strong>{formatTime()}</strong>.
            Deseja renovar por mais 24 horas?
          </p>
        </div>
        {onRenew && (
          <Button onClick={onRenew} size="sm" className="w-full gap-2">
            <RefreshCw className="w-3.5 h-3.5" />
            Renovar por 24h
          </Button>
        )}
      </div>
    </PopoverContent>
  );

  if (inline) {
    if (!showRenewButton) {
      return (
        <div className={`flex items-center gap-1.5 px-3 h-full ${getInlineTextClass()}`}>
          <Icon className="w-3.5 h-3.5" />
          <span className="text-xs font-medium whitespace-nowrap">{formatTime()}</span>
        </div>
      );
    }
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button className={`flex items-center gap-1.5 px-3 h-full hover:opacity-80 transition-opacity ${getInlineTextClass()}`}>
            <Icon className="w-3.5 h-3.5" />
            <span className="text-xs font-medium whitespace-nowrap">{formatTime()}</span>
          </button>
        </PopoverTrigger>
        {popoverContent}
      </Popover>
    );
  }

  if (!showRenewButton) {
    return (
      <div className={`flex items-center gap-2 px-3 h-10 rounded-lg border transition-all ${getPillColorClass()}`}>
        <Icon className="w-4 h-4" />
        <span className="text-xs font-medium whitespace-nowrap">{formatTime()}</span>
      </div>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="h-10">
          <div className={`flex items-center gap-2 px-3 h-10 rounded-lg border transition-all cursor-pointer hover:opacity-80 ${getPillColorClass()}`}>
            <Icon className="w-4 h-4" />
            <span className="text-xs font-medium whitespace-nowrap">{formatTime()}</span>
          </div>
        </button>
      </PopoverTrigger>
      {popoverContent}
    </Popover>
  );
};
