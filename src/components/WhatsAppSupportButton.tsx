import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, X, Headphones } from 'lucide-react';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface WhatsAppSupportButtonProps {
  phoneNumber?: string;
  message?: string;
}

export function WhatsAppSupportButton({ 
  phoneNumber = '556493226356',
  message = 'Olá! Preciso de ajuda com o MooveFretes.'
}: WhatsAppSupportButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <TooltipProvider>
      <motion.div
        className="fixed bottom-20 right-4 z-50 md:bottom-6 md:right-6"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1, type: 'spring', stiffness: 200, damping: 20 }}
      >
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, x: 20, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.8 }}
              className="absolute bottom-16 right-0 bg-card border border-border rounded-2xl shadow-lg p-4 w-64 mb-2"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                    <Headphones className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-medium text-sm">Suporte MaisFrete</h3>
                    <p className="text-xs text-muted-foreground">Online agora</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(false)}
                  className="h-6 w-6 p-0 hover:bg-muted"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <p className="text-sm text-muted-foreground mb-4">
                Precisa de ajuda? Fale conosco pelo WhatsApp!
              </p>
              
              <Button
                onClick={handleClick}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Iniciar Conversa
              </Button>
              
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground text-center">
                  Tempo médio de resposta: <span className="font-medium text-foreground">5 min</span>
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              onClick={() => setIsExpanded(!isExpanded)}
              onHoverStart={() => setIsHovered(true)}
              onHoverEnd={() => setIsHovered(false)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="relative w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full shadow-lg flex items-center justify-center cursor-pointer hover:shadow-xl transition-shadow"
            >
              {/* Pulse animation */}
              <motion.div
                className="absolute inset-0 rounded-full bg-green-500"
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.7, 0, 0.7],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
              
              {/* Icon */}
              <motion.div
                animate={isHovered ? { rotate: [0, -10, 10, -10, 0] } : {}}
                transition={{ duration: 0.5 }}
              >
                <MessageCircle className="w-7 h-7 md:w-8 md:h-8 text-white relative z-10" />
              </motion.div>

              {/* Notification badge */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-background flex items-center justify-center"
              >
                <span className="text-xs text-white font-medium">!</span>
              </motion.div>
            </motion.button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Falar com o Suporte</p>
          </TooltipContent>
        </Tooltip>
      </motion.div>
    </TooltipProvider>
  );
}