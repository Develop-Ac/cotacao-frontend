import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { getServiceBase } from "@/lib/services";

// URL do serviço de feed (interno/container ou localhost)
const FEED_SERVICE_URL = getServiceBase("feed") || "http://localhost:8001";
// URL do serviço de sistema (para validar token)
const SISTEMA_SERVICE_URL = getServiceBase("sistema") || "http://localhost:9000";

import jwt from 'jsonwebtoken';

// Cache simples em memória: Token -> { usuarioId, timestamp }
const userIdCache = new Map<string, { id: string; reqTime: number }>();
const CACHE_TTL_MS = 60 * 1000; // 60 segundos

async function getUsuarioId(token: string): Promise<string | null> {
    const now = Date.now();

    // 1. Verifica Cache
    if (userIdCache.has(token)) {
        const cached = userIdCache.get(token)!;
        if (now - cached.reqTime < CACHE_TTL_MS) {
            return cached.id;
        }
        userIdCache.delete(token);
    }

    let usuarioId: string | null = null;

    // 2. Tenta decodificar JWT localmente (Performance máxima)
    // Requer JWT_SECRET no .env do frontend
    const secret = process.env.JWT_SECRET;
    if (secret) {
        try {
            const decoded = jwt.verify(token, secret) as any;
            if (decoded && (decoded.sub || decoded.id)) {
                usuarioId = decoded.sub || decoded.id;
                // Cache it
                if (usuarioId) {
                    userIdCache.set(token, { id: usuarioId, reqTime: now });
                    return usuarioId;
                }
            }
        } catch (err) {
            // Token inválido ou erro na verificação local.
            // Podemos tentar validar na API caso o segredo tenha mudado ou seja diferente.
            // Mas geralmente se falha aqui, é token ruim.
            // Vamos deixar cair para o fallback da API por segurança (ex: rotação de chaves não sincronizada)
        }
    }

    // 3. Fallback: Valida no sistema-service via API (Lento, mas seguro)
    try {
        const res = await fetch(`${SISTEMA_SERVICE_URL}/login/me`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
            cache: 'no-store'
        });

        if (!res.ok) return null;

        const data = await res.json();
        usuarioId = data.usuario_id || data.id || null;

        if (usuarioId) {
            userIdCache.set(token, { id: usuarioId, reqTime: now });
        }

        return usuarioId;
    } catch (error) {
        console.error("Erro ao validar token no sistema-service:", error);
        return null;
    }
}

async function proxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
        return NextResponse.json({ message: "Não autenticado" }, { status: 401 });
    }

    const usuarioId = await getUsuarioId(token);

    if (!usuarioId) {
        return NextResponse.json({ message: "Sessão inválida" }, { status: 401 });
    }

    // Reconstrói o caminho (ex: /api/proxy/feed/events -> /events)
    // O Next.js 'path' parameter vem como array: ['events'] ou ['feed', '123']
    const pathArray = (await params).path;
    const pathString = pathArray.join("/");
    const searchParams = req.nextUrl.search; // ?skip=0&take=10

    const targetUrl = `${FEED_SERVICE_URL}/${pathString}${searchParams}`;

    // Encaminha o Body (se houver)
    // Cuidado com FormData (upload de arquivos) vs JSON
    const contentType = req.headers.get("content-type");

    let body: any = null;
    if (req.method !== "GET" && req.method !== "HEAD") {
        if (contentType?.includes("multipart/form-data")) {
            // Para upload de arquivos, precisamos repassar o formData de forma fiel
            // fetch aceita FormData diretamente
            body = await req.formData();
        } else {
            body = await req.text(); // lê como texto para repassar (preserva JSON)
        }
    }

    const headers: HeadersInit = {
        "x-user-id": usuarioId,
    };

    // Se não for multipart, repassa o content-type original
    // Se for multipart, o fetch gerará o boundary automaticamente se passarmos FormData no body
    if (contentType && !contentType.includes("multipart/form-data")) {
        headers["Content-Type"] = contentType;
    }

    try {
        const res = await fetch(targetUrl, {
            method: req.method,
            headers: headers,
            body: body,
            cache: 'no-store'
        });

        // Repassa a resposta do backend
        const responseData = await res.arrayBuffer(); // lê como buffer para suportar imagens/arquivos se necessário

        const responseHeaders = new Headers();
        // Copia headers relevantes, ex: content-type
        if (res.headers.get("Content-Type")) {
            responseHeaders.set("Content-Type", res.headers.get("Content-Type")!);
        }

        return new NextResponse(responseData, {
            status: res.status,
            statusText: res.statusText,
            headers: responseHeaders
        });

    } catch (error) {
        console.error("Erro no proxy do feed:", error);
        return NextResponse.json({ message: "Erro de comunicação com o serviço de feed" }, { status: 502 });
    }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const DELETE = proxy;
export const PATCH = proxy;
