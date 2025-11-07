// app/api/metabase-embed/dashboard/route.ts
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const METABASE_SITE_URL = "https://bi.acacessorios.local";
const METABASE_SECRET = 'cmhp8xpyq0000356orleqfl9x'; // defina no .env do servidor

export async function GET(req: NextRequest) {
  // Filtros fixos conforme seu exemplo
  const params = {
    data: "2025-09-26~2025-10-07",
    vendedor: [
      "ALISSON",
      "FERNANDO",
      "GABRIEL",
      "KAUA JOSE GONCALVES DA ROSA",
      "LUCAS BARRADA",
      "YURI",
    ],
    tab: "14-painel-de-vendas", // só inclua se existir filtro com esse nome no dashboard
  };

  const payload = {
    resource: { dashboard: 18 }, // ID do dashboard
    params,                      // os nomes DEVEM bater com os filtros do dashboard
    exp: Math.floor(Date.now() / 1000) + 60 * 10, // 10 min
  };

  const token = jwt.sign(payload, METABASE_SECRET);
  const url = `${METABASE_SITE_URL}/embed/dashboard/${token}#bordered=true&titled=true`;
  return NextResponse.json({ url });
}
