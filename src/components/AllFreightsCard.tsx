// AllFreightsCard - Card de exibição de fretes
import React, { useMemo } from 'react';
import { Badge } from './ui/badge';
import { ImageWithFallback } from './ImageWithFallback';
import { formatLocation, isValidLocation } from '../utils/location-helpers';
import { getAvatarUrl } from '../utils/storage-helper';

interface Freight {
  id: string;
  freight_code?: string;
  type: 'plus' | 'regular';
  exposureLevel: string;
  origin: { city: string; state: string };
  destination: { city: string; state: string };
  cargo: string | { type: string; weight: string; description: string };
  weight: string;
  truckType: string;
  category: string;
  status: string;
  pickupDate?: string;
  price: string;
  createdAt: string;
  customerId: string;
  customerName?: string;
  companyLogo?: string;
  valueCalculation?: string;
  paymentIncluded?: 'included' | 'separate';
  paymentMethod?: string;
}

interface AllFreightsCardProps {
  freight: Freight;
  onClick: () => void;
}

// Função para calcular tempo desde publicação
const getTimeAgo = (dateString: string): string => {
  const now = new Date();
  const created = new Date(dateString);
  const diffMs = now.getTime() - created.getTime();
  
  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);
  
  if (minutes < 60) {
    return `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
  } else if (hours < 24) {
    return `${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  } else if (days < 7) {
    return `${days} ${days === 1 ? 'dia' : 'dias'}`;
  } else if (weeks < 4) {
    return `${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`;
  } else if (months < 12) {
    return `${months} ${months === 1 ? 'mês' : 'meses'}`;
  } else {
    return `${years} ${years === 1 ? 'ano' : 'anos'}`;
  }
};

export function AllFreightsCard({ freight, onClick }: AllFreightsCardProps) {
  const cargoType = typeof freight.cargo === 'string' ? freight.cargo : freight.cargo.type;
  const timeAgo = getTimeAgo(freight.createdAt);
  const isSponsored = freight.type === 'plus';
  
  // ✅ CONVERTER companyLogo PATH → URL dinamicamente
  const companyLogoUrl = useMemo(() => getAvatarUrl(freight.companyLogo), [freight.companyLogo]);
  
  return (
    <div
      onClick={onClick}
      className={`
        relative bg-white rounded-xl border border-gray-200 p-4 cursor-pointer
        transition-all duration-200 hover:shadow-md hover:border-primary/30
        ${isSponsored ? 'ring-2 ring-primary/20' : ''}
      `}
    >
      {/* Sponsored Badge */}
      {isSponsored && (
        <div className="absolute -top-2 left-4">
          <Badge className="bg-primary text-white text-xs px-2 py-0.5">
            Patrocinado
          </Badge>
        </div>
      )}
      
      {/* Scheduled Badge */}
      {freight.status === 'scheduled' && (
        <div className={`absolute -top-2 ${isSponsored ? 'left-28' : 'left-4'}`}>
          <Badge className="bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs px-2 py-0.5">
            📅 Agendado{freight.pickupDate ? ` ${new Date(freight.pickupDate + 'T00:00:00').toLocaleDateString('pt-BR')}` : ''}
          </Badge>
        </div>
      )}
      
      <div className="flex items-center gap-4">
        {/* Logo da Empresa */}
        <div className="flex-shrink-0">
          {companyLogoUrl ? (
            <ImageWithFallback
              src={companyLogoUrl}
              alt={freight.customerName || 'Empresa'}
              className="w-16 h-16 rounded-lg object-cover bg-gray-100"
            />
          ) : (
            <div 
              className="w-16 h-16 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center"
            >
              <span className="text-white font-bold text-xl">
                {(freight.customerName || 'E').charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>
        
        {/* Informações do Frete */}
        <div className="flex-1 min-w-0">
          {/* Rota */}
          <div className="space-y-1 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary"></div>
              <span className={`font-medium text-sm ${isValidLocation(freight.origin) ? 'text-foreground' : 'text-muted-foreground'}`}>
                {formatLocation(freight.origin, 'Origem, UF')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full border-2 border-primary"></div>
              <span className={`font-medium text-sm ${isValidLocation(freight.destination) ? 'text-foreground' : 'text-muted-foreground'}`}>
                {formatLocation(freight.destination, 'Destino, UF')}
              </span>
            </div>
          </div>
          
          {/* Tempo de publicação + Detalhes do Frete */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            <span className="font-medium">Há {timeAgo}</span>
            {cargoType && (
              <>
                <span>•</span>
                <span className="truncate max-w-[150px]">{cargoType}</span>
              </>
            )}
            {freight.truckType && freight.truckType !== 'Não especificado' && (
              <>
                <span>•</span>
                <span>{freight.truckType}</span>
              </>
            )}
          </div>
        </div>
        
        {/* Valor e Detalhes de Pagamento */}
        <div className="flex-shrink-0 text-right">
          <div className="text-2xl font-bold text-foreground mb-1">
            {freight.price === 'A combinar' ? (
              <span className="text-base text-muted-foreground">A combinar</span>
            ) : (() => {
              const value = String(freight.price);
              const cleanValue = value.replace(/R\$\s?/g, '').trim();
              const numericValue = cleanValue.replace(/\./g, '').replace(',', '.');
              const numValue = parseFloat(numericValue);
              return !isNaN(numValue) ? numValue.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              }) : freight.price;
            })()}
          </div>
          <div className="space-y-0.5 text-xs text-muted-foreground">
            {freight.valueCalculation && (
              <div>{freight.valueCalculation}</div>
            )}
            {freight.paymentIncluded && (
              <div>
                {freight.paymentIncluded === 'included' ? 'Pedágio incluso' : 'Pedágio pago à parte'}
              </div>
            )}
            {freight.paymentMethod && (
              <div>{freight.paymentMethod}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}