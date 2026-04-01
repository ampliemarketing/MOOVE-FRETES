import React from 'react';
import { CheckCheck, Check, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { motion } from 'motion/react';

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'error';

interface MessageStatusIndicatorProps {
  status: MessageStatus;
  errorMessage?: string;
  timestamp?: string;
  className?: string;
}

export function MessageStatusIndicator({ 
  status, 
  errorMessage,
  timestamp,
  className = '' 
}: MessageStatusIndicatorProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'sending':
        return <Loader2 className="h-3 w-3 animate-spin text-gray-400" />;
      case 'sent':
        return <Check className="h-3 w-3 text-gray-400" />;
      case 'delivered':
        return <CheckCheck className="h-3 w-3 text-gray-400" />;
      case 'read':
        return <CheckCheck className="h-3 w-3 text-[#253663]" />;
      case 'error':
        return <AlertCircle className="h-3 w-3 text-red-500" />;
      default:
        return <Clock className="h-3 w-3 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'sending':
        return 'Enviando...';
      case 'sent':
        return timestamp ? `Enviado às ${new Date(timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Enviado';
      case 'delivered':
        return timestamp ? `Entregue às ${new Date(timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Entregue';
      case 'read':
        return timestamp ? `Lido às ${new Date(timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Lido';
      case 'error':
        return errorMessage || 'Erro ao enviar mensagem';
      default:
        return 'Pendente';
    }
  };

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <motion.div
            className={`inline-flex items-center gap-1 ${className}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            {getStatusIcon()}
          </motion.div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <p>{getStatusText()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default MessageStatusIndicator;
