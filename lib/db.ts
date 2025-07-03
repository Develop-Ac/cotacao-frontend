// /lib/db.ts
import { openDB } from 'idb';

export const initDB = async () => {
  return openDB('meuBanco', 2, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('cotacao')) {
        db.createObjectStore('cotacao', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('orcamentos')) {
        db.createObjectStore('orcamentos', { keyPath: 'key' });
      }
    },
  });
};
