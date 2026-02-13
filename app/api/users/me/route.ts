import { NextRequest, NextResponse } from "next/server";
import { getServiceBase } from "@/lib/services";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const FEED_SERVICE_URL = getServiceBase("feed");

export async function GET(req: NextRequest) {
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

        const res = await fetch(`${FEED_SERVICE_URL}/users/me`, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "x-user-id": userId,
                "Content-Type": "application/json",
            },
        });

        if (!res.ok) {
            // Handle error, maybe pass through status
            return NextResponse.json({ message: "Failed to fetch profile" }, { status: res.status });
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Error fetching profile:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
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

        const body = await req.json();

        const res = await fetch(`${FEED_SERVICE_URL}/users/me`, {
            method: "PATCH",
            headers: {
                "Authorization": `Bearer ${token}`,
                "x-user-id": userId,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        if (!res.ok) {
            const err = await res.text();
            try {
                const jsonErr = JSON.parse(err);
                return NextResponse.json(jsonErr, { status: res.status });
            } catch {
                return NextResponse.json({ message: "Failed to update profile" }, { status: res.status });
            }
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Error updating profile:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}
