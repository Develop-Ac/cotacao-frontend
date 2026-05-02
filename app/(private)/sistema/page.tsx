"use client";

import Link from "next/link";
import UsuarioPage from "../usuario/page";

export default function SistemaPage() {
  return (
    <div className="space-y-4">
      <div className="mx-auto max-w-screen-2xl px-4 pt-4 md:px-6 2xl:px-10">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {/* <span className="font-semibold">Rota oficial:</span> use <span className="font-mono">/sistema</span>. A rota */}
          {/* <span className="font-mono"> /usuario</span> permanece temporariamente como legado durante a transicao. */}
          {/* <Link href="/sistema/email" className="ml-2 font-semibold text-amber-900 underline">
            Ir para Sistema &gt; E-mails
          </Link> */}
        </div>
      </div>
      <UsuarioPage />
    </div>
  );
}
