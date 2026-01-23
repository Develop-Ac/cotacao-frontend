"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { FaChevronDown, FaCheck } from "react-icons/fa";

interface Option {
    label: string;
    value: string | number;
}

interface SelectProps {
    options: Option[];
    value: string | number;
    onChange: (value: string | number) => void;
    placeholder?: string;
    className?: string;
    triggerClassName?: string;
    dropdownWidth?: number;
}

export default function Select({
    options,
    value,
    onChange,
    placeholder = "Selecione...",
    className = "",
    triggerClassName = "",
    dropdownWidth,
}: SelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
    const [searchTerm, setSearchTerm] = useState("");

    const filteredOptions = options.filter(option =>
        String(option.label).toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node) &&
                !(event.target as Element).closest('.select-dropdown-portal')
            ) {
                setIsOpen(false);
            }
        };

        const handleScroll = (event: Event) => {
            // Se o scroll ocorrer dentro do dropdown, não fecha
            if (
                event.target instanceof Element &&
                (event.target.classList.contains("select-dropdown-portal") ||
                    event.target.closest(".select-dropdown-portal"))
            ) {
                return;
            }
            if (isOpen) setIsOpen(false);
        };

        document.addEventListener("mousedown", handleClickOutside);
        window.addEventListener("scroll", handleScroll, true);
        window.addEventListener("resize", handleScroll);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            window.removeEventListener("scroll", handleScroll, true);
            window.removeEventListener("resize", handleScroll);
        };
    }, [isOpen]);

    const updatePosition = () => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setDropdownPosition({
                top: rect.bottom + window.scrollY + 4, // +4px margin
                left: rect.left + window.scrollX,
                width: dropdownWidth || rect.width,
            });
        }
    };

    const toggleOpen = () => {
        if (!isOpen) {
            updatePosition();
            setSearchTerm(""); // Reset search on open
        }
        setIsOpen(!isOpen);
    };

    const handleSelect = (optionValue: string | number) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    const selectedOption = options.find(o => o.value === value);

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <div
                onClick={toggleOpen}
                className={triggerClassName || "h-11 px-3 rounded-lg border border-gray-300 dark:border-form-strokedark bg-white dark:bg-form-input text-black dark:text-white focus:ring-2 focus:ring-primary cursor-pointer flex items-center justify-between min-w-[150px] transition-all"}
            >
                <div className="truncate mr-2 text-sm">
                    {selectedOption ? (
                        <span>{selectedOption.label}</span>
                    ) : (
                        <span className="text-gray-500 dark:text-gray-400">{placeholder}</span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <FaChevronDown
                        size={12}
                        className={`text-gray-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                    />
                </div>
            </div>

            {isOpen &&
                createPortal(
                    <div
                        className="select-dropdown-portal fixed z-[100000] bg-white dark:bg-boxdark border border-gray-200 dark:border-strokedark rounded-xl shadow-xl max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100 ease-out"
                        style={{
                            top: dropdownPosition.top,
                            left: dropdownPosition.left,
                            width: dropdownPosition.width,
                            minWidth: dropdownWidth ? undefined : '120px'
                        }}
                    >
                        {/* Search Input */}
                        {(options.length > 5 || true) && ( // Sempre mostrar por enquanto ou controlar via prop 'searchable'. Vou assumir searchable por padrão para UX melhor ou adicionar prop.
                            <div className="p-2 sticky top-0 bg-white dark:bg-boxdark z-10 border-b border-gray-100 dark:border-strokedark">
                                <input
                                    type="text"
                                    className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-strokedark rounded-md focus:ring-2 focus:ring-primary outline-none dark:bg-form-input dark:text-white"
                                    placeholder="Buscar..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    autoFocus
                                />
                            </div>
                        )}

                        {filteredOptions.length === 0 ? (
                            <div className="px-3 py-8 text-center text-sm text-gray-400">
                                Nenhum resultado.
                            </div>
                        ) : (
                            filteredOptions.map((option) => {
                                const isSelected = value === option.value;
                                return (
                                    <div
                                        key={option.value}
                                        onClick={() => handleSelect(option.value)}
                                        className={`
                                    px-3 py-2.5 text-sm cursor-pointer flex items-center justify-between
                                    hover:bg-gray-50 dark:hover:bg-meta-4 transition-colors
                                    ${isSelected ? "bg-blue-50 dark:bg-meta-4/50 text-primary font-medium" : "text-black dark:text-white"}
                                `}
                                    >
                                        <span>{option.label}</span>
                                        {isSelected && <FaCheck size={12} className="text-primary" />}
                                    </div>
                                );
                            })
                        )}
                    </div>,
                    document.body
                )}
        </div>
    );
}
