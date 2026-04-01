import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './button';
import { Card, CardContent } from './card';
import { Badge } from './badge';
import { 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  Info, 
  AlertTriangle,
  X,
  Heart,
  Star,
  Share2,
  Bookmark,
  MoreVertical,
  Clock,
  MapPin,
  User,
  Truck,
  Package,
  Building,
  Zap,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

// Enhanced Loading States
export function LoadingSpinner({ size = 'default', text }: { size?: 'sm' | 'default' | 'lg'; text?: string }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    default: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <Loader2 className={`${sizeClasses[size]} animate-spin text-gray-400 mb-2`} />
      {text && <p className="text-sm text-muted-foreground">{text}</p>}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <Card className="animate-pulse">
      <CardContent className="p-4">
        <div className="flex items-center space-x-4 mb-4">
          <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          <div className="h-4 bg-gray-200 rounded w-4/6"></div>
        </div>
      </CardContent>
    </Card>
  );
}

// Enhanced Alert Component
interface AlertProps {
  type: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  onClose?: () => void;
  className?: string;
}

export function Alert({ type, title, message, action, onClose, className = '' }: AlertProps) {
  const icons = {
    info: Info,
    success: CheckCircle,
    warning: AlertTriangle,
    error: AlertCircle
  };

  const styles = {
    info: 'bg-white shadow-card border border-gray-200 text-gray-700',
    success: 'bg-white shadow-card border border-gray-200 text-gray-700',
    warning: 'bg-white shadow-card border border-gray-200 text-gray-700',
    error: 'bg-white shadow-card border border-gray-200 text-gray-700'
  };

  const Icon = icons[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`rounded-lg p-4 ${styles[type]} ${className}`}
    >
      <div className="flex items-start">
        <Icon className="w-5 h-5 mt-0.5 mr-3 flex-shrink-0" />
        <div className="flex-1">
          {title && <h4 className="font-medium mb-1">{title}</h4>}
          <p className="text-sm">{message}</p>
          {action && (
            <Button
              size="sm"
              variant="outline"
              onClick={action.onClick}
              className="mt-2"
            >
              {action.label}
            </Button>
          )}
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-1 h-auto text-current hover:bg-current/10"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
    </motion.div>
  );
}

// Enhanced Empty State Component
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline';
  };
  className?: string;
}

export function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`text-center py-12 px-4 ${className}`}>
      {icon && (
        <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center bg-muted rounded-full text-muted-foreground">
          {icon}
        </div>
      )}
      <h3 className="font-medium text-lg mb-2">{title}</h3>
      {description && <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">{description}</p>}
      {action && (
        <Button variant={action.variant || 'default'} onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}

// Enhanced Stats Card - Fixed version
interface StatsCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease';
  };
  icon?: React.ReactNode;
  color?: 'blue' | 'yellow' | 'purple' | 'green' | 'orange' | 'red';
  onClick?: () => void;
  className?: string;
}

export function StatsCard({ 
  title, 
  value, 
  icon, 
  color = 'neutral', 
  change, 
  onClick 
}: StatsCardProps) {
  const colorClasses = {
    blue: 'text-primary',
    green: 'text-muted-foreground',
    yellow: 'text-muted-foreground', 
    red: 'text-muted-foreground',
    purple: 'text-muted-foreground',
    neutral: 'text-muted-foreground'
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`${onClick ? 'cursor-pointer' : ''}`}
    >
      <Card className="p-4 bg-white border-light hover:shadow-card-hover transition-all duration-200">
        <div className="flex items-center justify-between space-x-3">
          <div className="flex-1">
            <p className="text-muted-foreground text-sm">{title}</p>
            <p className="text-2xl font-semibold text-foreground">{value}</p>
            {change && (
              <div className="flex items-center space-x-1 mt-1">
                {change.type === 'increase' ? (
                  <TrendingUp className="w-3 h-3 text-muted-foreground" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-muted-foreground" />
                )}
                <span className="text-xs text-muted-foreground">
                  {change.value}%
                </span>
              </div>
            )}
          </div>
          <div className={`${colorClasses[color]} opacity-60`}>
            {icon}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

// Enhanced User Type Badge
export function UserTypeBadge({ userType }: { userType: string }) {
  const configs = {
    caminhoneiro: {
      label: 'Caminhoneiro',
      icon: Truck,
      color: 'bg-gray-100 text-gray-700 border-gray-200'
    },
    transportadora: {
      label: 'Transportadora',
      icon: Building,
      color: 'bg-gray-100 text-gray-700 border-gray-200'
    },
    embarcador: {
      label: 'Embarcador',
      icon: Package,
      color: 'bg-gray-100 text-gray-700 border-gray-200'
    }
  };

  const config = configs[userType as keyof typeof configs] || configs.embarcador;
  const Icon = config.icon;

  return (
    <Badge variant="secondary" className={`${config.color} flex items-center gap-1 font-medium`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  );
}

// Enhanced Activity Item
interface ActivityItemProps {
  title: string;
  description: string;
  timestamp: string;
  status: 'success' | 'info' | 'warning' | 'error';
  icon?: React.ReactNode;
  onClick?: () => void;
}

export function ActivityItem({ title, description, timestamp, status, icon, onClick }: ActivityItemProps) {
  const statusColors = {
    success: 'bg-gray-100',
    info: 'bg-gray-100',
    warning: 'bg-gray-100',
    error: 'bg-gray-100'
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="flex-shrink-0 relative">
        <div className={`w-8 h-8 rounded-full ${statusColors[status]} flex items-center justify-center text-muted-foreground`}>
          {icon || <div className="w-2 h-2 bg-muted-foreground rounded-full" />}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
        <div className="flex items-center gap-1 mt-1">
          <Clock className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{timestamp}</span>
        </div>
      </div>
    </motion.div>
  );
}

// Enhanced Card with Actions
interface ActionCardProps {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  actions?: Array<{
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    active?: boolean;
  }>;
  children?: React.ReactNode;
  priority?: 'high' | 'normal';
  className?: string;
}

export function ActionCard({ title, description, badge, actions, children, priority, className = '' }: ActionCardProps) {
  return (
    <Card className={`transition-all duration-200 hover:shadow-md ${priority === 'high' ? 'ring-2 ring-gray-200' : ''} ${className}`}>
      <CardContent className="p-0">
        {priority === 'high' && (
          <div className="bg-gray-50 border-b border-gray-200 px-4 py-2">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-600">Em Destaque</span>
            </div>
          </div>
        )}
        
        <div className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium">{title}</h3>
                {badge}
              </div>
              {description && <p className="text-sm text-muted-foreground">{description}</p>}
            </div>
            
            {actions && (
              <div className="flex items-center gap-1 ml-3">
                {actions.map((action, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="sm"
                    onClick={action.onClick}
                    className={`h-8 w-8 p-0 ${action.active ? 'text-gray-600 bg-gray-100' : ''}`}
                    title={action.label}
                  >
                    {action.icon}
                  </Button>
                ))}
              </div>
            )}
          </div>
          
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

// Enhanced Quick Actions
interface QuickAction {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color?: 'primary' | 'accent' | 'success' | 'warning';
  disabled?: boolean;
}

export function QuickActions({ actions }: { actions: QuickAction[] }) {
  const colorStyles = {
    primary: 'bg-primary hover:bg-primary/90 text-primary-foreground',
    accent: 'bg-gray-600 hover:bg-gray-700 text-white',
    success: 'bg-gray-500 hover:bg-gray-600 text-white',
    warning: 'bg-gray-500 hover:bg-gray-600 text-white'
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      {actions.map((action, index) => (
        <motion.div key={index} whileTap={{ scale: 0.95 }}>
          <Button
            onClick={action.onClick}
            disabled={action.disabled}
            className={`h-12 w-full flex items-center justify-center gap-2 ${colorStyles[action.color || 'primary']}`}
          >
            {action.icon}
            <span className="font-medium">{action.label}</span>
          </Button>
        </motion.div>
      ))}
    </div>
  );
}

// Enhanced Connection Status
export function ConnectionStatus({ status }: { status: 'online' | 'offline' | 'syncing' }) {
  const configs = {
    online: {
      color: 'bg-gray-400',
      text: 'Online',
      pulse: false
    },
    offline: {
      color: 'bg-gray-400',
      text: 'Offline',
      pulse: false
    },
    syncing: {
      color: 'bg-gray-400',
      text: 'Sincronizando',
      pulse: true
    }
  };

  const config = configs[status];

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <div className={`w-2 h-2 rounded-full ${config.color} ${config.pulse ? 'animate-pulse' : ''}`} />
      <span>{config.text}</span>
    </div>
  );
}