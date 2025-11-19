import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { getServiceBase } from "@/lib/services";

const METABASE_SITE_URL = process.env.METABASE_SITE_URL?.trim() || getServiceBase("metabase");
const METABASE_SECRET_KEY = process.env.METABASE_SECRET_KEY || "";

export async function GET(req: NextRequest) {
  if (!METABASE_SECRET_KEY) {
    return NextResponse.json({ error: "METABASE_SECRET_KEY not configured" }, { status: 500 });
  }
  // Filtros (adicione conforme seus filtros do dashboard)
  const params = {
    data: ["2025-09-26", "2025-10-07"],  // intervalo de datas em ISO (YYYY-MM-DD)
    vendedor: [
      "ALISSON", "FERNANDO", "GABRIEL",
      "KAUA JOSE GONCALVES DA ROSA", "LUCAS BARRADA", "YURI"
    ],
    // tab: "14-painel-de-vendas" // só se existir filtro com esse nome
  };

  const payload = {
    resource: { dashboard: 18 },                   // seu dashboard
    params,                                        // filtros do dashboard
    exp: Math.floor(Date.now()/1000) + 60*10       // expira em 10 min
  };

  const token = jwt.sign(payload, METABASE_SECRET_KEY);
  const url = `${METABASE_SITE_URL}/embed/dashboard/${token}#bordered=true&titled=true`;

  return NextResponse.json({ url });
}
