"use client";

import "react-datepicker/dist/react-datepicker.css";
import DatePicker, { registerLocale } from "react-datepicker";
import { ptBR } from "date-fns/locale";
import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { FaCalendarAlt } from "react-icons/fa";

// Registra o locale pt-BR
registerLocale("pt-BR", ptBR);

interface AnimatedDatePickerProps {
    value: string; // Espera formato YYYY-MM-DD
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

export default function AnimatedDatePicker({ value, onChange, placeholder = "Selecione a data...", className = "" }: AnimatedDatePickerProps) {
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [inputValue, setInputValue] = useState("");

    // Sincroniza o valor externo (string) com o estado interno (Date e Input)
    useEffect(() => {
        if (value) {
            // Split para evitar problemas de timezone com new Date("YYYY-MM-DD")
            const [y, m, d] = value.split('-').map(Number);
            if (y && m && d) {
                const date = new Date(y, m - 1, d, 12, 0, 0);
                setSelectedDate(date);
                // Formata para exibição no input (dd/mm/yyyy) se a data for válida
                const dayStr = String(d).padStart(2, '0');
                const monthStr = String(m).padStart(2, '0');
                setInputValue(`${dayStr}/${monthStr}/${y}`);
            } else {
                setSelectedDate(null);
                setInputValue("");
            }
        } else {
            setSelectedDate(null);
            // Se value for limpo externamente, limpamos o input também
            setInputValue("");
        }
    }, [value]);

    const parseDate = (input: string): Date | null => {
        // Remove caracteres não numéricos
        const clean = input.replace(/\D/g, '');
        const today = new Date();
        const currentYear = today.getFullYear();

        let day: number, month: number, year: number | null = null;

        // Tenta interpretar os formatos
        if (clean.length === 4) {
            // DDMM (Assume ano atual)
            day = parseInt(clean.substring(0, 2), 10);
            month = parseInt(clean.substring(2, 4), 10);
            year = currentYear;
        } else if (clean.length === 6) {
            // DDMMAA
            day = parseInt(clean.substring(0, 2), 10);
            month = parseInt(clean.substring(2, 4), 10);
            const shortYear = parseInt(clean.substring(4, 6), 10);
            year = 2000 + shortYear; // Assume século 21
        } else if (clean.length === 8) {
            // DDMMAAAA
            day = parseInt(clean.substring(0, 2), 10);
            month = parseInt(clean.substring(2, 4), 10);
            year = parseInt(clean.substring(4, 8), 10);
        } else {
            // Se tiver separadores como DD/MM
            const parts = input.split(/[\/\-.]/);
            if (parts.length >= 2) {
                day = parseInt(parts[0], 10);
                month = parseInt(parts[1], 10);
                if (parts.length === 3 && parts[2].length > 0) {
                    const yPart = parts[2];
                    if (yPart.length === 2) year = 2000 + parseInt(yPart, 10);
                    else if (yPart.length === 4) year = parseInt(yPart, 10);
                    else year = currentYear;
                } else {
                    year = currentYear;
                }
            } else {
                return null;
            }
        }

        // Verifica validade básica
        if (!day || !month || !year) return null;
        if (month < 1 || month > 12) return null;
        if (day < 1 || day > 31) return null;

        // Retorna data ao meio-dia
        return new Date(year, month - 1, day, 12, 0, 0);
    };

    const handleChange = (date: Date | null) => {
        setSelectedDate(date);

        if (date) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            onChange(`${year}-${month}-${day}`);
            // Atualiza input com formato padrão
            setInputValue(`${day}/${month}/${year}`);
        } else {
            onChange("");
        }
    };

    // Função para interceptar mudanças no input (digitação)
    // AQUI APENAS ATUALIZAMOS O ESTADO LOCAL DO INPUT, SEM PARSEAR/VALIDAR AINDA
    const handleRawChange = (e?: React.FocusEvent<HTMLInputElement> | React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>) => {
        if (!e || !e.target) return;
        if (!('value' in e.target)) return;

        const val = (e.target as HTMLInputElement).value;
        setInputValue(val); // Permite digitação livre sem interferência
    };

    // Função que efetivamente valida e propaga a mudança para o pai
    // Deve ser chamada no ONBLUR ou ENTER
    const commitDate = (val: string) => {
        const parsed = parseDate(val);
        if (parsed && !isNaN(parsed.getTime())) {
            setSelectedDate(parsed);
            const year = parsed.getFullYear();
            const month = String(parsed.getMonth() + 1).padStart(2, '0');
            const day = String(parsed.getDate()).padStart(2, '0');

            // Atualiza pai
            onChange(`${year}-${month}-${day}`);
            // Formata input para ficar bonitinho
            setInputValue(`${day}/${month}/${year}`);
        } else {
            // Se inválido, mantemos o texto que o usuário digitou ou limpamos? 
            // Geralmente mantemos para ele corrigir.
            // Mas se estiver vazio, passamos vazio pro pai.
            if (!val.trim()) {
                onChange("");
                setSelectedDate(null);
            }
        }
    };

    const handleBlur = () => {
        commitDate(inputValue);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // Evita submit de form se houver
            commitDate(inputValue);
            // Opcional: fechar o calendário se estiver aberto (blur resolve isso nativamente as vezes)
            if (e.target instanceof HTMLInputElement) {
                e.target.blur();
            }
        }
    };

    return (
        <div className={`relative ${className} group`}>
            {/* Ícone posicionado absolutamente dentro do input wrapper */}
            <div className="relative w-full">
                <DatePicker
                    selected={selectedDate}
                    onChange={handleChange}
                    onChangeRaw={handleRawChange}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    value={inputValue} // Controla o texto do input
                    dateFormat={["dd/MM/yyyy", "ddMMyyyy"]}
                    locale="pt-BR"
                    placeholderText={placeholder}
                    className="w-full h-10 pl-10 pr-4 rounded-lg border border-gray-300 dark:border-strokedark bg-white dark:bg-form-input text-gray-700 dark:text-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all duration-300 shadow-sm hover:shadow-md"
                    // Permitir auto-complete e digitação
                    isClearable={!!value}
                    showPopperArrow={false}
                    popperPlacement="bottom-start"
                    // Estilização do container do calendário via classe customizada
                    calendarClassName="animated-datepicker-calendar !border-none !shadow-2xl !rounded-xl !font-sans overflow-hidden"
                    wrapperClassName="w-full"
                    popperClassName="animated-datepicker-popper"
                    dayClassName={(date) => "hover:!bg-primary hover:!text-white rounded-full transition-colors duration-200"}

                    // CORREÇÃO: Portal para evitar corte por overflow:hidden
                    popperContainer={({ children }) => {
                        // Verifica se window existe (SSR safety)
                        if (typeof window === 'undefined') return null;
                        return document.body ? ReactDOM.createPortal(children, document.body) : null;
                    }}
                />

                {/* Ícone de Calendário com animação sutil no hover do grupo */}
                <FaCalendarAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-hover:text-primary transition-colors duration-300 pointer-events-none" />
            </div>

            {/* Estilos Globais/Locais para customizar o React Datepicker */}
            <style jsx global>{`
                /* Animação de entrada do Popper */
                .animated-datepicker-popper {
                    z-index: 100 !important; /* Menor que o Header (999) para passar por baixo ao rolar */
                    padding-top: 10px !important; /* Reduzido pois o portal já posiciona */
                }

                @keyframes fadeInScale {
                    from {
                        opacity: 0;
                        transform: scale(0.95) translateY(-20px);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1) translateY(0);
                    }
                }

                /* Header do calendário */
                .animated-datepicker-calendar .react-datepicker__header {
                    background-color: #fff;
                    border-bottom: 1px solid #f3f4f6;
                    padding-top: 10px;
                }
                .dark .animated-datepicker-calendar .react-datepicker__header {
                    background-color: #1a222c; /* boxdark */
                    border-bottom: 1px solid #2e3a47;
                }

                /* Fundo e texto do calendário */
                .animated-datepicker-calendar {
                    background-color: #fff;
                    font-family: inherit;
                    color: #374151;
                    animation: fadeInScale 0.2s ease-out forwards;
                    transform-origin: top left;
                }
                .dark .animated-datepicker-calendar {
                    background-color: #1a222c; /* boxdark */
                    color: #fff;
                }

                /* Dias e nomes */
                .dark .react-datepicker__day-name, 
                .dark .react-datepicker__day, 
                .dark .react-datepicker__time-name {
                    color: #d1d5db;
                }
                .dark .react-datepicker__day:hover {
                    color: white;
                }
                .dark .react-datepicker__current-month {
                    color: white;
                    margin-bottom: 5px;
                }

                /* Dia selecionado */
                .react-datepicker__day--selected, 
                .react-datepicker__day--keyboard-selected {
                    background-color: #3C50E0 !important; /* primary */
                    color: white !important;
                    font-weight: bold;
                }

                /* Hoje */
                .react-datepicker__day--today {
                    font-weight: bold;
                    color: #3C50E0;
                }
                .dark .react-datepicker__day--today {
                    color: #8090ef; /* primary lighten */
                }

                /* Navegação */
                .react-datepicker__navigation-icon::before {
                    border-color: #6b7280;
                }
                .dark .react-datepicker__navigation-icon::before {
                    border-color: #9ca3af;
                }
            `}</style>
        </div>
    );
}
