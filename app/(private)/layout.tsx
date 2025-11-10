"use client"

import "../globals.css";
import logo from './assets/images/logo.svg';
import logo_mini from './assets/images/logo-mini.svg';
import logoSidebarFull from './assets/images/logo_completa.png';
import logoSidebarIcon from './assets/images/logo_icon.png';
import PrivateRoute from "@/components/PrivateRoute";
import { useRouter, usePathname } from "next/navigation";
import Image from 'next/image';
import { MdOutlineNotificationsNone, MdPowerSettingsNew, MdMenu, MdChevronRight } from "react-icons/md";
import { FaShoppingCart, FaWrench, FaBox, FaTruck, FaCog, FaChevronRight } from 'react-icons/fa';
import Link from "next/link";
import { useState, useEffect, MouseEvent } from "react";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [userData, setUserData] = useState<any>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [popover, setPopover] = useState<{ top: number; left: number; section: string } | null>(null);
  const [subPopover, setSubPopover] = useState<{ top: number; left: number; items: { label: string; href: string }[] } | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const expandedSidebarWidth = 256;
  const collapsedSidebarWidth = 72;
  const sidebarWidth = sidebarCollapsed ? collapsedSidebarWidth : expandedSidebarWidth;
  const navHeight = 64;
  const iconSpacingClass = sidebarCollapsed ? 'mr-0' : 'mr-3';
  const isPathActive = (target: string) =>
    target === '/'
      ? pathname === '/'
      : pathname === target || pathname.startsWith(`${target}/`);

  const sectionActive = {
    compras: isPathActive('/compras'),
    oficina: isPathActive('/oficina'),
    estoque: isPathActive('/estoque'),
    expedicao: isPathActive('/expedicao'),
    sistema: isPathActive('/usuario'),
  };
  const buttonMotionClasses = "transition-transform duration-200 ease-out hover:scale-105 active:scale-95";

  const summaryClasses = (active: boolean) =>
    `flex items-center ${sidebarCollapsed ? 'justify-center px-2' : 'px-4'} py-2 cursor-pointer rounded transition-all duration-300 ease-in-out ${
      active && !sidebarCollapsed ? 'bg-blue-100 text-[var(--primary-600)] font-semibold shadow-inner' : 'text-gray-700 hover:bg-blue-50'
    } ${active && sidebarCollapsed ? 'text-[var(--primary-600)]' : ''}`;

  const iconClasses = (active: boolean) =>
    `text-xl transform transition-all duration-300 ease-in-out ${
      active ? 'text-[var(--primary-600)]' : 'text-gray-700'
    } ${sidebarCollapsed ? 'scale-110 translate-x-0' : 'scale-100 translate-x-1'}`;

  const linkClasses = (href: string, exact = false) => {
    const active = exact ? pathname === href : isPathActive(href);
    return `text-gray-600 py-1 px-2 rounded hover:bg-blue-100 ${
      active ? 'bg-blue-100 text-[var(--primary-600)] font-medium' : ''
    }`;
  };
  const textTransitionClass = sidebarCollapsed
    ? 'opacity-0 -translate-x-2 pointer-events-none'
    : 'opacity-100 translate-x-0 pointer-events-auto';
  const labelStyle = (order = 0) => ({
    display: 'inline-block',
    transition: 'opacity 280ms ease, transform 280ms ease, max-width 280ms ease',
    transitionDelay: `${order * 40}ms`,
    maxWidth: sidebarCollapsed ? '0px' : '200px',
  });
  const cascadeStyle = (index: number, step = 40) => ({
    transitionDelay: `${index * step}ms`,
  });
  const cascadeItemClass = () =>
    `transition-all duration-300 ease-out opacity-0 -translate-y-2 group-open:opacity-100 group-open:translate-y-0`;

  useEffect(() => {
    const userDataFromStorage = localStorage.getItem('userData');
    if (userDataFromStorage) {
      setUserData(JSON.parse(userDataFromStorage));
    }
  }, []);

  useEffect(() => {
    setIsNavigating(false);
  }, [pathname]);

  const handleNavigation = (href: string, event?: MouseEvent<HTMLElement>) => {
    if (event) {
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      event.preventDefault();
    }
    if (isNavigating || href === pathname) return;
    setIsNavigating(true);
    router.push(href);
  };

  const hasAccessToModule = (module: string): boolean => {
    if (!userData || !userData.setor) return false;

    if (userData.setor === 'Admin') return true;

    const moduleAccess: { [key: string]: string[] } = {
      'Compras': ['Compras'],
      'Oficina': ['Oficina'],
      'Estoque': ['Estoque'],
      'Expedição': ['Expedição'],
      'Expedicao': ['Expedição'],
    };

    const userModules = moduleAccess[userData.setor] || [];
    return userModules.includes(module);
  };

  const getSubmenuItems = (section: string) => {
    switch (section) {
      case 'Compras':
        return [
          { label: 'Criar Cotação', href: '/compras/cotacao' },
          { label: 'Comparativo', href: '/compras/cotacao/comparativo' },
          { label: 'Pedido', href: '/compras/cotacao/pedido' },
          { label: 'Kanban', href: '/compras/kanban' },
        ];
      case 'Oficina':
        return [{ label: 'Check List', href: '/oficina/checkList' }];
      case 'Estoque':
        return [{ label: 'Contagem', href: '/estoque/contagem' }];
      case 'Expedicao':
        return [{ label: 'Entregas', href: '/expedicao/entregas' }];
      case 'Sistema':
        return [{ label: 'Usuários', href: '/usuario' }];
      default:
        return [];
    }
  };

  function deslogar() {
    localStorage.setItem('auth', 'false');
    handleNavigation('/login');
  }

  return (
    <PrivateRoute>
      <div className="min-h-screen flex flex-col" style={{ background: 'var(--background)' }}>
        <nav
          role="navigation"
          className="fixed top-0 flex items-center justify-between bg-gradient-to-r from-[var(--primary-600)] to-[var(--secondary-500)] shadow px-6 z-50 h-16 transition-all duration-300 text-white"
          style={{ left: sidebarWidth, width: `calc(100% - ${sidebarWidth}px)` }}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm sm:text-base font-medium">
              Olá, {userData?.usuario?.split(' ')[0] || 'Usuário'}!
            </span>
          </div>
          <div className="flex items-center gap-3">
            <ul className="flex items-center gap-2">
              <li>
                <button aria-label="notificações" className={`p-2 rounded hidden lg:block hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${buttonMotionClasses}`}>
                  <MdOutlineNotificationsNone className="text-xl text-white" />
                </button>
              </li>
              <li className="relative">
                <button aria-label="notificações" className={`p-2 rounded relative lg:hidden hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${buttonMotionClasses}`}>
                  <MdOutlineNotificationsNone className="text-xl text-white" />
                  <span className="absolute top-0 right-0 block w-2 h-2 bg-red-400 rounded-full"></span>
                </button>
              </li>
              <li>
                <button aria-label="logout" onClick={deslogar} className={`p-2 rounded hidden lg:block hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${buttonMotionClasses}`}>
                  <MdPowerSettingsNew className="text-xl text-white" />
                </button>
              </li>
            </ul>
          </div>
        </nav>

        <div className="flex">
          <aside
            className="fixed top-0 left-0 h-screen bg-white shadow-xl flex flex-col overflow-y-auto overflow-x-visible transition-all duration-300"
            style={{ width: sidebarWidth }}
          >
            <div className="p-4 flex flex-col items-center gap-4 bg-white text-gray-700">
              <div
                className="relative flex items-center justify-center w-full mb-4 overflow-visible"
                style={{ height: 90 }}
              >
                <Image
                  src={logoSidebarFull.src}
                  alt="Logomarca lateral completa"
                  width={200}
                  height={80}
                  className={`absolute transition-all duration-300 ease-in-out object-contain ${sidebarCollapsed ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                  priority
                />
                <Image
                  src={logoSidebarIcon.src}
                  alt="Ícone da logomarca"
                  width={83}
                  height={83}
                  className={`absolute transition-all duration-300 ease-in-out object-contain ${sidebarCollapsed ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}
                  priority
                />
              </div>
              <div className="flex items-center justify-between w-full">
                <span
                  className={`font-semibold text-gray-700 whitespace-nowrap ${textTransitionClass}`}
                  style={labelStyle(0)}
                  aria-hidden={sidebarCollapsed ? true : undefined}
                >
                  Menu Principal
                </span>
                <button
                  aria-label={sidebarCollapsed ? "Expandir menu" : "Recolher menu"}
                  onClick={() => setSidebarCollapsed(prev => !prev)}
                  type="button"
                  className={`p-2 rounded-lg text-white bg-[var(--primary-600)] hover:bg-[var(--primary-800)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--primary-600)] ${buttonMotionClasses}`}
                >
                  <MdMenu className="text-xl text-inherit" />
                </button>
              </div>
            </div>
            <ul className="flex flex-col gap-2 mt-4">
              {hasAccessToModule('Compras') && (
                <li>
                  <details className="group">
                    <summary
                      onClick={(e) => {
                        if (sidebarCollapsed) {
                          e.preventDefault();
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          setPopover({ top: rect.top + window.scrollY, left: rect.right + window.scrollX + 8, section: 'Compras' });
                        }
                      }}
                      className={summaryClasses(sectionActive.compras)}
                    >
                      <FaShoppingCart title="Compras" className={`${iconSpacingClass} ${iconClasses(sectionActive.compras)}`} />
                      <span
                        className={`font-medium whitespace-nowrap ${textTransitionClass}`}
                        style={labelStyle(1)}
                        aria-hidden={sidebarCollapsed ? true : undefined}
                      >
                        Compras
                      </span>
                      {!sidebarCollapsed && <FaChevronRight className="ml-auto transition-transform group-open:rotate-90 w-4 h-4" />}
                    </summary>
                    {!sidebarCollapsed && (
                      <div className="grid grid-rows-[0fr] group-open:grid-rows-[1fr] transition-[grid-template-rows] duration-300 ease-in-out">
                        <ul className="ml-10 mt-1 flex flex-col gap-1 overflow-hidden">
                          <li className={cascadeItemClass()} style={cascadeStyle(0)}>
                            <details className="group">
                              <summary className={`flex items-center px-4 py-2 cursor-pointer rounded transition ${isPathActive('/compras/cotacao') ? 'bg-blue-50 text-[var(--primary-600)] font-medium' : 'text-gray-700 hover:bg-blue-50'}`}>
                                <span className="font-medium">Cotação</span>
                                <FaChevronRight className="ml-auto transition-transform group-open:rotate-90 w-4 h-4" />
                              </summary>
                              <div className="grid grid-rows-[0fr] group-open:grid-rows-[1fr] transition-[grid-template-rows] duration-300 ease-in-out">
                                <ul className="ml-10 mt-1 flex flex-col gap-1 overflow-hidden">
                                  <li className={cascadeItemClass()} style={cascadeStyle(0)}>
                                    <Link href="/compras/cotacao" onClick={(e) => handleNavigation('/compras/cotacao', e)} className={linkClasses('/compras/cotacao', true)}>
                                      Criar Cotação
                                    </Link>
                                  </li>
                                  <li className={cascadeItemClass()} style={cascadeStyle(1)}>
                                    <Link href="/compras/cotacao/comparativo" onClick={(e) => handleNavigation('/compras/cotacao/comparativo', e)} className={linkClasses('/compras/cotacao/comparativo')}>
                                      Comparativo
                                    </Link>
                                  </li>
                                  <li className={cascadeItemClass()} style={cascadeStyle(2)}>
                                    <Link href="/compras/cotacao/pedido" onClick={(e) => handleNavigation('/compras/cotacao/pedido', e)} className={linkClasses('/compras/cotacao/pedido')}>
                                      Pedido
                                    </Link>
                                  </li>
                                </ul>
                              </div>
                            </details>
                          </li>
                          <li className={cascadeItemClass()} style={cascadeStyle(1)}>
                            <Link href="/compras/kanban" onClick={(e) => handleNavigation('/compras/kanban', e)} className={`${linkClasses('/compras/kanban')} px-4 block`}>
                              Kanban
                            </Link>
                          </li>
                        </ul>
                      </div>
                    )}
                  </details>
                </li>
              )}
              {hasAccessToModule('Oficina') && (
                <li>
                  <details className="group">
                    <summary
                      onClick={(e) => {
                        if (sidebarCollapsed) {
                          e.preventDefault();
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          setPopover({ top: rect.top + window.scrollY, left: rect.right + window.scrollX + 8, section: 'Oficina' });
                        }
                      }}
                      className={summaryClasses(sectionActive.oficina)}
                    >
                      <FaWrench title="Oficina" className={`${iconSpacingClass} ${iconClasses(sectionActive.oficina)}`} />
                      <span
                        className={`font-medium whitespace-nowrap ${textTransitionClass}`}
                        style={labelStyle(2)}
                        aria-hidden={sidebarCollapsed ? true : undefined}
                      >
                        Oficina
                      </span>
                      {!sidebarCollapsed && <FaChevronRight className="ml-auto transition-transform group-open:rotate-90 w-4 h-4" />}
                    </summary>
                    {!sidebarCollapsed && (
                      <div className="grid grid-rows-[0fr] group-open:grid-rows-[1fr] transition-[grid-template-rows] duration-300 ease-in-out">
                        <ul className="ml-10 mt-1 flex flex-col gap-1 overflow-hidden">
                          <li className={cascadeItemClass()} style={cascadeStyle(0)}>
                            <Link href="/oficina/checkList" onClick={(e) => handleNavigation('/oficina/checkList', e)} className={linkClasses('/oficina/checkList')}>
                              Check List
                            </Link>
                          </li>
                        </ul>
                      </div>
                    )}
                  </details>
                </li>
              )}
              {hasAccessToModule('Estoque') && (
                <li>
                  <details className="group">
                    <summary
                      onClick={(e) => {
                        if (sidebarCollapsed) {
                          e.preventDefault();
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          setPopover({ top: rect.top + window.scrollY, left: rect.right + window.scrollX + 8, section: 'Estoque' });
                        }
                      }}
                      className={summaryClasses(sectionActive.estoque)}
                    >
                      <FaBox title="Estoque" className={`${iconSpacingClass} ${iconClasses(sectionActive.estoque)}`} />
                      <span
                        className={`font-medium whitespace-nowrap ${textTransitionClass}`}
                        style={labelStyle(3)}
                        aria-hidden={sidebarCollapsed ? true : undefined}
                      >
                        Estoque
                      </span>
                      {!sidebarCollapsed && <FaChevronRight className="ml-auto transition-transform group-open:rotate-90 w-4 h-4" />}
                    </summary>
                    {!sidebarCollapsed && (
                      <div className="grid grid-rows-[0fr] group-open:grid-rows-[1fr] transition-[grid-template-rows] duration-300 ease-in-out">
                        <ul className="ml-10 mt-1 flex flex-col gap-1 overflow-hidden">
                          <li className={cascadeItemClass()} style={cascadeStyle(0)}>
                            <Link href="/estoque/contagem" onClick={(e) => handleNavigation('/estoque/contagem', e)} className={linkClasses('/estoque/contagem')}>
                              Contagem
                            </Link>
                          </li>
                        </ul>
                      </div>
                    )}
                  </details>
                </li>
              )}
              {hasAccessToModule('Expedição') && (
                <li>
                  <details className="group">
                    <summary
                      onClick={(e) => {
                        if (sidebarCollapsed) {
                          e.preventDefault();
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          setPopover({ top: rect.top + window.scrollY, left: rect.right + window.scrollX + 8, section: 'Expedicao' });
                        }
                      }}
                      className={summaryClasses(sectionActive.expedicao)}
                    >
                      <FaTruck title="Expedição" className={`${iconSpacingClass} ${iconClasses(sectionActive.expedicao)}`} />
                      <span
                        className={`font-medium whitespace-nowrap ${textTransitionClass}`}
                        style={labelStyle(4)}
                        aria-hidden={sidebarCollapsed ? true : undefined}
                      >
                        Expedição
                      </span>
                      {!sidebarCollapsed && <FaChevronRight className="ml-auto transition-transform group-open:rotate-90 w-4 h-4" />}
                    </summary>
                    {!sidebarCollapsed && (
                      <div className="grid grid-rows-[0fr] group-open:grid-rows-[1fr] transition-[grid-template-rows] duration-300 ease-in-out">
                        <ul className="ml-10 mt-1 flex flex-col gap-1 overflow-hidden">
                          <li className={cascadeItemClass()} style={cascadeStyle(0)}>
                            <Link href="/expedicao/entregas" onClick={(e) => handleNavigation('/expedicao/entregas', e)} className={linkClasses('/expedicao/entregas')}>
                              Entregas
                            </Link>
                          </li>
                        </ul>
                      </div>
                    )}
                  </details>
                </li>
              )}
              {userData?.setor === 'Admin' && (
                <li>
                  <details className="group">
                    <summary
                      onClick={(e) => {
                        if (sidebarCollapsed) {
                          e.preventDefault();
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          setPopover({ top: rect.top + window.scrollY, left: rect.right + window.scrollX + 8, section: 'Sistema' });
                        }
                      }}
                      className={summaryClasses(sectionActive.sistema)}
                    >
                      <FaCog title="Sistema" className={`${iconSpacingClass} ${iconClasses(sectionActive.sistema)}`} />
                      <span
                        className={`font-medium whitespace-nowrap ${textTransitionClass}`}
                        style={labelStyle(5)}
                        aria-hidden={sidebarCollapsed ? true : undefined}
                      >
                        Sistema
                      </span>
                      {!sidebarCollapsed && <FaChevronRight className="ml-auto transition-transform group-open:rotate-90 w-4 h-4" />}
                    </summary>
                    {!sidebarCollapsed && (
                      <div className="grid grid-rows-[0fr] group-open:grid-rows-[1fr] transition-[grid-template-rows] duration-300 ease-in-out">
                        <ul className="ml-10 mt-1 flex flex-col gap-1 overflow-hidden">
                          <li className={cascadeItemClass()} style={cascadeStyle(0)}>
                            <Link href="/usuario" onClick={(e) => handleNavigation('/usuario', e)} className={linkClasses('/usuario')}>
                              Usuários
                            </Link>
                          </li>
                        </ul>
                      </div>
                    )}
                  </details>
                </li>
              )}
            </ul>
          </aside>

          <div
            className="flex-1 transition-all duration-300"
            style={{ marginLeft: sidebarWidth, paddingTop: navHeight }}
          >
            <main className="p-8 bg-gray-50 min-h-screen">
              {children}
            </main>

          {sidebarCollapsed && popover && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => { setSubPopover(null); setPopover(null); }} />
              <div
                className="fixed z-50 bg-white shadow-2xl rounded-lg overflow-hidden min-w-56"
                style={{ top: popover.top, left: popover.left }}
              >
                <ul className="py-2">
                  {(() => {
                    const mainItems = getSubmenuItems(popover.section);
                    const comprasSubmenu = popover.section === 'Compras' ? [
                      { label: 'Cotação', items: [{ label: 'Criar Cotação', href: '/compras/cotacao' }, { label: 'Comparativo', href: '/compras/cotacao/comparativo' }, { label: 'Pedido', href: '/compras/cotacao/pedido' }] },
                      { label: 'Kanban', href: '/compras/kanban' }
                    ] : mainItems.map(item => ({ label: item.label, href: item.href }));

                    const itemsToRender = popover.section === 'Compras' ? comprasSubmenu : mainItems.map(item => ({ label: item.label, href: item.href }));

                    return itemsToRender.map(item => (
                      ('items' in item && item.items) ? (
                        <li key={item.label}>
                          <button
                            className={`w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 rounded-md transition ${buttonMotionClasses}`}
                            onMouseEnter={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setSubPopover({ top: rect.top + window.scrollY, left: rect.right + window.scrollX + 6, items: item.items! });
                            }}
                            onClick={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setSubPopover({ top: rect.top + window.scrollY, left: rect.right + window.scrollX + 6, items: item.items! });
                            }}
                          >
                            <span>{item.label}</span>
                            <MdChevronRight className="ml-auto text-gray-400" />
                          </button>
                        </li>
                      ) : (
                        <li key={item.href || item.label}>
                          <Link
                            href={item.href!}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 rounded-md transition"
                            onClick={(e) => {
                              handleNavigation(item.href!, e);
                              setSubPopover(null);
                              setPopover(null);
                            }}
                          >
                            {item.label}
                          </Link>
                        </li>
                      )
                    ));
                  })()}
                </ul>
              </div>
            </>
          )}

          {subPopover && (
            <div
              className="fixed z-50 bg-white shadow-2xl rounded-lg overflow-hidden min-w-56"
              style={{ top: subPopover.top, left: subPopover.left }}
              onMouseLeave={() => setSubPopover(null)}
              onMouseEnter={() => {}}
            >
              <ul className="py-2">
                {subPopover.items.map(item => (
                  <li key={item.href || item.label}>
                    <Link
                      href={item.href}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 rounded-md transition"
                      onClick={(e) => {
                        handleNavigation(item.href, e);
                        setSubPopover(null);
                        setPopover(null);
                      }}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          </div>
        </div>
      </div>
      {isNavigating && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3">
            <span className="inline-flex h-6 w-6 border-2 border-[var(--primary-600)] border-t-transparent rounded-full animate-spin" aria-hidden="true"></span>
            <span className="text-gray-700 font-medium">Carregando...</span>
          </div>
        </div>
      )}
    </PrivateRoute>
  );
}
