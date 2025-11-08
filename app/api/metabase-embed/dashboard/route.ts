import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const METABASE_SITE_URL = "https://bi.acacessorios.local"; // igual ao MB_SITE_URL do Metabase
const METABASE_SECRET_KEY = "cmhp8xpyq0000356orleqfl9x"; // defina no .env do servidor

export async function GET(req: NextRequest) {
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
