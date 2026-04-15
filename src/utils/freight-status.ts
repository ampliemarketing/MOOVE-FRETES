/**
 * Mapeamentos de status de frete compartilhados entre hook e repositório.
 * Mantidos aqui para evitar duplicação e divergências silenciosas.
 */

/**
 * Converte o status retornado pelo Supabase para o formato usado pelo frontend.
 * Supabase usa snake_case/variações; o frontend usa camelCase/hifens.
 */
export function mapSupabaseStatusToLocal(status: string): string {
  const map: Record<string, string> = {
    open:        'active',
    active:      'active',
    draft:       'draft',
    in_transit:  'in-transit',
    'in-transit': 'in-transit',
    completed:   'completed',
    delivered:   'completed',
    cancelled:   'cancelled',
    contracted:  'contracted',
    inactive:    'inactive',
    scheduled:   'scheduled',
  };
  return map[status] ?? 'active';
}

/**
 * Converte o status do frontend para o formato aceito pelo Supabase.
 */
export function mapLocalStatusToSupabase(status: string): string {
  const map: Record<string, string> = {
    active:               'active',
    draft:                'draft',
    inactive:             'draft',
    scheduled:            'scheduled',
    in_transit:           'in-transit',
    'in-transit':         'in-transit',
    completed:            'completed',
    delivered:            'completed',
    cancelled:            'cancelled',
    expired:              'cancelled',
    pending_confirmation: 'active',
    accepted:             'active',
    quoted:               'active',
    open:                 'active',
  };
  return map[status] ?? 'active';
}
