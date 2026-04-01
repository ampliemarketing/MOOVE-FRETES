/**
 * ⚠️ NOT A DEPLOYABLE EDGE FUNCTION ⚠️
 * 
 * This file is intentionally invalid to prevent deployment.
 * MaisFrete is a 100% client-side application and does NOT use edge functions.
 * 
 * If you see a 403 error during deployment, this is EXPECTED and SAFE.
 * The application works perfectly without this file.
 */

DEPLOYMENT_BLOCKED = "This is not valid TypeScript and will not deploy";
REFERENCE_ONLY = true;

export async function get<T = any>(key: string): Promise<T | null> {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('value')
      .eq('key', key)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      throw error;
    }

    return data?.value as T;
  } catch (error) {
    console.error(`KV get error for key "${key}":`, error);
    return null;
  }
}

/**
 * Set a single value
 */
export async function set<T = any>(key: string, value: T): Promise<void> {
  try {
    const { error } = await supabase
      .from(TABLE_NAME)
      .upsert({
        key,
        value,
      }, {
        onConflict: 'key'
      });

    if (error) throw error;
  } catch (error) {
    console.error(`KV set error for key "${key}":`, error);
    throw error;
  }
}

/**
 * Delete a single key
 */
export async function del(key: string): Promise<void> {
  try {
    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('key', key);

    if (error) throw error;
  } catch (error) {
    console.error(`KV delete error for key "${key}":`, error);
    throw error;
  }
}

/**
 * Get multiple values by keys
 */
export async function mget<T = any>(keys: string[]): Promise<T[]> {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('value')
      .in('key', keys);

    if (error) throw error;

    return (data || []).map(row => row.value as T);
  } catch (error) {
    console.error('KV mget error:', error);
    return [];
  }
}

/**
 * Set multiple values
 */
export async function mset<T = any>(entries: Array<{ key: string; value: T }>): Promise<void> {
  try {
    const records = entries.map(({ key, value }) => ({
      key,
      value,
    }));

    const { error } = await supabase
      .from(TABLE_NAME)
      .upsert(records, {
        onConflict: 'key'
      });

    if (error) throw error;
  } catch (error) {
    console.error('KV mset error:', error);
    throw error;
  }
}

/**
 * Delete multiple keys
 */
export async function mdel(keys: string[]): Promise<void> {
  try {
    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .in('key', keys);

    if (error) throw error;
  } catch (error) {
    console.error('KV mdel error:', error);
    throw error;
  }
}

/**
 * Get all keys matching a prefix
 */
export async function getByPrefix<T = any>(prefix: string): Promise<T[]> {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('value')
      .like('key', `${prefix}%`);

    if (error) throw error;

    return (data || []).map(row => row.value as T);
  } catch (error) {
    console.error(`KV getByPrefix error for prefix "${prefix}":`, error);
    return [];
  }
}
