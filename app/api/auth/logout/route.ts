import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
    const cookieStore = await cookies();

    // Remove o cookie definindo uma data de expiração no passado
    cookieStore.set("auth_token", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        expires: new Date(0),
        path: "/",
    });

    return NextResponse.json({ success: true, message: "Logout realizado com sucesso" });
}
