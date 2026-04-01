import React from 'react';
import { Card, CardContent } from './card';
import { motion } from 'motion/react';
import { LucideIcon } from 'lucide-react';

interface EnhancedStatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: LucideIcon;
  iconColor?: string;
  trend?: 'up' | 'down' | 'stable';
  loading?: boolean;
}

export function EnhancedStatCard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon: Icon,
  iconColor = 'bg-primary',
  trend,
  loading = false,
}: EnhancedStatCardProps) {
  const changeColorClass = {
    positive: 'text-green-600',
    negative: 'text-red-600',
    neutral: 'text-gray-600',
  }[changeType];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -2 }}
    >
      <Card className="border-0 shadow-card hover:shadow-card-hover transition-all duration-200">
        <CardContent className="p-6">
          {loading ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/3"></div>
            </div>
          ) : (
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground font-medium mb-1">{title}</p>
                <h3 className="text-3xl font-semibold text-foreground mb-1">{value}</h3>
                {change && (
                  <p className={`text-sm font-medium ${changeColorClass} flex items-center gap-1`}>
                    {trend === 'up' && '↑'}
                    {trend === 'down' && '↓'}
                    {trend === 'stable' && '→'}
                    {change}
                  </p>
                )}
              </div>
              {Icon && (
                <div className={`p-3 rounded-xl ${iconColor} bg-opacity-10 flex-shrink-0`}>
                  <Icon className={`w-6 h-6 ${iconColor.replace('bg-', 'text-')}`} />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface EnhancedActionCardProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  onClick?: () => void;
  variant?: 'default' | 'primary' | 'secondary';
  disabled?: boolean;
}

export function EnhancedActionCard({
  title,
  description,
  icon: Icon,
  onClick,
  variant = 'default',
  disabled = false,
}: EnhancedActionCardProps) {
  const variantClasses = {
    default: 'hover:border-primary hover:bg-primary/5',
    primary: 'bg-primary text-white hover:bg-primary/90',
    secondary: 'bg-secondary hover:bg-secondary/80',
  }[variant];

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses}`}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
    >
      <Card className={`border shadow-card h-full ${variantClasses}`}>
        <CardContent className="p-6 flex items-center gap-4">
          <div className={`p-3 rounded-xl ${variant === 'primary' ? 'bg-white/20' : 'bg-primary/10'}`}>
            <Icon className={`w-6 h-6 ${variant === 'primary' ? 'text-white' : 'text-primary'}`} />
          </div>
          <div className="flex-1">
            <h4 className={`font-semibold mb-1 ${variant === 'primary' ? 'text-white' : 'text-foreground'}`}>
              {title}
            </h4>
            {description && (
              <p className={`text-sm ${variant === 'primary' ? 'text-white/80' : 'text-muted-foreground'}`}>
                {description}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.button>
  );
}

interface EnhancedActivityCardProps {
  action: string;
  time: string;
  status?: 'new' | 'success' | 'warning' | 'info';
  icon?: LucideIcon;
}

export function EnhancedActivityCard({
  action,
  time,
  status = 'info',
  icon: Icon,
}: EnhancedActivityCardProps) {
  const statusColors = {
    new: 'bg-blue-50 text-blue-700 border-blue-200',
    success: 'bg-green-50 text-green-700 border-green-200',
    warning: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    info: 'bg-gray-50 text-gray-700 border-gray-200',
  };

  const statusBadgeColors = {
    new: 'bg-blue-100 text-blue-700',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    info: 'bg-gray-100 text-gray-700',
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${statusColors[status]}`}
    >
      <div className="flex items-center gap-3">
        {Icon && (
          <div className={`p-2 rounded-lg ${statusBadgeColors[status]}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
        <div>
          <p className="text-sm font-medium">{action}</p>
          <p className="text-xs opacity-75 mt-1">{time}</p>
        </div>
      </div>
      <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusBadgeColors[status]}`}>
        {status === 'new' && 'Novo'}
        {status === 'success' && 'Concluído'}
        {status === 'warning' && 'Atenção'}
        {status === 'info' && 'Info'}
      </span>
    </motion.div>
  );
}
