/**
 * Componente de barra de ferramentas padronizada
 * Usado em: FreightManagement, DriversScreen, MyPreferredRoutes, AvailableDriversTab
 */

import React from 'react';
import { Search, RefreshCw, Sliders, Plus, Filter } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface StatusCount {
  label: string;
  count: number;
  variant?: 'active' | 'contracted' | 'inactive' | 'available' | 'busy' | 'offline' | 'expired';
  onClick?: () => void;
  isActive?: boolean;
}

interface ToolbarHeaderProps {
  // Busca
  searchPlaceholder: string;
  searchValue: string;
  onSearchChange: (value: string) => void;

  // Botão de ação principal (opcional)
  primaryAction?: {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    tooltip?: string;
    variant?: 'default' | 'outline';
    className?: string;
  };

  // Filtros
  onFilterClick: () => void;
  activeFiltersCount?: number;
  showFilterButton?: boolean; // Controla se o botão de filtros deve aparecer

  // Atualizar
  onRefresh: () => void;
  isRefreshing?: boolean;

  // Contador principal
  totalCount: number;
  countLabel: string; // Ex: "frete", "motorista", "rota"

  // Badges de status (opcional)
  statusBadges?: StatusCount[];

  // Filtros ativos (opcional)
  showActiveFiltersIndicator?: boolean;
}

export function ToolbarHeader({
  searchPlaceholder,
  searchValue,
  onSearchChange,
  primaryAction,
  onFilterClick,
  activeFiltersCount = 0,
  showFilterButton = true, // Por padrão, mostra o botão
  onRefresh,
  isRefreshing = false,
  totalCount,
  countLabel,
  statusBadges,
  showActiveFiltersIndicator = true,
}: ToolbarHeaderProps) {
  return (
    <div className="bg-white border-b border-gray-200">
      <div className="px-6 py-4">
        <div className="space-y-4">
          {/* Linha 1: Campo de busca e ações */}
          <div className="flex items-center gap-3">
            {/* Campo de busca */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 h-10"
              />
            </div>

            {/* Botão de ação principal */}
            {primaryAction && (
              primaryAction.tooltip ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={primaryAction.onClick}
                        variant={primaryAction.variant || 'default'}
                        className={primaryAction.className || 'h-10 shrink-0'}
                      >
                        {primaryAction.icon}
                        {primaryAction.label && <span className="ml-2">{primaryAction.label}</span>}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{primaryAction.tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <Button
                  onClick={primaryAction.onClick}
                  variant={primaryAction.variant || 'default'}
                  className={primaryAction.className || 'h-10 shrink-0'}
                >
                  {primaryAction.icon}
                  {primaryAction.label && <span className="ml-2">{primaryAction.label}</span>}
                </Button>
              )
            )}

            {/* Botão de filtros */}
            {showFilterButton && (
              <Button 
                variant="outline" 
                size="icon"
                onClick={onFilterClick}
                className="relative h-10 w-10 shrink-0"
              >
                <Sliders className="w-4 h-4" />
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-medium">
                    {activeFiltersCount}
                  </span>
                )}
              </Button>
            )}

            {/* Botão de atualizar */}
            <Button 
              variant="outline" 
              size="icon"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="h-10 w-10 shrink-0"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Linha 2: Contador e badges de status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Contador principal */}
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-sm">
                  <span className="font-semibold text-foreground">{totalCount}</span>
                  <span className="text-muted-foreground">
                    {' '}{countLabel}{totalCount !== 1 ? 's' : ''} disponíve{totalCount !== 1 ? 'is' : 'l'}
                  </span>
                </span>
              </div>
              
              {/* Indicador de filtros ativos */}
              {showActiveFiltersIndicator && activeFiltersCount > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20">
                  <Filter className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-medium text-primary">
                    {activeFiltersCount} filtro{activeFiltersCount > 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}