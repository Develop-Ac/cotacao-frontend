"use client";
import { AbilityBuilder, Ability, AbilityClass } from "@casl/ability";


export type AppActions = "manage" | "read" | "create" | "update" | "delete";
export type AppSubjects = string | "all"; // usamos a rota como subject (string)
export type AppAbility = Ability<[AppActions, AppSubjects]>;
export const AppAbilityClass = Ability as AbilityClass<AppAbility>;


export type PermissaoLinha = {
    modulo: string;
    tela: string; // ex.: "/compras/cotacao/comparativo"
    visualizar: boolean;
    editar: boolean;
    criar: boolean;
    deletar: boolean;
};


export function normalizePath(p: string) {
    if (!p) return "/";
    let s = p.trim();
    if (!s.startsWith("/")) s = "/" + s;
    // remove query/hash e trailing slash (exceto raiz)
    s = s.split("?")[0].split("#")[0];
    if (s.length > 1 && s.endsWith("/")) s = s.slice(0, -1);
    s = s.replace(/\/{2,}/g, "/");
    return s;
}


export function buildAbilityFromPermissions(permissoes?: PermissaoLinha[]) {
    const { can, rules } = new AbilityBuilder<AppAbility>(AppAbilityClass);

    // Regra Global: Todos têm acesso ao seu próprio perfil
    can("read", "/feed/profile");
    can("update", "/feed/profile");


    if (permissoes?.length) {
        // deduplica por tela + OR lógico em flags
        const byTela = new Map<string, PermissaoLinha>();
        for (const p of permissoes) {
            const tela = normalizePath(p.tela);
            const prev = byTela.get(tela);
            const merged = prev
                ? {
                    ...prev,
                    visualizar: prev.visualizar || p.visualizar,
                    editar: prev.editar || p.editar,
                    criar: prev.criar || p.criar,
                    deletar: prev.deletar || p.deletar,
                }
                : { ...p, tela };
            byTela.set(tela, merged);
        }


        for (const p of byTela.values()) {
            const res = p.tela; // já normalizada
            if (p.visualizar) can("read", res);
            if (p.editar) can("update", res);
            if (p.criar) can("create", res);
            if (p.deletar) can("delete", res);
        }
    }


    return new AppAbilityClass(rules);
}


export function canOnPathPrefix(ability: AppAbility, action: AppActions, path: string) {
    const target = normalizePath(path);
    if (ability.can(action, target)) return true;
    // tenta por prefixo: /a/b/c => /a, /a/b
    const segments = target.split("/").filter(Boolean);
    let acc = "";
    for (let i = 0; i < segments.length - 1; i++) {
        acc += "/" + segments[i];
        if (ability.can(action, acc)) return true;
    }
    return false;
}