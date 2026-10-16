import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getStorage, setStorageInstance } from '../../apps/api/src/services/storage/index.js';
import { env } from '../../apps/api/src/config.js';

describe('Production Startup Validation & Fallback Safeguards', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalStorageMode = process.env.STORAGE_MODE;
  const originalSupabaseUrl = process.env.SUPABASE_URL;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.STORAGE_MODE = originalStorageMode;
    process.env.SUPABASE_URL = originalSupabaseUrl;
  });

  it('allows in-memory demo storage when NODE_ENV is development or test', () => {
    const storage = getStorage();
    expect(storage).toBeDefined();
    expect(storage.name).toBe('in_memory_demo');
    expect(storage.isPersistent).toBe(false);
  });

  it('prevents silent fallback to in-memory storage when STORAGE_MODE is supabase without credentials', () => {
    // Override env to trigger check
    (env as any).STORAGE_MODE = 'supabase';
    (env as any).SUPABASE_URL = undefined;
    (env as any).SUPABASE_SERVICE_ROLE_KEY = undefined;

    // Reset storage singleton
    (setStorageInstance as any)(null);

    expect(() => {
      getStorage();
    }).toThrow('CRITICAL CONFIGURATION ERROR');

    // Restore
    (env as any).STORAGE_MODE = 'memory';
    (setStorageInstance as any)(null);
  });
});
