export interface Media {
    id: string;
    url: string;
    tipo: 'imagem' | 'video' | 'documento';
    bucket: string;
    chave: string;
}

export interface Author {
    id: string;
    nome: string;
    setor: string;
    avatar_url?: string;
    role?: string;   // Mapped to setor
}

export interface Comment {
    id: string;
    conteudo: string;
    autor: Author;
    criado_em: string;
}

export interface Post {
    id: string;
    conteudo: string;
    autor: Author;
    tipo: string;
    criado_em: string; // ISO Date string
    midias: Media[];
    comentarios: Comment[];
    curtidas: number;
    ja_curtiu?: boolean;
    // Helper fields for UI
    timestamp?: string;
}

export interface Event {
    id: string;
    titulo: string;
    descricao?: string;
    data: string; // ISO Date string
    hora: string;
    local: string;
    tipo: string;
    autor: Author;
}
