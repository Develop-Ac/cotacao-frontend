"use client";
import React from "react";
import { AppAbility, AppAbilityClass, buildAbilityFromPermissions } from "../lib/ability";
import { readUserFromLocalStorage, subscribeUserDataUpdates } from "../lib/user";


export const AbilityContext = React.createContext<AppAbility>(new AppAbilityClass([]));


export function AbilityProvider({ children }: { children: React.ReactNode }) {
const [ability, setAbility] = React.useState<AppAbility>(() =>
buildAbilityFromPermissions(readUserFromLocalStorage()?.permissoes)
);


React.useEffect(() => {
const update = () => {
const user = readUserFromLocalStorage();
setAbility(buildAbilityFromPermissions(user?.permissoes));
};
update();
const unsub = subscribeUserDataUpdates(update);
const onFocus = () => update();
document.addEventListener("visibilitychange", onFocus);
window.addEventListener("focus", onFocus);
return () => {
unsub();
document.removeEventListener("visibilitychange", onFocus);
window.removeEventListener("focus", onFocus);
};
}, []);


return (
<AbilityContext.Provider value={ability}>{children}</AbilityContext.Provider>
);
}