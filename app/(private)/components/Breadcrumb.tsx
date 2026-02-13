"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MdChevronRight, MdHome } from "react-icons/md";

// Map route segments to friendly names
const routeMap: { [key: string]: string } = {
    compras: "Compras",
    cotacao: "Cotação",
    comparativo: "Comparativo",
    pedido: "Pedido",
    kanban: "Kanban",
    notafiscal: "Nota Fiscal",
    produtos: "Análise de Produtos",
    oficina: "Oficina",
    checklist: "Check List",
    estoque: "Estoque",
    contagem: "Contagem",
    auditoria: "Auditoria",
    expedicao: "Expedição",
    dashboard: "Feed",
    aplicativo: "Aplicativo",
    qualidade: "Qualidade",
    central: "Central",
    inbox: "Inbox",
    caixa: "Inbox",
    sac: "SAC",
    usuario: "Usuários",
    sistema: "Sistema",
};

const Breadcrumb = () => {
    const pathname = usePathname();
    // Split path, filter empty strings
    const pathSegments = pathname.split("/").filter((segment) => segment !== "");

    // If we are at root, show Dashboard
    if (pathSegments.length === 0) {
        return (
            <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                <MdHome className="text-lg" />
                <span>Feed</span>
            </div>
        );
    }

    return (
        <nav className="flex items-center">
            <ol className="flex items-center gap-1 sm:gap-2">
                <li>
                    <Link
                        className="flex items-center gap-1 text-gray-500 hover:text-primary transition-colors duration-200"
                        href="/"
                    >
                        <MdHome className="text-lg" />
                    </Link>
                </li>

                {pathSegments.map((segment, index) => {
                    if (segment === 'feed') return null;

                    const isLast = index === pathSegments.length - 1;
                    const href = `/${pathSegments.slice(0, index + 1).join("/")}`;
                    const formattedName = routeMap[segment.toLowerCase()] || segment;

                    return (
                        <li key={href} className="flex items-center gap-1 sm:gap-2">
                            <MdChevronRight className="text-gray-400 text-lg" />
                            {isLast ? (
                                <span className="font-medium text-primary cursor-default">
                                    {formattedName}
                                </span>
                            ) : (
                                <Link
                                    className="font-medium text-gray-500 hover:text-primary transition-colors duration-200"
                                    href={href}
                                >
                                    {formattedName}
                                </Link>
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
};

export default Breadcrumb;
