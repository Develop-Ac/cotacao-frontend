"use client";

import { useEffect, useState, useRef } from 'react';
import { MdChevronLeft, MdChevronRight, MdAccessTime, MdLocationOn } from 'react-icons/md';
import { fetchEvents } from '@/lib/api-feed';
import { Event } from '../types';
import { AnimatePresence, motion } from 'framer-motion';

interface CalendarWidgetProps {
    currentDate?: Date;
    onMonthChange?: (date: Date) => void;
}

export default function CalendarWidget({ currentDate = new Date(), onMonthChange }: CalendarWidgetProps) {
    const days = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
    // const [currDate, setCurrDate] = useState(new Date()); // Removed in favor of props
    const [events, setEvents] = useState<Event[]>([]);
    const [selectedDayEvents, setSelectedDayEvents] = useState<Event[]>([]);
    const [tooltipPos, setTooltipPos] = useState<{ top: number, left: number, align: 'left' | 'center' | 'right' } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const loadEvents = async () => {
        try {
            const data = await fetchEvents();
            setEvents(data);
        } catch (error) {
            console.error('Error loading events in calendar:', error);
        }
    };

    useEffect(() => {
        loadEvents();
        const handleRefresh = () => loadEvents();
        window.addEventListener('events:updated', handleRefresh);
        return () => window.removeEventListener('events:updated', handleRefresh);
    }, []);

    // Computed properties
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth(); // 0-11

    const monthNames = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    const currentMonthLabel = `${monthNames[month]} ${year}`;

    // Logic to generate calendar grid
    const getCalendarDays = () => {
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const lastDateOfMonth = new Date(year, month + 1, 0).getDate();
        const lastDateOfPrevMonth = new Date(year, month, 0).getDate();
        const lastDayOfLastDate = new Date(year, month, lastDateOfMonth).getDay();

        const grid = [];

        // Previous month
        for (let i = firstDayOfMonth; i > 0; i--) {
            grid.push({
                day: lastDateOfPrevMonth - i + 1,
                current: false,
                active: false,
                fullDate: new Date(year, month - 1, lastDateOfPrevMonth - i + 1)
            });
        }

        // Current month
        const today = new Date();
        for (let i = 1; i <= lastDateOfMonth; i++) {
            const isToday = i === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            const dateObj = new Date(year, month, i);

            // Check for events on this day
            const dayEvents = events.filter(e => {
                const eDate = new Date(e.data);

                // Fix for all events: They are often stored as UTC midnight (T00:00:00.000Z) or date-only strings.
                // In local access, standard new Date() shifts them to the previous day if the timezone is negative.
                // Using UTC components respects the stored date literal (e.g. 17/02 stays 17/02).
                return eDate.getUTCDate() === i && eDate.getUTCMonth() === month && eDate.getUTCFullYear() === year;
            });

            grid.push({
                day: i,
                current: true,
                active: isToday,
                hasEvents: dayEvents.length > 0,
                events: dayEvents,
                fullDate: dateObj
            });
        }

        // Next month
        for (let i = lastDayOfLastDate; i < 6; i++) {
            grid.push({
                day: i - lastDayOfLastDate + 1,
                current: false,
                active: false,
                fullDate: new Date(year, month + 1, i - lastDayOfLastDate + 1)
            });
        }

        return grid;
    };

    const calendarDays = getCalendarDays();

    const prevMonth = () => {
        onMonthChange?.(new Date(year, month - 1, 1));
        setTooltipPos(null);
    };

    const nextMonth = () => {
        onMonthChange?.(new Date(year, month + 1, 1));
        setTooltipPos(null);
    };

    const handleDayClick = (e: React.MouseEvent<HTMLDivElement>, date: any, index: number) => {
        if (date.hasEvents) {
            const el = e.currentTarget;

            // Calculate column index (0-6)
            const colIndex = index % 7;

            let align: 'left' | 'center' | 'right' = 'center';
            let leftPos = el.offsetLeft + el.offsetWidth / 2;

            if (colIndex < 2) {
                // Left alignment for first 2 columns
                align = 'left';
                leftPos = el.offsetLeft;
            } else if (colIndex > 4) {
                // Right alignment for last 2 columns
                align = 'right';
                // Calculate position based on the right edge of the element, but we'll use a different transform
                // actually, for 'right' alignment, we want the tooltip's right edge to align with the element's right edge
                // so we set left to (offsetLeft + offsetWidth) and transform translateX(-100%)
                leftPos = el.offsetLeft + el.offsetWidth;
            }

            setTooltipPos({
                top: el.offsetTop,
                left: leftPos,
                align
            });
            setSelectedDayEvents(date.events);
        } else {
            setTooltipPos(null);
        }
    };

    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return <div className="rounded-xl bg-white p-5 shadow h-[300px]"></div>;

    return (
        <div className="relative rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 shadow-sm" style={{ isolation: 'isolate' }}>
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-gray-800 dark:text-white capitalize">
                    {currentMonthLabel}
                </h4>
                <div className="flex gap-2">
                    <button
                        onClick={prevMonth}
                        className="p-1 hover:bg-gray-100 rounded-full dark:hover:bg-gray-800 transition-colors"
                    >
                        <MdChevronLeft className="text-xl text-gray-600 dark:text-gray-400" />
                    </button>
                    <button
                        onClick={nextMonth}
                        className="p-1 hover:bg-gray-100 rounded-full dark:hover:bg-gray-800 transition-colors"
                    >
                        <MdChevronRight className="text-xl text-gray-600 dark:text-gray-400" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-7 mb-2">
                {days.map((day, index) => (
                    <div key={index} className="text-center text-xs font-medium text-gray-400 py-1">
                        {day}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((date, index) => {
                    // Determine dominant event type for styling
                    let bgClass = '';
                    let dotClass = '';
                    let textClass = '';

                    if (date.hasEvents && !date.active) {
                        const hasHoliday = date.events.some(e => ['NACIONAL', 'ESTADUAL', 'MUNICIPAL', 'FERIADO'].includes(e.tipo?.trim().toUpperCase()));
                        const hasOptionalHoliday = date.events.some(e => ['PONTO FACULTATIVO'].includes(e.tipo?.trim().toUpperCase()));
                        const hasCommemorative = date.events.some(e => ['COMEMORATIVA', 'COMEMORATIVO'].includes(e.tipo?.trim().toUpperCase()));

                        // Check if there are any events that are NOT in the special categories (i.e., User Events)
                        const hasUserEvent = date.events.some(e => {
                            const type = e.tipo?.trim().toUpperCase();
                            return !['NACIONAL', 'ESTADUAL', 'MUNICIPAL', 'FERIADO', 'PONTO FACULTATIVO', 'COMEMORATIVA', 'COMEMORATIVO'].includes(type);
                        });

                        if (hasUserEvent) {
                            // Amber for regular/user events (Highest Priority)
                            bgClass = 'bg-amber-100 dark:bg-amber-900/30';
                            textClass = 'text-amber-700 dark:text-amber-400 font-bold';
                            dotClass = 'bg-amber-500';
                        } else if (hasHoliday) {
                            // Green for Holidays
                            bgClass = 'bg-green-100 dark:bg-green-900/30';
                            textClass = 'text-green-700 dark:text-green-400 font-bold';
                            dotClass = 'bg-green-500';
                        } else if (hasOptionalHoliday) {
                            // Blue for Optional Holidays (Ponto Facultativo)
                            bgClass = 'bg-blue-100 dark:bg-blue-900/30';
                            textClass = 'text-blue-700 dark:text-blue-400 font-bold';
                            dotClass = 'bg-blue-500';
                        } else if (hasCommemorative) {
                            // Gray for Commemorative
                            bgClass = 'bg-gray-200 dark:bg-gray-700/50';
                            textClass = 'text-gray-700 dark:text-gray-300 font-bold';
                            dotClass = 'bg-gray-500';
                        }
                    }

                    return (
                        <div
                            key={index}
                            onClick={(e) => handleDayClick(e, date, index)}
                            className={`
                                relative h-8 w-8 flex items-center justify-center rounded-full text-sm cursor-pointer transition-all
                                ${!date.current ? 'text-gray-300 dark:text-gray-600 cursor-default' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}
                                ${date.active ? 'bg-blue-600 !text-white hover:bg-blue-700 shadow-md ring-2 ring-blue-100 dark:ring-blue-900/40' : ''}
                                ${(!date.active && date.hasEvents) ? `${bgClass} ${textClass}` : ''}
                            `}
                        >
                            {date.day}
                            {date.hasEvents && !date.active && (
                                <span className={`absolute bottom-1 h-1 w-1 rounded-full ${dotClass}`}></span>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Event Balloon - Tooltip */}
            <AnimatePresence>
                {tooltipPos && (
                    <>
                        <div
                            className="fixed inset-0 z-[10]"
                            onClick={() => setTooltipPos(null)}
                        />

                        {/* Determine transform values based on alignment */}
                        {(() => {
                            const xValue = tooltipPos.align === 'left'
                                ? "0%"
                                : tooltipPos.align === 'right'
                                    ? "-100%"
                                    : "-50%";

                            return (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9, y: "calc(-100% + 10px)", x: xValue }}
                                    animate={{ opacity: 1, scale: 1, y: "-100%", x: xValue }}
                                    exit={{ opacity: 0, scale: 0.9, y: "calc(-100% + 10px)", x: xValue }}
                                    style={{
                                        position: 'absolute',
                                        top: tooltipPos.top - 10,
                                        left: tooltipPos.left,
                                    }}
                                    className="z-[20] w-64 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 p-4 pointer-events-auto"
                                >
                                    <div className="flex flex-col gap-3">
                                        {selectedDayEvents.map((event, i) => (
                                            <div key={event.id} className={i > 0 ? 'border-t border-gray-100 dark:border-gray-700 pt-3' : ''}>
                                                <p className="text-sm font-bold text-gray-800 dark:text-white leading-tight">
                                                    {event.titulo}
                                                </p>
                                                <div className="flex items-center gap-2 mt-2">
                                                    {/* Hide time for holidays and special dates */
                                                        !['NACIONAL', 'ESTADUAL', 'MUNICIPAL', 'FERIADO', 'PONTO FACULTATIVO', 'COMEMORATIVA', 'COMEMORATIVO'].includes(event.tipo?.trim().toUpperCase()) && (
                                                            <div className="flex items-center gap-1 text-xs text-amber-500 font-medium">
                                                                <MdAccessTime className="text-sm" /> {event.hora}
                                                            </div>
                                                        )}
                                                    <div className="flex items-center gap-1 text-xs text-gray-400">
                                                        <MdLocationOn className="text-sm" /> {event.local}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            );
                        })()}
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
