"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { FaChevronDown, FaCheck, FaTimes } from "react-icons/fa";

interface Option {
    label: string;
    value: string;
}

interface MultiSelectProps {
    options: Option[];
    value: string[];
    onChange: (value: string[]) => void;
    placeholder?: string;
    className?: string;
}

export default function MultiSelect({
    options,
    value,
    onChange,
    placeholder = "Selecione...",
    className = "",
}: MultiSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            // Check if click is inside the container or inside the portal dropdown
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node) &&
                !(event.target as Element).closest('.multi-select-dropdown-portal')
            ) {
                setIsOpen(false);
            }
        };

        const handleScroll = () => {
            if (isOpen) setIsOpen(false); // Close on scroll to avoid detached popup
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
                top: rect.bottom + window.scrollY,
                left: rect.left + window.scrollX,
                width: rect.width,
            });
        }
    };

    const toggleOpen = () => {
        if (!isOpen) {
            updatePosition();
        }
        setIsOpen(!isOpen);
    };

    const toggleOption = (optionValue: string) => {
        if (value.includes(optionValue)) {
            onChange(value.filter((v) => v !== optionValue));
        } else {
            onChange([...value, optionValue]);
        }
    };

    const clearSelection = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange([]);
    };

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <div
                onClick={toggleOpen}
                className="h-11 px-3 rounded-lg border border-gray-300 dark:border-form-strokedark bg-transparent dark:text-white focus:ring-2 focus:ring-primary cursor-pointer flex items-center justify-between min-w-[150px]"
            >
                <div className="truncate mr-2 text-sm">
                    {value.length === 0 ? (
                        <span className="text-gray-500 dark:text-gray-400">{placeholder}</span>
                    ) : value.length === options.length ? (
                        <span>Todos</span>
                    ) : (
                        <span>
                            {value.length} selecionado{value.length > 1 ? "s" : ""}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {value.length > 0 && (
                        <button
                            onClick={clearSelection}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        >
                            <FaTimes size={12} />
                        </button>
                    )}
                    <FaChevronDown
                        size={12}
                        className={`text-gray-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    />
                </div>
            </div>

            {isOpen &&
                createPortal(
                    <div
                        className="multi-select-dropdown-portal fixed z-[9999] bg-white dark:bg-boxdark border border-gray-200 dark:border-strokedark rounded-lg shadow-lg max-h-60 overflow-y-auto"
                        style={{
                            top: dropdownPosition.top,
                            left: dropdownPosition.left,
                            width: dropdownPosition.width,
                        }}
                    >
                        {options.map((option) => {
                            const isSelected = value.includes(option.value);
                            return (
                                <div
                                    key={option.value}
                                    onClick={() => toggleOption(option.value)}
                                    className={`
                                    px-3 py-2 text-sm cursor-pointer flex items-center justify-between
                                    hover:bg-gray-50 dark:hover:bg-meta-4 transition-colors
                                    ${isSelected ? "bg-blue-50 dark:bg-meta-4/50 text-primary" : "text-black dark:text-white"}
                                `}
                                >
                                    <span>{option.label}</span>
                                    {isSelected && <FaCheck size={12} className="text-primary" />}
                                </div>
                            );
                        })}
                    </div>,
                    document.body
                )}
        </div>
    );
}
