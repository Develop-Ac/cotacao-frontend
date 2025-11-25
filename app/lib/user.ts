"use client";
import type { PermissaoLinha } from "./ability";


export type UserData = {
success: boolean;
usuario: string;
usuario_id: string;
codigo: string;
setor: string;
permissoes: PermissaoLinha[];
access_token: string;
};


const STORAGE_KEY = "userData";
export const USERDATA_EVENT = "userData:updated"; // evento custom p/ mesma aba


export function readUserFromLocalStorage(): UserData | null {
if (typeof window === "undefined") return null;
try {
const raw = localStorage.getItem(STORAGE_KEY);
if (!raw) return null;
return JSON.parse(raw) as UserData;
} catch (e) {
console.error("Erro ao ler userData do localStorage", e);
return null;
}
}


export function writeUserToLocalStorage(user: UserData) {
if (typeof window === "undefined") return;
localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
// dispara evento na MESMA aba
window.dispatchEvent(new Event(USERDATA_EVENT));
// tenta avisar outras abas também com BroadcastChannel (fallback ao 'storage')
try {
const bc = new BroadcastChannel("auth");
bc.postMessage({ type: "userData", ts: Date.now() });
bc.close();
} catch {}
}


export function subscribeUserDataUpdates(cb: () => void) {
if (typeof window === "undefined") return () => {};
const onCustom = () => cb(); // mesma aba
const onStorage = (e: StorageEvent) => {
if (e.key === STORAGE_KEY) cb();
};
let bc: BroadcastChannel | null = null;
const onBC = () => cb();
try {
bc = new BroadcastChannel("auth");
bc.onmessage = onBC;
} catch {}


window.addEventListener(USERDATA_EVENT, onCustom);
window.addEventListener("storage", onStorage);


return () => {
window.removeEventListener(USERDATA_EVENT, onCustom);
window.removeEventListener("storage", onStorage);
try { bc && bc.close(); } catch {}
};
}