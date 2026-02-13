import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServiceBase } from "@/lib/services";

export async function GET(req: NextRequest) {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) {
        return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Opção A: Decodificar JWT localmente (se tiver a chave pública/secret)
    // Opção B: Validar chamando o backend (mais seguro se quiser garantir revogação)

    // Vamos assumir chamada ao backend para validar/pegar perfil atualizado
    // Se o backend tiver um endpoint /me ou similar. 
    // Caso contrário, teríamos que confiar no payload do JWT se não expirar.

    // Como não temos certeza se existe endpoint /me no sistema-service,
    // vamos TENTAR chamar um endpoint de validação ou info.
    // SE não houver, o login original retornava `usuario`, `setor`, `permissoes`.
    // Idealmente, o backend deveria ter um `GET /auth/me`.

    // ⚠️ PROVISÓRIO: Se não houver endpoint /me, o frontend não conseguirá
    // restaurar os dados do usuário num F5 (refresh) A MENOS que:
    // 1. O cookie seja lido no middleware e injetado nos headers (já planejado).
    // 2. O frontend chame uma API que retorne os dados do usuário.

    // Tentativa de Mock/Proxy para um endpoint hipotético /sistema/me
    // Ajuste conforme a API real do sistema-service.

    try {
        const SISTEMA_API = `${getServiceBase("sistema")}/login/me`; // Ajustado para /login/me conforme backend

        // Adiciona timeout de 5 segundos
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const res = await fetch(SISTEMA_API, {
            headers: {
                "Authorization": `Bearer ${token}`
            },
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (res.ok) {
            const data = await res.json();
            return NextResponse.json({ authenticated: true, user: data });
        }

        // Se falhar (ex: 401), o token expirou ou é inválido
        return NextResponse.json({ authenticated: false }, { status: 401 });


    } catch (error) {
        return NextResponse.json({ authenticated: false }, { status: 500 });
    }
}
