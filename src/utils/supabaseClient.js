import { createClient } from '@supabase/supabase-js';

const STORAGE_KEY_URL = 'smk_mn_supabase_url';
const STORAGE_KEY_ANON = 'smk_mn_supabase_anon';

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
}

export function getSupabaseClient() {
  const { url, anonKey } = getSupabaseConfig();
  if (!url || !anonKey) return null;
  try {
    return createClient(url, anonKey);
  } catch {
    return null;
  }
}
