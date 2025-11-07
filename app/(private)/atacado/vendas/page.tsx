'use client';

export default function VendasAtacadoPage() {
    return (
        <div className="w-full h-screen">
            <iframe
            key={Date.now()}
            src="https://bi.acacessorios.local/dashboard/18-vendas-por-vendedor-atacado?data=2025-10-26~2025-11-07&tab=14-painel-de-vendas&vendedor=KAUA+JOSE+GONCALVES+DA+ROSA&vendedor=ALISSON&vendedor=FERNANDO&vendedor=GABRIEL&vendedor=LUCAS+BARRADA&vendedor=YURI"
            className="w-full h-full border-0"
            title="Vendas Atacado Dashboard"
            />
        </div>
    );
}