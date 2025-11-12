// utils/genId.ts
export function genId() {
  // browser seguro (HTTPS/localhost)
  const rnd = globalThis.crypto?.randomUUID?.bind(globalThis.crypto);
  if (rnd) return rnd();

  // fallback usando getRandomValues (UUID v4)
  const buf = new Uint8Array(16);
  globalThis.crypto?.getRandomValues?.(buf);
  // Ajuste de bits p/ versão/variante v4
  buf[6] = (buf[6] & 0x0f) | 0x40;
  buf[8] = (buf[8] & 0x3f) | 0x80;
  const hex = [...buf].map(b => b.toString(16).padStart(2, "0"));
  return `${hex[0]}${hex[1]}${hex[2]}${hex[3]}-${hex[4]}${hex[5]}-${hex[6]}${hex[7]}-${hex[8]}${hex[9]}-${hex[10]}${hex[11]}${hex[12]}${hex[13]}${hex[14]}${hex[15]}`;
}
