"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { MdKeyboardArrowDown, MdOutlinePerson, MdOutlineSettings, MdPowerSettingsNew, MdDarkMode, MdLightMode } from "react-icons/md";

interface ProfileDropdownProps {
    userData: any;
    onLogout: () => void;
}

export default function ProfileDropdown({ userData, onLogout }: ProfileDropdownProps) {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const trigger = useRef<any>(null);
    const dropdown = useRef<any>(null);
    const [imgError, setImgError] = useState(false);
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setImgError(false); // Reset error state when userData changes
    }, [userData?.avatar]);

    useEffect(() => {
        const timer = setTimeout(() => setMounted(true), 0);
        return () => clearTimeout(timer);
    }, []);

    // Close on click outside
    useEffect(() => {
        const clickHandler = ({ target }: MouseEvent) => {
            if (!dropdown.current) return;
            if (
                !dropdownOpen ||
                dropdown.current.contains(target) ||
                trigger.current.contains(target)
            )
                return;
            setDropdownOpen(false);
        };
        document.addEventListener("click", clickHandler);
        return () => document.removeEventListener("click", clickHandler);
    }, [dropdownOpen]);

    // Close if the esc key is pressed
    useEffect(() => {
        const keyHandler = ({ keyCode }: KeyboardEvent) => {
            if (!dropdownOpen || keyCode !== 27) return;
            setDropdownOpen(false);
        };
        document.addEventListener("keydown", keyHandler);
        return () => document.removeEventListener("keydown", keyHandler);
    }, [dropdownOpen]);

    return (
        <div className="relative">
            <Link
                ref={trigger}
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-4"
                href="#"
            >
                <span className="hidden text-right lg:block">
                    <span className="block text-sm font-medium text-white">
                        {userData?.usuario?.split(' ')[0] || 'Usuário'}
                    </span>
                    <span className="block text-xs font-medium text-gray-400">
                        {userData?.setor || 'Setor'}
                    </span>
                </span>

                <div className="h-11 w-11 rounded-full overflow-hidden bg-gray-700 flex items-center justify-center text-xl font-bold text-white border border-gray-600 relative">
                    {userData?.avatar && !imgError ? (
                        <img
                            src={userData.avatar}
                            alt={userData?.usuario || 'U'}
                            className="h-full w-full object-cover"
                            onError={() => setImgError(true)}
                        />
                    ) : (
                        userData?.usuario?.charAt(0) || 'U'
                    )}
                </div>

                <MdKeyboardArrowDown className={`hidden text-xl sm:block transition-transform duration-200 text-gray-400 ${dropdownOpen ? 'rotate-180' : ''}`} />
            </Link>

            {/* Dropdown Start */}
            <div
                ref={dropdown}
                onFocus={() => setDropdownOpen(true)}
                onBlur={() => setDropdownOpen(false)}
                className={`absolute right-0 mt-4 flex w-[260px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-800 dark:bg-gray-900 transition-all duration-200 ease-in-out transform origin-top-right ${dropdownOpen
                    ? "opacity-100 scale-100 visible translate-y-0"
                    : "opacity-0 scale-95 invisible -translate-y-2"
                    }`}
            >
                <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-800 mb-2">
                    <span className="block text-sm font-medium text-gray-800 dark:text-white">
                        {userData?.usuario || 'Usuário'}
                    </span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400">
                        {userData?.email || userData?.setor || 'email@exemplo.com'}
                    </span>
                </div>

                <ul className="flex flex-col gap-1">
                    <li>
                        <Link
                            href="/feed/profile"
                            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                        >
                            <MdOutlinePerson className="text-lg" />
                            Meu Perfil
                        </Link>
                    </li>
                    {/* <li>
                        <Link
                            href="#"
                            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                        >
                            <MdOutlineSettings className="text-lg" />
                            Configurações
                        </Link>
                    </li> */}
                    {mounted && (
                        <li>
                            <button
                                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                            >
                                {theme === 'dark' ? <MdLightMode className="text-lg" /> : <MdDarkMode className="text-lg" />}
                                Alternar Tema
                            </button>
                        </li>
                    )}
                </ul>
                <div className="border-t border-gray-200 dark:border-gray-800 mt-2 pt-2">
                    <button
                        onClick={onLogout}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                    >
                        <MdPowerSettingsNew className="text-lg" />
                        Sair
                    </button>
                </div>
            </div>
            {/* Dropdown End */}
        </div>
    );
}
