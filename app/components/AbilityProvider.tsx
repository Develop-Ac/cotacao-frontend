"use client";
import React from "react";
import { AppAbility, AppAbilityClass, buildAbilityFromPermissions } from "../lib/ability";
import { AbilityBuilder } from "@casl/ability";
// import { readUserFromLocalStorage, subscribeUserDataUpdates } from "../lib/user"; // Removido na migração


export const AbilityContext = React.createContext<AppAbility>(new AppAbilityClass([])); // Start empty
export const AbilityLoadingContext = React.createContext<boolean>(true); // Start loading

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => {
    if (!res.ok) throw new Error("Not authorized");
    return res.json();
});

export function AbilityProvider({ children }: { children: React.ReactNode }) {
    // Use SWR to handle auth state automatically
    const { data, error, isLoading, isValidating } = useSWR("/api/auth/me", fetcher, {
        refreshInterval: 0,
        revalidateOnFocus: true,
        revalidateOnMount: true, // Garante revalidação mesmo com cache de erro (ex: 401 antes do login)
        shouldRetryOnError: false
    });

    // Efeito para sincronizar localStorage quando em modo bypass - REMOVIDO

    const ability = React.useMemo(() => {
        if (error || !data || !data.authenticated || !data.user) {
            return new AppAbilityClass([]); // No permissions if not logged in
        }
        return buildAbilityFromPermissions(data.user.permissoes);
    }, [data, error]);

    // Loading state handling could be added here if we want to block rendering
    // but for now we let it render with empty permissions until loaded

    return (
        // isLoading: carga inicial | isValidating: revalidação após erro em cache (ex: 401 pré-login)
        <AbilityLoadingContext.Provider value={isLoading || isValidating}>
            <AbilityContext.Provider value={ability}>{children}</AbilityContext.Provider>
        </AbilityLoadingContext.Provider>
    );
}