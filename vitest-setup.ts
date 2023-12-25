// vitest-setup.ts
import indexeddb from 'fake-indexeddb';

globalThis.indexedDB = indexeddb;