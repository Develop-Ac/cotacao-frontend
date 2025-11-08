'use client';
import { useEffect, useState } from "react";

export default function VendasAtacadoPage() {
  const [src, setSrc] = useState("");

  useEffect(() => {
    fetch("/api/metabase-embed/dashboard")
      .then(r => r.json())
      .then(({ url }) => setSrc(url))
      .catch(console.error);
  }, []);

  if (!src) return null;

  return (
    <div className="w-full h-screen">
      <iframe
        src={src}
        className="w-full h-full border-0"
        title="Vendas Atacado"
      />
    </div>
  );
}
