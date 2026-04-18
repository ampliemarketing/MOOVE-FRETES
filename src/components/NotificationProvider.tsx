import React, { useEffect } from 'react';
import { useNotifications } from '../utils/hooks/useNotifications';
import { setNotificationHandler } from '../utils/notifications-integration';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Bell, BellOff, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface NotificationProviderProps {
  children: React.ReactNode;
  userId?: string;
}

export function NotificationProvider({ children, userId }: NotificationProviderProps) {
  const { notify, permission, requestPermission, isSupported, canNotify } = useNotifications();
  const [showBanner, setShowBanner] = React.useState(false);
  const [hasAsked, setHasAsked] = React.useState(false);

  // Set up global notification handler
  useEffect(() => {
    setNotificationHandler(notify);
  }, [notify]);

  // ✅ Listener para eventos de notificação criadas pelo hook global
  useEffect(() => {
    const handleNotificationCreated = (event: CustomEvent) => {
      
      // Forçar recarregamento das notificações
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('storage'));
      }
      
      // Mostrar notificação do navegador se permitido
      if (canNotify && event.detail) {
        notify({
          title: event.detail.title || 'Nova Notificação',
          body: event.detail.message || '',
          requireInteraction: false,
        });
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('notification-created', handleNotificationCreated as EventListener);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('notification-created', handleNotificationCreated as EventListener);
      }
    };
  }, [notify, canNotify]);

  // Check if we should show permission request banner
  useEffect(() => {
    if (!userId || !isSupported || hasAsked) return;

    // Check if user has already been asked (stored in localStorage)
    const askedBefore = localStorage.getItem('maisfrete_notification_asked');
    if (askedBefore) {
      setHasAsked(true);
      return;
    }

    // Show banner after 5 seconds for better UX
    const timer = setTimeout(() => {
      if (permission === 'default') {
        setShowBanner(true);
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [userId, isSupported, permission, hasAsked]);

  const handleRequestPermission = async () => {
    const result = await requestPermission();
    setHasAsked(true);
    localStorage.setItem('maisfrete_notification_asked', 'true');
    
    if (result === 'granted') {
      setShowBanner(false);
      
      // Send a test notification
      setTimeout(() => {
        notify({
          title: '🎉 Notificações Ativadas!',
          body: 'Você receberá alertas importantes sobre seus fretes e cotações',
          requireInteraction: false,
        });
      }, 500);
    } else {
      setShowBanner(false);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setHasAsked(true);
    localStorage.setItem('maisfrete_notification_asked', 'true');
  };

  return (
    <>
      {children}
      
      {/* Permission Request Banner */}
      <AnimatePresence>
        {showBanner && isSupported && permission === 'default' && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 20 }}
            className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50"
          >
            <Card className="shadow-modal border-primary/20">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bell className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Ativar Notificações</CardTitle>
                      <CardDescription className="text-xs">
                        Receba alertas importantes
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDismiss}
                    className="h-6 w-6 p-0 rounded-full"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pb-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Mantenha-se atualizado sobre cotações, mensagens e fretes em tempo real
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDismiss}
                    className="flex-1"
                  >
                    Agora não
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleRequestPermission}
                    className="flex-1"
                  >
                    <Bell className="w-4 h-4 mr-2" />
                    Ativar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// Status indicator component
export function NotificationStatus() {
  const { permission, isSupported, requestPermission } = useNotifications();

  if (!isSupported) {
    return null;
  }

  if (permission === 'granted') {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Bell className="w-4 h-4 text-green-600" />
        <span>Notificações ativas</span>
      </div>
    );
  }

  if (permission === 'denied') {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <BellOff className="w-4 h-4 text-red-600" />
        <span>Notificações bloqueadas</span>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={requestPermission}
      className="text-sm"
    >
      <Bell className="w-4 h-4 mr-2" />
      Ativar notificações
    </Button>
  );
}