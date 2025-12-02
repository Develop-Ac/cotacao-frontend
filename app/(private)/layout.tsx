"use client";

import "../globals.css";
import logoSidebarFull from './assets/images/logo_completa.png';
import logoSidebarIcon from './assets/images/logo_icon.png';
import PrivateRoute from "@/components/PrivateRoute";
import { useRouter, usePathname } from "next/navigation";
import Image from 'next/image';
import { MdOutlineNotificationsNone, MdPowerSettingsNew, MdMenu, MdChevronRight, MdSearch } from "react-icons/md";
import { HiOutlineShoppingCart, HiOutlineWrench, HiOutlineCube, HiOutlineTruck, HiOutlineClipboardDocumentCheck, HiOutlineUser, HiOutlineCog } from "react-icons/hi2";
import Link from "next/link";
import { useState, useEffect, MouseEvent, useContext } from "react";

// ⬇️ Permissão (sem alterar visuais)
import { AbilityContext } from "../components/AbilityProvider";
import { canOnPathPrefix, normalizePath } from "../lib/ability";
import SidebarMenuItem from "./components/SidebarMenuItem";
import ProfileDropdown from "./components/ProfileDropdown";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [userData, setUserData] = useState<any>(null);

  // Ability CASL
  const ability = useContext(AbilityContext);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("userData");
      if (stored) setUserData(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile toggle
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // Desktop collapse

  const [isNavigating, setIsNavigating] = useState(false);

  const isPathActive = (target: string) =>
    target === '/'
      ? pathname === '/'
      : pathname === target || pathname.startsWith(`${target}/`);

  const sectionActive = {
    compras: isPathActive('/compras'),
    oficina: isPathActive('/oficina'),
    estoque: isPathActive('/estoque'),
    expedicao: isPathActive('/expedicao'),
    qualidade: isPathActive('/qualidade'),
    sac: isPathActive('/sac'),
    sistema: isPathActive('/usuario'),
  };

  // ---------- Permissões: helpers ----------
  const canViewPath = (href: string) => {
    const target = normalizePath(href);
    return canOnPathPrefix(ability, "read", target); // read herda por prefixo
  };

  // Submenus completos para cada seção (sem filtro)
  const getSubmenuItems = (section: string) => {
    switch (section) {
      case 'Compras':
        return [
          { label: 'Criar Cotação', href: '/compras/cotacao' },
          { label: 'Comparativo', href: '/compras/cotacao/comparativo' },
          { label: 'Pedido', href: '/compras/cotacao/pedido' },
          { label: 'Kanban', href: '/compras/kanban' },
          { label: 'NF - Lista', href: '/compras/notaFiscal/notaFiscal' },
        ];
      case 'Oficina':
        return [{ label: 'Check List', href: '/oficina/checkList' }];
      case 'Estoque':
        return [{ label: 'Contagem', href: '/estoque/contagem' }];
      case 'Expedicao':
        return [
          { label: 'Dashboard', href: '/expedicao/dashboard' },
          { label: 'Aplicativo', href: '/expedicao/aplicativo' },
        ];
      case 'Qualidade':
        return [
          { label: 'Central', href: '/qualidade' },
          { label: 'Inbox', href: '/qualidade/caixa' },
        ];
      case 'Sac':
        return [{ label: 'Nova Solicitação', href: '/sac/kanban' }];
      case 'Sistema':
        return [{ label: 'Usuários', href: '/usuario' }];
      default:
        return [];
    }
  };

  // Submenus visíveis (filtrados por canView)
  const getVisibleSubmenuItems = (section: string) =>
    getSubmenuItems(section).filter(item => canViewPath(item.href));

  // Seção só aparece se o usuário tiver acesso por setor E houver ao menos 1 link visível
  const hasAnyVisibleInSection = (section: string) => getVisibleSubmenuItems(section).length > 0;

  const hasAccessToModule = (module: string): boolean => {
    if (!userData || !userData.setor) return false;
    if (userData.setor === 'Admin') return true;

    const moduleAccess: { [key: string]: string[] } = {
      'Compras': ['Compras'],
      'Oficina': ['Oficina'],
      'Estoque': ['Estoque'],
      'Expedição': ['Expedição'],
      'Expedicao': ['Expedição'],
      'Qualidade': ['Qualidade', 'Sac', 'Compras'],
      'Sac': ['Sac', 'Qualidade'],
      'Atacado': ['Sac'],
      'Varejo': ['Sac'],
    };

    const userModules = moduleAccess[userData.setor] || [];
    return userModules.includes(module);
  };

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  function deslogar() {
    setIsLoggingOut(true);
    setTimeout(() => {
      window.localStorage.setItem('auth', 'false');
      window.localStorage.removeItem('userData');
      setUserData(null);
      router.replace('/login');
    }, 1000);
  }

  const handleNavigation = async (href: string, event?: MouseEvent<HTMLElement>) => {
    if (event) {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      event.preventDefault();
    }
    if (isNavigating || href === pathname) return;

    setIsNavigating(true);
    try {
      await router.push(href);
      setSidebarOpen(false); // Close mobile sidebar on navigation
    } finally {
      setIsNavigating(false);
    }
  };

  useEffect(() => {
    const target = normalizePath(pathname);
    if (target !== "/login" && target !== "/" && !canViewPath(target)) {
      router.replace("/403");
    }
  }, [pathname, ability]);

  return (
    <PrivateRoute>
      <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900 font-outfit text-base font-normal">
        {/* Sidebar Start */}
        <aside
          className={`fixed left-0 top-0 z-9999 flex h-screen flex-col bg-gray-800 lg:static lg:translate-x-0 transition-all duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            } ${sidebarCollapsed ? 'lg:w-[90px] overflow-visible' : 'lg:w-[250px] w-[250px] overflow-y-hidden'}`}
        >
          {/* Sidebar Header */}
          <div className={`flex items-center justify-center gap-2 pt-4 pb-2`}>
            <Link href="/" className="block w-full">
              <div className="relative flex items-center justify-center h-[50px]">
                <span className={`logo transition-opacity duration-300 absolute left-1/2 -translate-x-1/2 ${sidebarCollapsed ? 'opacity-0 scale-0' : 'opacity-100 scale-100'}`}>
                  <Image
                    src={logoSidebarFull}
                    alt="Logo"
                    width={150}
                    height={50}
                    className="block"
                    priority
                  />
                </span>
                <Image
                  src={logoSidebarIcon}
                  alt="Logo"
                  width={50}
                  height={50}
                  className={`logo-icon transition-all duration-300 absolute left-1/2 -translate-x-1/2 ${sidebarCollapsed ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}
                  priority
                />
              </div>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="block lg:hidden"
            >
              <MdChevronRight className="rotate-180 text-2xl text-gray-500" />
            </button>
          </div>

          <div className={`flex flex-col mt-3 duration-300 ease-linear no-scrollbar ${sidebarCollapsed ? 'overflow-visible' : 'overflow-y-auto'}`}>
            <nav className="mt-0 py-2 px-4 lg:mt-0 lg:px-6">
              <div>
                <h3 className={`mb-4 text-xs uppercase leading-[20px] text-gray-400 font-semibold transition-all duration-300 whitespace-nowrap overflow-hidden ${sidebarCollapsed ? 'w-0 opacity-0' : 'w-full opacity-100'}`}>
                  MENU
                </h3>

                <ul className="flex flex-col gap-4 mb-6">
                  {/* Menu Items Configuration */}
                  {[
                    { id: 'Compras', label: 'Compras', icon: HiOutlineShoppingCart, path: '/compras' },
                    { id: 'Oficina', label: 'Oficina', icon: HiOutlineWrench, path: '/oficina' },
                    { id: 'Estoque', label: 'Estoque', icon: HiOutlineCube, path: '/estoque' },
                    { id: 'Expedição', label: 'Expedição', icon: HiOutlineTruck, path: '/expedicao' }, // Note: id matches hasAccessToModule
                    { id: 'Qualidade', label: 'Qualidade', icon: HiOutlineClipboardDocumentCheck, path: '/qualidade' },
                    { id: 'Sac', label: 'Sac', icon: HiOutlineUser, path: '/sac' },
                    { id: 'Sistema', label: 'Sistema', icon: HiOutlineCog, path: '/usuario' },
                  ].map((section) => {
                    // Special handling for section keys if they differ from ID
                    const sectionKey = section.id === 'Expedição' ? 'Expedicao' : section.id;

                    if (!hasAccessToModule(section.id) || !hasAnyVisibleInSection(sectionKey)) return null;

                    return (
                      <SidebarMenuItem
                        key={section.id}
                        label={section.label}
                        icon={section.icon}
                        isActive={sectionActive[sectionKey.toLowerCase() as keyof typeof sectionActive]}
                        isCollapsed={sidebarCollapsed}
                        submenus={getVisibleSubmenuItems(sectionKey)}
                        onNavigate={handleNavigation}
                        isPathActive={isPathActive}
                        pathname={pathname}
                      />
                    );
                  })}
                </ul>
              </div>
            </nav>
          </div>
        </aside>
        {/* Sidebar End */}

        {/* Content Area Start */}
        <div className="relative flex flex-col flex-1 overflow-x-hidden overflow-y-auto">
          {/* Header Start */}
          {/* Header Start */}
          <header className="sticky top-0 z-999 flex w-full border-b border-gray-700 bg-gray-800">
            <div className="flex grow flex-col items-center justify-between lg:flex-row lg:px-6">
              <div className="flex w-full items-center justify-between gap-2 border-b border-gray-700 px-3 py-3 sm:gap-4 lg:justify-normal lg:border-b-0 lg:px-0 lg:py-4">
                {/* Hamburger Toggle BTN */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSidebarOpen(!sidebarOpen);
                  }}
                  className="z-99999 block rounded-lg border border-gray-700 bg-black p-1.5 shadow-sm lg:hidden"
                >
                  <MdMenu className="text-xl text-white" />
                </button>

                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="z-99999 hidden h-10 w-10 items-center justify-center rounded-lg border border-gray-700 text-white lg:flex"
                >
                  <MdMenu className="text-xl" />
                </button>
                {/* Hamburger Toggle BTN */}


              </div>

              <div className="flex items-center gap-3 2xsm:gap-7">
                <ul className="flex items-center gap-2 2xsm:gap-4">
                  {/* Notification Menu Area */}
                  <li className="relative">
                    <Link
                      href="#"
                      className="relative flex h-10 w-10 items-center justify-center rounded-full border border-gray-700 bg-black text-gray-400 hover:text-primary"
                    >
                      <MdOutlineNotificationsNone className="text-xl" />
                      <span className="absolute -top-0.5 right-0 z-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-black"></span>
                    </Link>
                  </li>
                  {/* Notification Menu Area */}
                </ul>

                {/* User Area */}
                <ProfileDropdown userData={userData} onLogout={deslogar} />
                {/* User Area */}
              </div>
            </div>
          </header>
          {/* Header End */}

          {/* Main Content Start */}
          <div className="flex-1 w-full border-l border-gray-700 flex flex-col min-h-0">
            <main
              className={`relative flex-1 ${pathname?.startsWith('/compras/kanban') || pathname?.startsWith('/sac/kanban')
                ? 'flex flex-col h-full min-h-0 overflow-hidden'
                : 'mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10 overflow-y-auto'
                }`}
            >
              {children}
            </main>
          </div>
          {/* Main Content End */}
        </div>
        {/* Content Area End */}
      </div>

      {isNavigating && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3">
            <span className="inline-flex h-6 w-6 border-2 border-[var(--primary-600)] border-t-transparent rounded-full animate-spin" aria-hidden="true"></span>
            <span className="text-gray-700 font-medium">Carregando...</span>
          </div>
        </div>
      )}

      {isLoggingOut && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-500">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            <span className="text-white text-lg font-medium">Saindo...</span>
          </div>
        </div>
      )}    </PrivateRoute>
  );
}
