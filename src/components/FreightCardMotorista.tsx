import React, { useMemo } from 'react';
import { MessageCircle } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { getAvatarUrl } from '../utils/storage-helper';
import { formatLocation, isValidLocation } from '../utils/location-helpers';
import { generateDeepLinkUrl } from '../utils/deep-link';

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
  price: string;
  createdAt: string;
  customerId: string;
  customerName?: string;
  companyLogo?: string;
  valueCalculation?: string;
  paymentIncluded?: 'included' | 'separate';
  paymentMethod?: string;
  publisherPhone?: string; // ✅ ADICIONADO: Telefone da empresa para WhatsApp
  pickupDate?: string; // ✅ ADICIONADO: Data de coleta
  deliveryDate?: string; // ✅ ADICIONADO: Data de entrega
}

interface FreightCardMotoristaProps {
  freight: Freight;
  onClick: () => void;
  currentUser?: { id: string; name: string }; // Opcional para ID do motorista
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

export function FreightCardMotorista({ freight, onClick, currentUser }: FreightCardMotoristaProps) {
  const cargoType = typeof freight.cargo === 'string' ? freight.cargo : freight.cargo.type;
  const timeAgo = getTimeAgo(freight.createdAt);
  
  // ✅ Converter companyLogo PATH → URL dinamicamente
  const companyLogoUrl = useMemo(() => getAvatarUrl(freight.companyLogo), [freight.companyLogo]);
  
  // Formatar valor
  const formatPrice = (price: string): string => {
    if (price === 'A combinar') return 'A combinar';
    
    const value = String(price);
    const cleanValue = value.replace(/R\$\s?/g, '').trim();
    const numericValue = cleanValue.replace(/\./g, '').replace(',', '.');
    const numValue = parseFloat(numericValue);
    
    return !isNaN(numValue) ? numValue.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) : price;
  };
  
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-[14.5px] border border-[#e5e7eb] cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/30"
    >
      <div className="flex flex-col items-start px-[15px] py-[15px] h-full">
        <div className="flex gap-[14px] items-center w-full">
          {/* Logo da Empresa */}
          <div className="shrink-0">
            {companyLogoUrl ? (
              <img
                src={companyLogoUrl}
                alt={freight.customerName || 'Empresa'}
                className="w-[56px] h-[56px] rounded-[10.5px] object-cover bg-[#f3f4f6]"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  if (e.currentTarget.nextElementSibling) {
                    (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                  }
                }}
              />
            ) : null}
            <div 
              className="w-[56px] h-[56px] rounded-[10.5px] bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center"
              style={{ display: companyLogoUrl ? 'none' : 'flex' }}
            >
              <span className="text-white font-bold text-xl">
                {(freight.customerName || 'E').charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
          
          {/* Informações do Frete */}
          <div className="flex-1 min-w-0 flex flex-col gap-[10.5px] h-[63px]">
            {/* Rota */}
            <div className="flex flex-col gap-[7px]">
              <div className="flex items-center gap-[7px]">
                <div className="w-[7px] h-[7px] rounded-full bg-[#253663] shrink-0"></div>
                <span className="text-[12.25px] leading-[17.5px] text-[rgb(0,0,0)] font-bold">
                  {formatLocation(freight.origin, 'Origem, UF')}
                </span>
              </div>
              <div className="flex items-center gap-[7px]">
                <div className="w-[7px] h-[7px] rounded-full border-2 border-[#253663] shrink-0"></div>
                <span className="text-[12.25px] leading-[17.5px] text-[rgb(0,0,0)] font-bold">
                  {formatLocation(freight.destination, 'Destino, UF')}
                </span>
              </div>
            </div>
            
            {/* Detalhes */}
            <div className="flex items-center gap-[10.5px] text-[10.5px] leading-[14px] text-[#6c757d]">
              <span>Há {timeAgo}</span>
              {cargoType && (
                <>
                  <span>•</span>
                  <span className="truncate max-w-[120px]">{cargoType}</span>
                </>
              )}
              {freight.truckType && freight.truckType !== 'Não especificado' && (
                <>
                  <span>•</span>
                  <span className="truncate max-w-[100px]">{freight.truckType}</span>
                </>
              )}
            </div>
          </div>
          
          {/* Valor */}
          <div className="shrink-0 flex flex-col items-end gap-1 justify-center min-w-[115px]">
            <div className="text-right">
              {freight.price === 'A combinar' ? (
                <p className="text-[18px] leading-[20px] text-[rgb(26,32,44)] font-bold">
                  A combinar
                </p>
              ) : (
                <p className="text-[18px] leading-[24px] font-bold text-[#1a202c] whitespace-nowrap">
                  {formatPrice(freight.price)}
                </p>
              )}
            </div>
            
            {/* Botão WhatsApp - Compacto */}
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                
                // Gerar saudação baseada na hora do dia
                const hour = new Date().getHours();
                let greeting = 'Bom dia';
                if (hour >= 12 && hour < 18) {
                  greeting = 'Boa tarde';
                } else if (hour >= 18) {
                  greeting = 'Boa noite';
                }
                
                const today = new Date().toLocaleDateString('pt-BR', { 
                  day: '2-digit', 
                  month: '2-digit', 
                  year: 'numeric' 
                });
                
                // Criar mensagem do WhatsApp com informações do frete
                const cargoText = typeof freight.cargo === 'string' ? freight.cargo : freight.cargo.type;
                const freightCode = freight.freight_code || `#${freight.id.substring(0, 7).toUpperCase()}`;
                const driverName = currentUser?.name || 'Motorista';
                const driverId = currentUser?.id || '';
                
                const message = `*Olá, sou ${driverName} e tenho interesse no frete ${freightCode}.*

📦 *Frete ${freightCode}:*
${freight.origin?.city || 'N/A'} → ${freight.destination?.city || 'N/A'}
Carga: ${cargoText}

🔗 *Link do frete:*
${generateDeepLinkUrl('freight', freight.id)}

🚛 *Meu perfil:*
${generateDeepLinkUrl('profile', driverId)}

*A carga ainda está disponível?*`;
                
                // Formatar telefone (remover caracteres especiais)
                const phone = freight.publisherPhone?.replace(/\D/g, '') || '';
                
                // Abrir WhatsApp (Web ou App)
                if (phone) {
                  const whatsappUrl = `https://api.whatsapp.com/send?phone=55${phone}&text=${encodeURIComponent(message)}`;
                  window.open(whatsappUrl, '_blank');
                } else {
                  toast.error('Telefone de contato não disponível para este frete.');
                }
              }}
              className="flex items-center gap-1.5 h-7 px-2.5 text-xs bg-green-50 border-green-200 text-green-700 hover:bg-green-100 hover:border-green-300 hover:text-green-800 transition-all duration-200"
            >
              <FaWhatsapp className="w-3.5 h-3.5" />
              <span>Enviar Mensagem</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}