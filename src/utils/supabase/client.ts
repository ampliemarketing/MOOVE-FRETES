/**
 * Supabase Client Singleton
 * Single instance to avoid multiple GoTrueClient warnings
 */

import { createClient } from '@supabase/supabase-js';
import { supabaseUrl, publicAnonKey } from './info';

// Create a single instance using global storage to persist across hot reloads
const globalForSupabase = globalThis as unknown as {
  supabaseInstance?: ReturnType<typeof createClient>;
  supabaseInstanceCreated?: boolean;
};

/**
 * Storage de sessão ISOLADO POR ABA.
 *
 * Antes a sessão ficava em `localStorage`, que é compartilhado entre todas as
 * abas da mesma origem — então abrir uma segunda aba já entrava logado com a
 * mesma conta, e login/logout numa aba "vazava" para as outras.
 *
 * Agora usamos `sessionStorage`, que é próprio de cada aba:
 *  - aba nova  -> sessionStorage vazio -> começa deslogada (tela de login)
 *  - reload    -> sessionStorage persiste -> continua logado
 *  - fechar aba/navegador -> sessão descartada (precisa logar de novo)
 *  - duas abas -> duas contas diferentes, sem interferência
 *
 * Observação: uma aba DUPLICADA pelo navegador (ou aberta via target=_blank)
 * herda uma cópia do sessionStorage no momento da criação — nesse caso ela
 * abre logada. Uma aba realmente nova (Ctrl+T + URL) não.
 */
const inMemoryFallback = new Map<string, string>();

function safeSession(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return null;
    // toca no objeto para disparar erro em modos de privacidade que bloqueiam
    const probe = '__mf_probe__';
    window.sessionStorage.setItem(probe, '1');
    window.sessionStorage.removeItem(probe);
    return window.sessionStorage;
  } catch {
    return null;
  }
}

// chave-marcador que amarra a aba ao seu storageKey (definida mais abaixo)
const TAB_KEY_MARKER = 'moovefretes-tab-storage-key';

const perTabAuthStorage = {
  getItem: (key: string): string | null => {
    const s = safeSession();
    if (s) {
      try {
        return s.getItem(key);
      } catch {
        /* cai no fallback */
      }
    }
    return inMemoryFallback.has(key) ? inMemoryFallback.get(key)! : null;
  },
  setItem: (key: string, value: string): void => {
    const s = safeSession();
    if (s) {
      try {
        s.setItem(key, value);
        // Auto-cura: se um logout limpou o sessionStorage inteiro, reancora
        // esta aba no mesmo storageKey para que o reload recupere a sessão.
        if (tabStorageKey && !s.getItem(TAB_KEY_MARKER)) {
          s.setItem(TAB_KEY_MARKER, tabStorageKey);
        }
        return;
      } catch {
        /* cai no fallback */
      }
    }
    inMemoryFallback.set(key, value);
  },
  removeItem: (key: string): void => {
    const s = safeSession();
    if (s) {
      try {
        s.removeItem(key);
      } catch {
        /* ignora */
      }
    }
    inMemoryFallback.delete(key);
  },
};

/**
 * storageKey único por aba: além do backend por aba (sessionStorage), garante
 * que o Web Lock de refresh de token do gotrue-js não seja compartilhado entre
 * abas e que o listener de evento `storage` (que só observa essa chave em
 * localStorage) nunca dispare sincronização entre abas.
 *
 * A chave é guardada no próprio sessionStorage, então sobrevive a reload da
 * MESMA aba, mas uma aba nova gera outra chave (e portanto não acha sessão).
 */
let tabStorageKey: string | null = null;

function getTabScopedStorageKey(): string {
  if (tabStorageKey) return tabStorageKey;
  const base = 'moovefretes-auth-token';
  const s = safeSession();
  if (!s) {
    tabStorageKey = base;
    return base;
  }
  try {
    let key = s.getItem(TAB_KEY_MARKER);
    if (!key) {
      const rand =
        (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      key = `${base}-${rand}`;
      s.setItem(TAB_KEY_MARKER, key);
    }
    tabStorageKey = key;
    return key;
  } catch {
    tabStorageKey = base;
    return base;
  }
}

export function getSupabaseClient() {
  if (!globalForSupabase.supabaseInstance) {
    if (!globalForSupabase.supabaseInstanceCreated) {
      globalForSupabase.supabaseInstanceCreated = true;
    }

    globalForSupabase.supabaseInstance = createClient(supabaseUrl, publicAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        // ✅ Sessão isolada por aba — ver comentário em perTabAuthStorage acima.
        storage: typeof window !== 'undefined' ? perTabAuthStorage : undefined,
        storageKey: getTabScopedStorageKey(),
      },
      global: {
        headers: {
          'X-Client-Info': 'moovefretes-web',
        },
      },
      db: {
        schema: 'public',
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }
  return globalForSupabase.supabaseInstance;
}

// Export singleton instance
export const supabase = getSupabaseClient();

// Export URL and key for API calls
export { supabaseUrl, publicAnonKey };

/**
 * Helper function to check if Supabase is accessible
 */
export async function testSupabaseConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from('profiles').select('count').limit(1);
    return !error;
  } catch (error) {
    console.error('❌ Supabase connection test failed:', error);
    return false;
  }
}
