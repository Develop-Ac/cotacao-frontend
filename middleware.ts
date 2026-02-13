import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
    const token = request.cookies.get("auth_token")?.value;
    const { pathname } = request.nextUrl;

    // Rotas públicas que não precisam de autenticação
    const publicRoutes = ["/login", "/api/auth/login", "/_next", "/static", "/favicon.ico"];

    // Bypass removido conforme solicitação


    // Se for rota pública, permite acesso
    if (publicRoutes.some((route) => pathname.startsWith(route))) {
        // Se o usuário já está logado e tenta acessar login, redireciona para home?
        if (token && pathname === "/login") {
            return NextResponse.redirect(new URL("/", request.url));
        }
        return NextResponse.next();
    }

    // Verifica se o token existe
    if (!token) {
        // Se for chamada de API, retorna 401
        if (pathname.startsWith("/api/")) {
            return NextResponse.json({ message: "Não autenticado" }, { status: 401 });
        }
        // Se for página, redireciona para login
        return NextResponse.redirect(new URL("/login", request.url));
    }

    // Pega resposta padrão
    const response = NextResponse.next();

    // Opcional: Injetar token no header Authorization para APIs downstream 
    // (caso esteja usando Server Actions ou algo que leia headers)
    // Mas para proxy via API Routes, faremos manualmente.

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api/auth (auth routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        "/((?!api/auth|_next/static|_next/image|favicon.ico|images).*)",
    ],
};
