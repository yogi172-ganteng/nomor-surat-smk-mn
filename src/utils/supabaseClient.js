import { createClient } from '@supabase/supabase-js';

const STORAGE_KEY_URL = 'smk_mn_supabase_url';
const STORAGE_KEY_ANON = 'smk_mn_supabase_anon';

let cachedClient = null;
let cachedKey = '';

export function getSupabaseConfig() {
  const url =
    localStorage.getItem(STORAGE_KEY_URL) ||
    import.meta.env.VITE_SUPABASE_URL ||
    '';
  const anonKey =
    localStorage.getItem(STORAGE_KEY_ANON) ||
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    '';
  return { url: url.trim(), anonKey: anonKey.trim() };
}

export function saveSupabaseConfig(url, anonKey) {
  if (url) localStorage.setItem(STORAGE_KEY_URL, url.trim());
  else localStorage.removeItem(STORAGE_KEY_URL);

  if (anonKey) localStorage.setItem(STORAGE_KEY_ANON, anonKey.trim());
  else localStorage.removeItem(STORAGE_KEY_ANON);

  cachedClient = null;
  cachedKey = '';
}

export function getSupabaseClient() {
  const { url, anonKey } = getSupabaseConfig();
  if (!url || !anonKey) return null;
  const key = `${url}::${anonKey}`;
  if (cachedClient && cachedKey === key) return cachedClient;
  try {
    cachedClient = createClient(url, anonKey);
    cachedKey = key;
    return cachedClient;
  } catch {
    return null;
  }
}

/**
 * Buat client non-persisten khusus ketika Admin mendaftarkan akun Staf baru
 * dari tab "Daftar Akun Staf" agar sesi login Admin yang sedang aktif tidak terganti!
 */
export function createTempAuthClient() {
  const { url, anonKey } = getSupabaseConfig();
  if (!url || !anonKey) return null;
  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
