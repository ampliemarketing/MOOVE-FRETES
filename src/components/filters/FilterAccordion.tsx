import React from 'react';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '../ui/accordion';

/**
 * Wrapper padrão para os painéis de filtro (fretes, transportadoras, motoristas,
 * rotas). Cada seção vira um item recolhível: só o título + setinha aparecem e o
 * conteúdo abre ao clicar. Várias seções podem ficar abertas ao mesmo tempo.
 */
interface FilterAccordionProps {
  children: React.ReactNode;
  /** `value`s das seções que começam abertas. */
  defaultOpen?: string[];
  className?: string;
}

export function FilterAccordion({ children, defaultOpen = [], className = '' }: FilterAccordionProps) {
  return (
    <Accordion type="multiple" defaultValue={defaultOpen} className={`w-full ${className}`}>
      {children}
    </Accordion>
  );
}

interface FilterSectionProps {
  /** Identificador único da seção dentro do accordion. */
  value: string;
  title: string;
  /** Elemento opcional à direita do título (ex.: contador de filtros ativos). */
  badge?: React.ReactNode;
  children: React.ReactNode;
}

export function FilterSection({ value, title, badge, children }: FilterSectionProps) {
  return (
    <AccordionItem value={value}>
      <AccordionTrigger className="text-base font-semibold hover:no-underline">
        <span className="flex items-center gap-2">
          {title}
          {badge}
        </span>
      </AccordionTrigger>
      <AccordionContent className="pt-1 pb-4">
        {children}
      </AccordionContent>
    </AccordionItem>
  );
}

/** Bolinha com a contagem de filtros ativos, exibida ao lado do título. */
export function FilterCountBadge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
      {count}
    </span>
  );
}
