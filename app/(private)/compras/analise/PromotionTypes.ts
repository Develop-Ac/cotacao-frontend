
export type LoteEstoque = {
    data_compra: string;
    qtd: number;
    dias_em_estoque: number;
};

export type AnaliseItem = {
    id: number;
    pro_codigo: string;
    pro_descricao: string;
    pro_referencia?: string;
    sgr_codigo: number;
    sgr_descricao?: string;
    mar_descricao: string;
    estoque_disponivel: number;
    demanda_media_dia_ajustada: number;
    categoria_estocagem: string;
    estoque_min_sugerido: number;
    estoque_max_sugerido: number;
    tipo_planejamento: string;
    curva_abc: string;

    // New metrics
    tempo_medio_saldo_atual?: number;
    categoria_saldo_atual?: string;

    group_id?: string;
    grp_estoque_disponivel?: number;
    grp_estoque_max_sugerido?: number;
    grp_estoque_min_sugerido?: number;
    grp_demanda_media_dia?: number; // Added for group headers

    // Auxiliar for logic
    isGroupHeader?: boolean; // Added for group headers
    children?: AnaliseItem[]; // Added for group headers
    expanded?: boolean; // Added for group headers
    // We expect the backend to return standard fields.
    estoque_obsoleto?: number;
    lotes_estoque?: LoteEstoque[];

    // Virtual fields for Frontend logic
    _isChild?: boolean;
    calculated_group_excess?: number;
};

export interface GroupedItem extends AnaliseItem {
    children?: AnaliseItem[];
    isGroupHeader?: boolean;
    expanded?: boolean;
}

export type CalculationDetails = {
    refDias: number;
    scaleFactor: number;
    originalMax: number;
    targetMax: number;
    estoqueDisponivel: number;
    excess: number;
    demandaMediaDia: number;
    isGroup: boolean | undefined;
    group: {
        groupStock: number;
        groupSuggestionMax: number;
        groupDemand: number;
    } | undefined;
};
