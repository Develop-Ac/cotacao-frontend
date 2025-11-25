"use client";
import React from "react";
import { AbilityContext } from "../components/AbilityProvider";
import { canOnPathPrefix, normalizePath } from "../lib/ability";


export function usePermissions(tela?: string) {
const ability = React.useContext(AbilityContext);
const target = tela ? normalizePath(tela) : undefined;


// Só READ herda por prefixo; update/create/delete exigem match exato da tela
const canView = !!(target && canOnPathPrefix(ability, "read", target));
const canEdit = !!(target && ability.can("update", target));
const canCreate = !!(target && ability.can("create", target));
const canDelete = !!(target && ability.can("delete", target));


return { canView, canEdit, canCreate, canDelete };
}