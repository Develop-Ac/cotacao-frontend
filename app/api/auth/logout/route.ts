import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
    const cookieStore = await cookies();

    const isSecure = process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_ALLOW_INSECURE_COOKIES !== "true";

    // Remove o cookie definindo uma data de expiração no passado
    cookieStore.set("auth_token", "", {
        httpOnly: true,
        secure: isSecure,
        sameSite: "lax",
        expires: new Date(0),
        path: "/",
    });

    return NextResponse.json({ success: true, message: "Logout realizado com sucesso" });
}
