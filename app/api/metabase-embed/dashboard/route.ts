import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const METABASE_SITE_URL = "https://intranet-metabase.naayqg.easypanel.host";
const METABASE_SECRET = "123123123"; // NUNCA hardcode

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const id = Number(url.searchParams.get("id") || "0");
  if (!id) return NextResponse.json({ error: "id inválido" }, { status: 400 });

  // Pegue seus filtros por querystring e mapeie para os nomes de filtros do dashboard
  const data = url.searchParams.get("data") || undefined;
  const vendedor = url.searchParams.getAll("vendedor"); // múltiplos

  const params: Record<string, any> = {};
  if (data) params.data = data;
  if (vendedor?.length) params.vendedor = vendedor;

  const payload = {
    resource: { dashboard: id },
    params,
    exp: Math.floor(Date.now() / 1000) + 60 * 10000000, // expiração do token
  };

  const token = jwt.sign(payload, METABASE_SECRET);
  const embedUrl = `${METABASE_SITE_URL}/embed/dashboard/${token}#bordered=true&titled=true`;
  return NextResponse.json({ url: embedUrl });
}
