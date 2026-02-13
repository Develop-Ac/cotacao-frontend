// DEPRECATED: Use /api/auth/me via SWR or similar
// This file is kept only to avoid breaking other imports temporarily
// but logic should move to API-based auth

export type UserData = {
    success: boolean;
    usuario: string;
    usuario_id: string;
    codigo: string;
    setor: string;
    permissoes: any[];
    access_token: string;
};

// Functions intentionally disabled or warning
export function readUserFromLocalStorage(): UserData | null {
    console.warn("readUserFromLocalStorage deprecated");
    return null;
}

export function writeUserToLocalStorage(user: UserData) {
    console.warn("writeUserToLocalStorage deprecated");
}

export function subscribeUserDataUpdates(cb: () => void) {
    return () => { };
}