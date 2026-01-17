"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { FaCalendarAlt, FaChevronLeft, FaChevronRight, FaTimes } from "react-icons/fa";

interface DatePickerProps {
    value: string; // Formato YYYY-MM-DD
    onChange: (date: string) => void;
    placeholder?: string;
    className?: string;
    minDate?: string;
    maxDate?: string;
}

const DAYS_OF_WEEK = ["D", "S", "T", "Q", "Q", "S", "S"];
const MONTH_NAMES = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export default function DatePicker({
    value,
    onChange,
    placeholder = "Selecione uma data",
    className = "",
    minDate,
    maxDate
}: DatePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

    // Estado do calendário (mês/ano sendo visualizado)
    const [viewDate, setViewDate] = useState(new Date());

    useEffect(() => {
        if (value) {
            const [y, m, d] = value.split('-').map(Number);
            // Ajuste para garantir que a data seja interpretada corretamente no fuso local ou UTC
            // Criando data com hora 12:00 para evitar problemas de fuso
            setViewDate(new Date(y, m - 1, d, 12));
        }
    }, [isOpen, value]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node) &&
                !(event.target as Element).closest('.datepicker-dropdown-portal')
            ) {
                setIsOpen(false);
            }
        };

        const handleScroll = () => { if (isOpen) setIsOpen(false); };
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
                top: rect.bottom + window.scrollY + 4,
                left: rect.left + window.scrollX,
            });
        }
    };

    const toggleOpen = () => {
        if (!isOpen) updatePosition();
        setIsOpen(!isOpen);
    };

    // Lógica do Calendário
    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const currentYear = viewDate.getFullYear();
    const currentMonth = viewDate.getMonth();

    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

    const handlePrevMonth = (e: React.MouseEvent) => {
        e.stopPropagation();
        setViewDate(new Date(currentYear, currentMonth - 1, 1));
    };

    const handleNextMonth = (e: React.MouseEvent) => {
        e.stopPropagation();
        setViewDate(new Date(currentYear, currentMonth + 1, 1));
    };

    const handleSelectDay = (day: number) => {
        const m = (currentMonth + 1).toString().padStart(2, '0');
        const d = day.toString().padStart(2, '0');
        const dateStr = `${currentYear}-${m}-${d}`;
        onChange(dateStr);
        setIsOpen(false);
    };

    const clearDate = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange("");
    };

    const formatDateDisplay = (dateStr: string) => {
        if (!dateStr) return "";
        const [y, m, d] = dateStr.split('-');
        return `${d}/${m}/${y}`;
    };

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <div
                onClick={toggleOpen}
                className="h-11 px-3 rounded-lg border border-gray-300 dark:border-form-strokedark bg-white dark:bg-form-input text-black dark:text-white focus:ring-2 focus:ring-primary cursor-pointer flex items-center justify-between min-w-[150px] transition-all group"
            >
                <div className="flex items-center gap-2 truncate text-sm">
                    <FaCalendarAlt className="text-gray-400 group-hover:text-primary transition-colors" />
                    {value ? (
                        <span>{formatDateDisplay(value)}</span>
                    ) : (
                        <span className="text-gray-500 dark:text-gray-400">{placeholder}</span>
                    )}
                </div>
                {value && (
                    <button
                        onClick={clearDate}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                    >
                        <FaTimes size={12} />
                    </button>
                )}
            </div>

            {isOpen &&
                createPortal(
                    <div
                        className="datepicker-dropdown-portal fixed z-[9999] bg-white dark:bg-boxdark border border-gray-200 dark:border-strokedark rounded-xl shadow-xl p-4 w-[280px] animate-in fade-in zoom-in-95 duration-200 ease-out"
                        style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                            <button onClick={handlePrevMonth} className="p-1 hover:bg-gray-100 dark:hover:bg-meta-4 rounded-full transition-colors text-gray-600 dark:text-gray-300">
                                <FaChevronLeft size={14} />
                            </button>
                            <div className="font-semibold text-gray-800 dark:text-white">
                                {MONTH_NAMES[currentMonth]} {currentYear}
                            </div>
                            <button onClick={handleNextMonth} className="p-1 hover:bg-gray-100 dark:hover:bg-meta-4 rounded-full transition-colors text-gray-600 dark:text-gray-300">
                                <FaChevronRight size={14} />
                            </button>
                        </div>

                        {/* Days Grid */}
                        <div className="grid grid-cols-7 gap-1 mb-2">
                            {DAYS_OF_WEEK.map((d, i) => (
                                <div key={i} className="text-center text-xs font-medium text-gray-400">
                                    {d}
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-7 gap-1">
                            {Array.from({ length: firstDay }).map((_, i) => (
                                <div key={`empty-${i}`} />
                            ))}
                            {Array.from({ length: daysInMonth }).map((_, i) => {
                                const day = i + 1;
                                const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                                const isSelected = value === dateStr;
                                const isToday = new Date().toDateString() === new Date(currentYear, currentMonth, day).toDateString();

                                return (
                                    <button
                                        key={day}
                                        onClick={() => handleSelectDay(day)}
                                        className={`
                                            h-8 w-8 rounded-full text-sm flex items-center justify-center transition-all
                                            ${isSelected
                                                ? "bg-primary text-white font-bold shadow-md"
                                                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-meta-4"
                                            }
                                            ${isToday && !isSelected ? "border border-primary text-primary" : ""}
                                        `}
                                    >
                                        {day}
                                    </button>
                                );
                            })}
                        </div>
                    </div>,
                    document.body
                )}
        </div>
    );
}
