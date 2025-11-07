// 'use client';

import jwt from "jsonwebtoken";

const METABASE_SITE_URL = "https://intranet-metabase.naayqg.easypanel.host";
const METABASE_SECRET = "123123123"; // mesma chave da Admin

function makeEmbedUrl(dashboardId: number, params: Record<string, any> = {}) {
    const payload = {
        resource: { dashboard: dashboardId },
        params,              // { vendedor: "ALISSON", ... } se quiser pré-filtros
        exp: Math.floor(Date.now()/1000) + 60*100000000 // expira em 10min
    };
    const token = jwt.sign(payload, METABASE_SECRET);
    return `${METABASE_SITE_URL}/embed/dashboard/${token}#bordered=true&titled=true`;
}

export default function VendasAtacadoPage() {
        return (
                <div className="w-full h-screen">
                        <iframe
                        src={makeEmbedUrl(18, { data: "2025-10-26~2025-11-07" })}
                        className="w-full h-full border-0"
                        title="Vendas Atacado"
                        />
                </div>
        );
}