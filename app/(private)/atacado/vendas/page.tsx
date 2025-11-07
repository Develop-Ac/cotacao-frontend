'use client';
import { useEffect, useState } from "react";

export default function VendasAtacadoPage() {
  const [src, setSrc] = useState<string>("");

  useEffect(() => {
    const params = new URLSearchParams({
      id: "18",                                  // ID do DASHBOARD normal
      data: "2025-10-26~2025-11-07",
    });
    // múltiplos vendedores
    ["KAUA JOSE GONCALVES DA ROSA","ALISSON","FERNANDO","GABRIEL","LUCAS BARRADA","YURI"]
      .forEach(v => params.append("vendedor", v));

    fetch(`/api/metabase-embed/dashboard?` + params.toString())
      .then(r => r.json())
      .then(({ url }) => setSrc(url));
  }, []);

  if (!src) return null;

  return (
    <div className="w-full h-screen">
      <iframe
        src={src}
        className="w-full h-full border-0"
        title="Vendas Atacado"
        // normalmente não usar sandbox para signed embed
      />
    </div>
  );
}
