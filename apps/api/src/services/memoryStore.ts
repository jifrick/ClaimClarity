import { MemoryStorageAdapter } from './storage/memoryStorageAdapter.js';

// Export canonical in-memory singleton for compatibility and testing
export const memoryStore = new MemoryStorageAdapter();
