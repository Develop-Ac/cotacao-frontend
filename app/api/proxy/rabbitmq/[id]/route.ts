
import { NextRequest, NextResponse } from "next/server";

// Disable SSL verification for self-signed certificates (required for .local domains)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    if (!id) {
        return NextResponse.json({ message: "ID is required" }, { status: 400 });
    }

    try {
        const rabbitUrl = `https://rabbitmq-service.acacessorios.local/compras/cotacao/${id}`;
        const body = await request.json();

        console.log(`Proxying DELETE to: ${rabbitUrl}`);

        const response = await fetch(rabbitUrl, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Backend responded with ${response.status}: ${errorText}`);
            return NextResponse.json(
                { message: `Backend error: ${response.status}`, details: errorText },
                { status: response.status }
            );
        }

        return NextResponse.json({ message: "Success" }, { status: 200 });
    } catch (error: any) {
        console.error("Proxy error:", error);
        return NextResponse.json(
            { message: "Internal Server Error", error: error.message },
            { status: 500 }
        );
    }
}
