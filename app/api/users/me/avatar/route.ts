import { NextRequest, NextResponse } from "next/server";
import { getServiceBase } from "@/lib/services";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const FEED_SERVICE_URL = getServiceBase("feed");

export async function POST(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("auth_token")?.value;

        if (!token) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        // Decode token to get user ID
        const decoded = jwt.decode(token) as { sub: string } | null;
        const userId = decoded?.sub;

        if (!userId) {
            return NextResponse.json({ message: "Invalid token structure" }, { status: 401 });
        }

        // Forwarding Multipart form data is tricky in Next.js App Router
        // We need to read the FormData from the request and send it to the backend.
        const formData = await req.formData();

        // Native fetch can send FormData directly
        const res = await fetch(`${FEED_SERVICE_URL}/users/me/avatar`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "x-user-id": userId,
                // Do NOT set Content-Type manually for FormData, it sets boundaries automatically
            },
            body: formData,
        });

        if (!res.ok) {
            const err = await res.text();
            console.error("Avatar upload failed:", err);
            return NextResponse.json({ message: "Failed to upload avatar" }, { status: res.status });
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Error uploading avatar:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}
