import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServiceBase } from "@/lib/services";

export async function POST(req: NextRequest) {
    try {
        const { codigo, senha } = await req.json();

        if (!codigo || !senha) {
            return NextResponse.json({ message: "Credenciais inválidas" }, { status: 400 });
        }

        const SISTEMA_API = `${getServiceBase("sistema")}/login`;

        const backendRes = await fetch(SISTEMA_API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ codigo, senha }),
        });

        const data = await backendRes.json();

        if (!backendRes.ok || !data.success) {
            return NextResponse.json(
                { message: data.message || "Falha na autenticação" },
                { status: backendRes.status || 401 }
            );
        }

        // Define o cookie HttpOnly
        const cookieStore = await cookies();

        // LOG DE DEPURAÇÃO: Verificando variáveis de ambiente no runtime
        const allowInsecure = process.env.ALLOW_INSECURE_COOKIES === "true" ||
            process.env.NEXT_PUBLIC_ALLOW_INSECURE_COOKIES === "true";

        console.log(`[AuthLogin] NODE_ENV: ${process.env.NODE_ENV}`);
        console.log(`[AuthLogin] ALLOW_INSECURE (detectado): ${allowInsecure}`);

        const isSecure = process.env.NODE_ENV === "production" && !allowInsecure;

        console.log(`[AuthLogin] Definindo cookie auth_token. Secure: ${isSecure}`);

        cookieStore.set("auth_token", data.access_token, {
            httpOnly: true,
            secure: isSecure,
            sameSite: "lax",
            path: "/",
        });

        console.log(`[AuthLogin] Cookie definido com sucesso.`);

        // Retorna sucesso mas SEM o token no corpo para o client
        // Opcional: retornar dados de usuário se o backend já devolve
        const { access_token, ...userData } = data;

        return NextResponse.json({
            success: true,
            user: userData,
        });

    } catch (error: any) {
        console.error("Erro no login API Route:", error);
        return NextResponse.json({ message: "Erro interno no servidor" }, { status: 500 });
    }
}
