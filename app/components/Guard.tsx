"use client";
import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { AbilityContext, AbilityLoadingContext } from "./AbilityProvider";
import { canOnPathPrefix } from "../lib/ability";


export function Guard({ children }: { children: React.ReactNode }) {
    const ability = React.useContext(AbilityContext);
    const isLoading = React.useContext(AbilityLoadingContext);
    const path = usePathname();
    const router = useRouter();


    React.useEffect(() => {
        if (isLoading) return; // ✅ Wait for permissions
        if (path === "/login" || path === "/403") return; // ✅ Allow public access
        if (!canOnPathPrefix(ability, "read", path || "/")) {
            router.replace("/403");
        }
    }, [ability, path, router, isLoading]);


    if (!path) return null;
    return <>{children}</>;
}