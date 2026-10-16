import { env } from '../../config.js';
import { getSupabase } from '../supabase.js';
import { IStorageAdapter } from './storage.types.js';
import { MemoryStorageAdapter } from './memoryStorageAdapter.js';
import { SupabaseStorageAdapter } from './supabaseStorageAdapter.js';

let storageInstance: IStorageAdapter | null = null;

export function getStorage(): IStorageAdapter {
  if (storageInstance) return storageInstance;

  // Strict startup check: If in production, never silently fall back to memory
  if (env.STORAGE_MODE === 'supabase' || env.NODE_ENV === 'production') {
    const supabase = getSupabase();
    if (!supabase) {
      throw new Error(
        'CRITICAL CONFIGURATION ERROR: STORAGE_MODE is set to "supabase" (or NODE_ENV is "production"), ' +
        'but SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing or invalid. ' +
        'Refusing to silently fall back to ephemeral in-memory storage in production.'
      );
    }
    storageInstance = new SupabaseStorageAdapter(supabase);
    return storageInstance;
  }

  // Development/Demo/Test fallback
  storageInstance = new MemoryStorageAdapter();
  return storageInstance;
}

export function setStorageInstance(adapter: IStorageAdapter): void {
  storageInstance = adapter;
}
