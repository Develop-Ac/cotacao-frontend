import { serviceUrl } from "@/lib/services";

export interface AuditoriaItem {
    contagem_cuid: string;
    cod_produto: number;
    desc_produto: string;
    estoque_snapshot: number | null; // Saldo no momento da contagem
    estoque_atual: number | null;    // Saldo atual do sistema
    locacoes: (string | null)[];
    piso?: string | null;
    history: {
        1: { total: number; logs: LogAudit[] };
        2: { total: number; logs: LogAudit[] };
        3: { total: number; logs: LogAudit[] };
    };
    diferencas: {
        1: number;
        2: number;
        3: number;
    };
    ja_auditado: boolean;
    audit_id?: string;
}

export interface LogAudit {
    usuario: string;
    qtd: number;
    local: string;
    data: string;
}

export interface SaveAuditoriaDto {
    contagem_cuid: string;
    cod_produto: number;
    tipo_movimento: 'BAIXA' | 'INCLUSAO' | 'CORRETO';
    quantidade_movimento: number;
    observacao: string;
    usuario_id: string; // O front deve pegar o ID do user logado
}

const BASE_URL = serviceUrl("estoque", "auditoria");

export const AuditoriaService = {
    async getPendentes(data: string, piso?: string): Promise<AuditoriaItem[]> {
        let url = `${BASE_URL}/pendentes?data=${data}`;
        if (piso) {
            url += `&piso=${encodeURIComponent(piso)}`;
        }
        const res = await fetch(url);
        if (!res.ok) throw new Error("Erro ao buscar itens de auditoria");
        return res.json();
    },

    async save(dto: SaveAuditoriaDto) {
        const res = await fetch(BASE_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(dto),
        });
        if (!res.ok) throw new Error("Erro ao salvar auditoria");
        return res.json();
    },

    async getHistorico(codProduto: number) {
        const res = await fetch(`${BASE_URL}/historico/${codProduto}`);
        if (!res.ok) throw new Error("Erro ao buscar histórico");
        return res.json();
    }
};
