import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { MdChevronRight } from "react-icons/md";
import { motion, AnimatePresence, Variants } from "framer-motion";

interface SubmenuItem {
    label: string;
    href: string;
}

interface SidebarMenuItemProps {
    label: string;
    icon: React.ElementType;
    isActive: boolean;
    isCollapsed: boolean;
    submenus: SubmenuItem[];
    onNavigate: (href: string, e: any) => void;
    isPathActive: (path: string) => boolean;
    pathname: string;
}

export default function SidebarMenuItem({
    label,
    icon: Icon,
    isActive,
    isCollapsed,
    submenus,
    onNavigate,
    isPathActive,
    pathname
}: SidebarMenuItemProps) {
    const [isOpen, setIsOpen] = useState(isActive);

    useEffect(() => {
        if (isActive) setIsOpen(true);
    }, [isActive]);

    function handleToggle(e: React.MouseEvent) {
        e.preventDefault();
        setIsOpen(!isOpen);
    }

    const containerVariants: Variants = {
        hidden: {
            height: 0,
            opacity: 0,
            transition: {
                duration: 0.2,
                ease: "easeInOut"
            }
        },
        visible: {
            height: "auto",
            opacity: 1,
            transition: {
                duration: 0.3,
                ease: "easeOut",
                staggerChildren: 0.05
            }
        }
    };

    const itemVariants: Variants = {
        hidden: { x: -10, opacity: 0 },
        visible: { x: 0, opacity: 1 }
    };

    return (
        <li className="relative group">
            <div
                onClick={handleToggle}
                className={`menu-item group cursor-pointer ${isActive ? 'menu-item-active' : 'menu-item-inactive'}`}
            >
                <div className="min-w-[24px]">
                    <Icon className="text-2xl" />
                </div>
                <span className={`menu-item-text whitespace-nowrap overflow-hidden transition-all duration-300 ${isCollapsed ? 'max-w-0 opacity-0 ml-0' : 'max-w-[200px] opacity-100 ml-3'}`}>
                    {label}
                </span>
                <MdChevronRight className={`menu-item-arrow ml-auto transition-all duration-300 ${isOpen ? 'rotate-90' : ''} ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`} />
            </div>

            <AnimatePresence initial={false}>
                {isOpen && !isCollapsed && (
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        className="overflow-hidden"
                    >
                        <ul className="flex flex-col gap-1 mt-2 menu-dropdown pl-9">
                            {submenus.map((item) => {
                                const isMatch = item.href === pathname || pathname.startsWith(item.href + '/');
                                const hasBetterMatch = submenus.some(other =>
                                    other.href !== item.href &&
                                    other.href.length > item.href.length &&
                                    (other.href === pathname || pathname.startsWith(other.href + '/'))
                                );
                                const isActiveItem = isMatch && !hasBetterMatch;

                                return (
                                    <motion.li key={item.href} variants={itemVariants}>
                                        <Link
                                            href={item.href}
                                            onClick={(e) => onNavigate(item.href, e)}
                                            className={`menu-dropdown-item ${isActiveItem ? 'menu-dropdown-item-active' : 'menu-dropdown-item-inactive'}`}
                                        >
                                            {item.label}
                                        </Link>
                                    </motion.li>
                                );
                            })}
                        </ul>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Floating Menu for Collapsed State */}
            {isCollapsed && (
                <div className="absolute left-full top-0 ml-3 w-48 bg-gray-800 border border-gray-700 rounded-md shadow-lg p-2 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-300 z-50 translate-x-[-10px] group-hover:translate-x-0">
                    <div className="font-bold px-3 py-2 border-b border-gray-700 mb-1 text-gray-200">
                        {label}
                    </div>
                    <ul className="flex flex-col gap-1">
                        {submenus.map((item) => {
                            const isMatch = item.href === pathname || pathname.startsWith(item.href + '/');
                            const hasBetterMatch = submenus.some(other =>
                                other.href !== item.href &&
                                other.href.length > item.href.length &&
                                (other.href === pathname || pathname.startsWith(other.href + '/'))
                            );
                            const isActiveItem = isMatch && !hasBetterMatch;

                            return (
                                <li key={item.href}>
                                    <Link
                                        href={item.href}
                                        onClick={(e) => onNavigate(item.href, e)}
                                        className={`block px-3 py-2 rounded-md text-sm ${isActiveItem
                                            ? 'bg-brand-500/[0.12] text-brand-400'
                                            : 'text-gray-400 hover:bg-gray-700'
                                            }`}
                                    >
                                        {item.label}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </li>
    );
}
