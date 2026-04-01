import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet';
import { 
  ArrowLeft, 
  Bell, 
  CheckCircle, 
  X, 
  MessageCircle, 
  Package, 
  Star, 
  AlertCircle,
  Info,
  Settings,
  Trash2,
  Mail,
  Filter,
  RefreshCw
} from 'lucide-react';
import { useApp, type Notification } from './contexts/AppContext';
import { EmptyState, Alert } from './ui/enhanced-components';
import type { User } from './contexts/AppContext';
import { toast } from 'sonner@2.0.3';

interface NotificationScreenProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: User;
}

type FilterType = 'all' | 'unread' | 'quote' | 'freight' | 'social' | 'system';

export function NotificationScreen({ open, onOpenChange, user }: NotificationScreenProps) {
  const { state, actions } = useApp();
  const [filter, setFilter] = useState<FilterType>('all');
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localNotifications, setLocalNotifications] = useState<Notification[]>([]);
  
  // ✅ Sincronizar notificações do AppContext com estado local
  useEffect(() => {
    console.log('🔄 [NotificationScreen] Notificações do AppContext mudaram:', state.notifications?.length);
    setLocalNotifications(state.notifications || []);
  }, [state.notifications]);
  
  // ✅ Usar notificações do estado local (sincronizadas automaticamente)
  const notifications = localNotifications;
  const unreadCount = notifications.filter(n => !n.read).length;
  
  // Função para recarregar notificações do Supabase
  const refresh = async () => {
    setLoading(true);
    try {
      const { database } = await import('../utils/database');
      if (state.user) {
        const resolvedId = state.user.collaborator?.companyId || state.user.id;
        const response = await database.notifications.getByUser(resolvedId);
        if (response.success && response.data) {
          actions.dispatch?.({ 
            type: 'SET_NOTIFICATIONS', 
            payload: response.data.map(n => ({
              id: n.id,
              type: n.type as any,
              title: n.title,
              message: n.message,
              timestamp: n.createdAt,
              read: n.is_read || false,
              data: n.metadata
            }))
          });
        }
      }
    } catch (error) {
      console.error('Erro ao recarregar notificações:', error);
      toast.error('Erro ao recarregar notificações');
    } finally {
      setLoading(false);
    }
  };
  
  // Marcar como lida
  const markAsRead = async (notificationId: string) => {
    try {
      const { database } = await import('../utils/database');
      const result = await database.notifications.markAsRead(notificationId);
      if (result.success) {
        actions.markNotificationRead(notificationId);
        return { success: true };
      }
      return { success: false };
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
      return { success: false };
    }
  };
  
  // Marcar todas como lidas
  const markAllAsRead = async () => {
    try {
      const { database } = await import('../utils/database');
      if (!state.user) return { success: false };
      
      // Marcar todas as notificações não lidas
      const unreadNotifications = notifications.filter(n => !n.read);
      await Promise.all(
        unreadNotifications.map(n => database.notifications.markAsRead(n.id))
      );
      
      // Recarregar notificações
      await refresh();
      return { success: true };
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
      return { success: false };
    }
  };
  
  // Notifications already in correct format from AppContext

  const getNotificationIcon = (type: string) => {
    const iconMap = {
      quote: <Package className="w-5 h-5" />,
      freight: <Package className="w-5 h-5" />,
      social: <Star className="w-5 h-5" />,
      system: <Settings className="w-5 h-5" />,
      info: <Info className="w-5 h-5" />,
      success: <CheckCircle className="w-5 h-5" />,
      warning: <AlertCircle className="w-5 h-5" />,
      error: <AlertCircle className="w-5 h-5" />
    };
    return iconMap[type as keyof typeof iconMap] || <Bell className="w-5 h-5" />;
  };

  const getNotificationColor = (type: string) => {
    const colorMap = {
      quote: 'text-blue-600 bg-blue-100',
      freight: 'text-green-600 bg-green-100',
      social: 'text-purple-600 bg-purple-100',
      system: 'text-gray-600 bg-gray-100',
      info: 'text-blue-600 bg-blue-100',
      success: 'text-green-600 bg-green-100',
      warning: 'text-yellow-600 bg-yellow-100',
      error: 'text-red-600 bg-red-100'
    };
    return colorMap[type as keyof typeof colorMap] || 'text-gray-600 bg-gray-100';
  };

  const filterOptions = [
    { label: 'Todas', value: 'all' as FilterType, count: notifications.length },
    { label: 'Não Lidas', value: 'unread' as FilterType, count: notifications.filter(n => !n.read).length },
    { label: 'Cotações', value: 'quote' as FilterType, count: notifications.filter(n => n.type === 'quote').length },
    { label: 'Fretes', value: 'freight' as FilterType, count: notifications.filter(n => n.type === 'freight').length },
    { label: 'Social', value: 'social' as FilterType, count: notifications.filter(n => n.type === 'social').length }
  ];

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !notification.read;
    return notification.type === filter;
  });

  const handleNotificationAction = async (notification: Notification, actionType: string) => {
    switch (actionType) {
      case 'view_quote':
        // Navigate to quote screen
        actions.addActivity({
          type: 'quote_received',
          title: 'Cotação Visualizada',
          description: notification.title,
          status: 'info'
        });
        break;
      case 'reject_quote':
        actions.addActivity({
          type: 'quote_received',
          title: 'Cotação Rejeitada',
          description: notification.title,
          status: 'warning'
        });
        break;
      default:
        console.log('Unknown action:', actionType);
    }
    
    if (!notification.read) {
      const result = await markAsRead(notification.id);
      if (result?.success) {
        actions.markNotificationRead(notification.id);
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    const result = await markAllAsRead();
    if (result?.success) {
      toast.success('Todas as notificações foram marcadas como lidas');
      await refresh();
    } else {
      toast.error('Erro ao marcar notificações como lidas');
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes}min atrás`;
    } else if (diffHours < 24) {
      return `${diffHours}h atrás`;
    } else if (diffDays === 1) {
      return 'Ontem';
    } else if (diffDays < 7) {
      return `${diffDays}d atrás`;
    } else {
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full max-w-2xl overflow-y-auto p-0">
        <SheetTitle className="sr-only">
          Notificações
        </SheetTitle>
        <SheetDescription className="sr-only">
          Central de notificações do sistema. Visualize e gerencie todas as suas notificações.
        </SheetDescription>
        
        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="sticky top-0 bg-white border-b border-gray-200 p-4 z-10"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div>
                <h1 className="text-xl font-semibold">Notificações</h1>
                <p className="text-sm text-muted-foreground">
                  {notifications.filter(n => !n.read).length} não lidas
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={refresh}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              {filteredNotifications.some(n => !n.read) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                >
                  Marcar Todas
                </Button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Filters */}
        <div className="px-4 pb-4">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {filterOptions.map((option) => (
              <motion.button
                key={option.value}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setFilter(option.value)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors whitespace-nowrap ${
                  filter === option.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                <span>{option.label}</span>
                {option.count > 0 && (
                  <Badge variant="secondary" className="text-xs h-5">
                    {option.count}
                  </Badge>
                )}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Notifications List */}
        <div className="px-4 space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredNotifications.length > 0 ? (
              filteredNotifications.map((notification, index) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: index * 0.05 }}
                  layout
                >
                  <Card className={`cursor-pointer transition-all hover:shadow-md ${
                    !notification.read ? 'border-primary/50 bg-primary/5' : ''
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          getNotificationColor(notification.type)
                        }`}>
                          {getNotificationIcon(notification.type)}
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h3 className="font-medium text-sm">{notification.title}</h3>
                              <p className="text-sm text-muted-foreground mt-1">
                                {notification.message}
                              </p>
                            </div>
                            
                            {/* Unread indicator */}
                            {!notification.read && (
                              <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-2 ml-2" />
                            )}
                          </div>
                          
                          {/* Actions */}
                          {notification.actions && notification.actions.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                              {notification.actions.map((action, actionIndex) => (
                                <Button
                                  key={actionIndex}
                                  size="sm"
                                  variant={action.primary ? 'default' : 'outline'}
                                  onClick={() => handleNotificationAction(notification, action.action)}
                                  className={action.primary ? 'bg-primary hover:bg-primary/90' : ''}
                                >
                                  {action.label}
                                </Button>
                              ))}
                            </div>
                          )}
                          
                          {/* Footer */}
                          <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
                            <span className="text-xs text-muted-foreground">
                              {formatTime(notification.timestamp)}
                            </span>
                            
                            <div className="flex items-center gap-1">
                              {!notification.read ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    actions.markNotificationRead(notification.id);
                                  }}
                                  className="h-8 px-2 text-xs"
                                >
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Marcar como lida
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Mark as unread functionality
                                    console.log('Mark as unread');
                                  }}
                                  className="h-8 px-2 text-xs"
                                >
                                  <Mail className="w-3 h-3 mr-1" />
                                  Não lida
                                </Button>
                              )}
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  actions.addActivity({
                                    type: 'social_interaction',
                                    title: 'Notificação Removida',
                                    description: notification.title,
                                    status: 'info'
                                  });
                                }}
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <EmptyState
                  icon={<Bell className="w-12 h-12" />}
                  title="Nenhuma notificação"
                  description={
                    filter === 'all' 
                      ? 'Você está em dia! Nenhuma notificação no momento.'
                      : `Nenhuma notificação encontrada para o filtro "${filterOptions.find(f => f.value === filter)?.label}".`
                  }
                  action={
                    filter !== 'all' 
                      ? {
                          label: 'Ver Todas',
                          onClick: () => setFilter('all'),
                          variant: 'outline'
                        }
                      : undefined
                  }
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </SheetContent>
    </Sheet>
  );
}