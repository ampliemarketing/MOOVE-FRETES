/**
 * Collaborator Notifications
 * Sistema de notificações in-app específico para colaboradores
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell,
  Check,
  X,
  Mail,
  Shield,
  UserPlus,
  UserX,
  Settings,
  AlertCircle,
  Info,
  CheckCircle,
  Clock,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { toast } from 'sonner@2.0.3';
import type { User } from './contexts/AppContext';
import { LoadingSpinner } from './LoadingSpinner';

export interface CollaboratorNotification {
  id: string;
  type: 'invite' | 'role_changed' | 'deactivated' | 'reactivated' | 'permission_changed' | 'company_update' | 'system';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  priority: 'low' | 'medium' | 'high';
  metadata?: Record<string, any>;
  actionUrl?: string;
  actionLabel?: string;
}

interface CollaboratorNotificationsProps {
  user: User;
  onClose?: () => void;
}

export function CollaboratorNotifications({ user, onClose }: CollaboratorNotificationsProps) {
  const [notifications, setNotifications] = useState<CollaboratorNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    loadNotifications();
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [user.id]);

  const loadNotifications = async () => {
    try {
      // Buscar notificações do localStorage por enquanto
      const stored = localStorage.getItem(`collaborator_notifications_${user.id}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        setNotifications(parsed);
      } else {
        // Criar algumas notificações de exemplo para demonstração
        const demoNotifications = createDemoNotifications(user);
        setNotifications(demoNotifications);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      );
      // Save to localStorage
      localStorage.setItem(
        `collaborator_notifications_${user.id}`,
        JSON.stringify(updated)
      );
      return updated;
    });
  };

  const markAllAsRead = () => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      localStorage.setItem(
        `collaborator_notifications_${user.id}`,
        JSON.stringify(updated)
      );
      return updated;
    });
    toast.success('Todas as notificações marcadas como lidas');
  };

  const deleteNotification = (notificationId: string) => {
    setNotifications(prev => {
      const updated = prev.filter(n => n.id !== notificationId);
      localStorage.setItem(
        `collaborator_notifications_${user.id}`,
        JSON.stringify(updated)
      );
      return updated;
    });
  };

  const getNotificationIcon = (type: CollaboratorNotification['type']) => {
    const icons = {
      invite: <UserPlus className="w-5 h-5 text-blue-600" />,
      role_changed: <Shield className="w-5 h-5 text-purple-600" />,
      deactivated: <UserX className="w-5 h-5 text-red-600" />,
      reactivated: <CheckCircle className="w-5 h-5 text-green-600" />,
      permission_changed: <Settings className="w-5 h-5 text-yellow-600" />,
      company_update: <Info className="w-5 h-5 text-blue-600" />,
      system: <Bell className="w-5 h-5 text-gray-600" />
    };
    return icons[type] || icons.system;
  };

  const getPriorityBadge = (priority: CollaboratorNotification['priority']) => {
    const variants = {
      low: 'bg-gray-100 text-gray-700',
      medium: 'bg-yellow-100 text-yellow-700',
      high: 'bg-red-100 text-red-700'
    };
    const labels = {
      low: 'Baixa',
      medium: 'Média',
      high: 'Alta'
    };
    return (
      <Badge className={variants[priority]}>
        {labels[priority]}
      </Badge>
    );
  };

  const filteredNotifications = notifications.filter(n => 
    filter === 'all' ? true : !n.read
  );

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="p-6 border-b bg-card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Notificações</h2>
              <p className="text-sm text-muted-foreground">
                {unreadCount > 0 ? `${unreadCount} não lida${unreadCount > 1 ? 's' : ''}` : 'Tudo em dia'}
              </p>
            </div>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            Todas ({notifications.length})
          </Button>
          <Button
            variant={filter === 'unread' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('unread')}
          >
            Não lidas ({unreadCount})
          </Button>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="ml-auto gap-2"
            >
              <Check className="w-4 h-4" />
              Marcar todas como lidas
            </Button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-3">
          {loading ? (
            <LoadingSpinner message="Carregando notificações..." />
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                {filter === 'unread' 
                  ? 'Nenhuma notificação não lida' 
                  : 'Nenhuma notificação'}
              </p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {filteredNotifications.map((notification, index) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card 
                    className={`shadow-card hover:shadow-card-hover transition-all cursor-pointer ${
                      !notification.read ? 'border-l-4 border-l-primary' : ''
                    }`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-surface-100 flex items-center justify-center">
                          {getNotificationIcon(notification.type)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium">{notification.title}</h3>
                            {!notification.read && (
                              <div className="w-2 h-2 rounded-full bg-primary" />
                            )}
                          </div>

                          <p className="text-sm text-muted-foreground mb-2">
                            {notification.message}
                          </p>

                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTimestamp(notification.timestamp)}
                            </span>
                            {getPriorityBadge(notification.priority)}
                          </div>

                          {notification.actionUrl && notification.actionLabel && (
                            <Button
                              variant="link"
                              size="sm"
                              className="mt-2 p-0 h-auto gap-1"
                            >
                              {notification.actionLabel}
                              <ChevronRight className="w-3 h-3" />
                            </Button>
                          )}
                        </div>

                        <div className="flex gap-1">
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification.id);
                              }}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// Helper para criar notificações de demonstração
function createDemoNotifications(user: User): CollaboratorNotification[] {
  const now = new Date();
  return [
    {
      id: 'notif_1',
      type: 'invite',
      title: 'Bem-vindo ao MooveFretes!',
      message: 'Sua conta de colaborador foi criada com sucesso. Complete seu perfil para começar.',
      timestamp: new Date(now.getTime() - 1000 * 60 * 5).toISOString(), // 5 min atrás
      read: false,
      priority: 'high',
      actionUrl: '/profile',
      actionLabel: 'Completar perfil'
    },
    {
      id: 'notif_2',
      type: 'permission_changed',
      title: 'Suas permissões foram atualizadas',
      message: 'O administrador atualizou as permissões do seu cargo. Verifique suas novas permissões.',
      timestamp: new Date(now.getTime() - 1000 * 60 * 60).toISOString(), // 1 hora atrás
      read: false,
      priority: 'medium',
      actionUrl: '/settings/permissions',
      actionLabel: 'Ver permissões'
    },
    {
      id: 'notif_3',
      type: 'system',
      title: 'Manutenção programada',
      message: 'O sistema passará por manutenção no dia 15/11 das 02:00 às 04:00.',
      timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 24).toISOString(), // 1 dia atrás
      read: true,
      priority: 'low'
    }
  ];
}

// Helper para formatar timestamp
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / 1000 / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return 'Agora';
  if (minutes < 60) return `${minutes} min atrás`;
  if (hours < 24) return `${hours}h atrás`;
  if (days < 7) return `${days}d atrás`;
  
  return date.toLocaleDateString('pt-BR');
}

// Helper para adicionar notificação (usar em outros componentes)
export function addCollaboratorNotification(data: {
  type: 'invite' | 'role_changed' | 'deactivated' | 'reactivated' | 'permission_changed' | 'company_update' | 'system';
  collaboratorName: string;
  collaboratorEmail: string;
  roleName?: string;
  invitedByName?: string;
  oldRole?: string;
  newRole?: string;
}) {
  // Simplificar: criar notificação apenas com toast
  let title = '';
  let message = '';
  
  switch (data.type) {
    case 'invite':
      title = 'Novo Colaborador Convidado';
      message = `${data.collaboratorName} foi convidado para ${data.roleName}`;
      break;
    case 'role_changed':
      title = 'Cargo Alterado';
      message = `Cargo de ${data.collaboratorName} alterado de ${data.oldRole} para ${data.newRole}`;
      break;
    case 'deactivated':
      title = 'Colaborador Desativado';
      message = `${data.collaboratorName} foi desativado`;
      break;
    default:
      title = 'Atualização';
      message = `Alteração realizada para ${data.collaboratorName}`;
  }
  
  toast.info(title, {
    description: message
  });
}