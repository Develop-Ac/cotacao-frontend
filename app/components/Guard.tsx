"use client";
import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { AbilityContext } from "./AbilityProvider";
import { canOnPathPrefix } from "../lib/ability";


export function Guard({ children }: { children: React.ReactNode }) {
const ability = React.useContext(AbilityContext);
const path = usePathname();
const router = useRouter();


React.useEffect(() => {
if (!canOnPathPrefix(ability, "read", path || "/")) {
router.replace("/403");
}
}, [ability, path, router]);


if (!path) return null;
return <>{children}</>;
}