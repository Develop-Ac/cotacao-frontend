import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MdEvent, MdLocationOn, MdAccessTime, MdClose, MdDelete } from 'react-icons/md';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchEvents, deleteEvent } from '@/lib/api-feed';
import { Event } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EventsListProps {
    currentDate?: Date;
}

export default function EventsList({ currentDate = new Date() }: EventsListProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [events, setEvents] = useState<Event[]>([]);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        setMounted(true);
        loadEvents();

        // Check Admin
        try {
            const stored = localStorage.getItem('userData');
            if (stored) {
                const parsed = JSON.parse(stored);
                setIsAdmin(parsed.setor?.toLowerCase() === 'admin');
            }
        } catch (e) { }

        const handleRefresh = () => {
            console.log('Received events:updated, reloading in 500ms...');
            setTimeout(() => {
                loadEvents();
            }, 500);
        };
        window.addEventListener('events:updated', handleRefresh);
        return () => window.removeEventListener('events:updated', handleRefresh);
    }, []);

    const loadEvents = async () => {
        try {
            const data = await fetchEvents();
            setEvents(data);
        } catch (error) {
            console.error('Error loading events:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Deseja realmente excluir este evento?')) return;
        try {
            await deleteEvent(id);
            await loadEvents();
        } catch (error) {
            console.error('Error deleting event:', error);
            alert('Falha ao excluir evento');
        }
    };

    // Filter Logic
    const isValidHolidayType = (type?: string) => {
        if (!type) return false;
        const t = type.trim().toUpperCase();
        return ['NACIONAL', 'ESTADUAL', 'MUNICIPAL', 'FERIADO'].includes(t);
    };

    const filterEventByType = (e: Event) => {
        // If it's a holiday (ID starts with 'feriado-')
        if (e.id.toString().startsWith('feriado-')) {
            // Only allow National, State, Municipal
            return isValidHolidayType(e.tipo);
        }
        // User events are always shown
        return true;
    };

    // 1. Apply Type Filter Globaly
    const typeFilteredEvents = events.filter(filterEventByType);

    // 2. Apply Month Filter for the Widget View
    const widgetEvents = typeFilteredEvents.filter(e => {
        const eDate = new Date(e.data);
        // Use UTC components for offset-safe comparison
        return eDate.getUTCMonth() === currentDate.getMonth() &&
            eDate.getUTCFullYear() === currentDate.getFullYear();
    });

    // 3. Modal Events -> All Upcoming (Type Filtered)
    const modalEvents = typeFilteredEvents;

    return (
        <>
            {/* Placeholder Container that stays in the grid to maintain layout when expanded */}
            <div className={`flex flex-col flex-1 min-h-0 ${isExpanded ? 'invisible' : 'visible'}`}>
                <motion.div
                    layoutId="events-card"
                    className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 shadow-sm flex flex-col h-full overflow-hidden"
                >
                    <div className="p-5 flex flex-col h-full">
                        <div className="flex items-center justify-between mb-4 shrink-0">
                            <h4 className="text-lg font-semibold text-gray-800 dark:text-white">
                                Eventos do Mês
                            </h4>
                            <button
                                onClick={() => setIsExpanded(true)}
                                className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                            >
                                Ver todos
                            </button>
                        </div>

                        <div className="flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-2 flex-1">
                            <EventsContent events={widgetEvents} isAdmin={isAdmin} onDelete={handleDelete} />
                            {widgetEvents.length === 0 && <p className="text-xs text-gray-500 text-center">Nenhum evento este mês.</p>}
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Expanded Modal View - Portalled to Body to cover Sidebar/Header */}
            {mounted && createPortal(
                <AnimatePresence>
                    {isExpanded && (
                        <div className="fixed inset-0 z-[10000] flex items-center justify-center">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsExpanded(false)}
                                className="absolute inset-0 bg-black/50 backdrop-blur-sm" // Backdrop
                            />
                            <div className="relative z-10 w-full h-full flex items-center justify-center p-4 pointer-events-none">
                                <motion.div
                                    layoutId="events-card"
                                    className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden pointer-events-auto flex flex-col max-h-[80vh]"
                                >
                                    <div className="p-6 flex flex-col h-full min-h-0">
                                        <div className="flex items-center justify-between mb-6 shrink-0">
                                            <h4 className="text-2xl font-bold text-gray-800 dark:text-white">
                                                Todos os Próximos Eventos
                                            </h4>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setIsExpanded(false);
                                                }}
                                                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
                                            >
                                                <MdClose className="text-2xl" />
                                            </button>
                                        </div>

                                        <div className="flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-2 flex-1 min-h-0">
                                            <EventsContent events={modalEvents} isAdmin={isAdmin} onDelete={handleDelete} />
                                            {modalEvents.length === 0 && <p className="text-sm text-gray-500 text-center">Nenhum evento encontrado.</p>}
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </>
    );
}

function EventsContent({ events, isAdmin, onDelete }: { events: Event[], isAdmin: boolean, onDelete: (id: string) => void }) {
    return (
        <>
            {events.map((event, i) => {
                let dateObj = new Date(event.data);

                // Fix Date Display (UTC offset issue)
                // We create a date object that represents the UTC date in Local time for formatting correctly.
                dateObj = new Date(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate());

                const day = format(dateObj, 'dd', { locale: ptBR });
                const month = format(dateObj, 'MMM', { locale: ptBR }).toUpperCase();

                const getEventColors = (event: Event) => {
                    const type = event.tipo?.trim().toUpperCase() || '';
                    const id = event.id?.toString() || '';
                    if (['COMEMORATIVA', 'COMEMORATIVO'].includes(type)) return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
                    if (id.startsWith('feriado-') || ['NACIONAL', 'ESTADUAL', 'MUNICIPAL', 'FERIADO'].includes(type)) {
                        if (['PONTO FACULTATIVO'].includes(type)) return 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400';
                        return 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400';
                    }
                    return 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400';
                };
                const colorClass = getEventColors(event);

                return (
                    <div key={`${event.id}-${i}`} className="flex items-start gap-3 group p-2 rounded-lg transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <div className={`flex flex-col items-center justify-center h-12 w-12 rounded-lg shrink-0 ${colorClass}`}>
                            <span className="text-xs font-bold uppercase">{month}</span>
                            <span className="text-lg font-bold leading-none">{day}</span>
                        </div>

                        <div className="flex-1">
                            <div className="flex items-center justify-between">
                                <h5 className="font-medium text-gray-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                    {event.titulo}
                                </h5>
                                {isAdmin && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDelete(event.id);
                                        }}
                                        className="p-1 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                                        title="Excluir evento"
                                    >
                                        <MdDelete className="text-lg" />
                                    </button>
                                )}
                            </div>
                            <div className="flex flex-col gap-1 mt-1">
                                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                    <MdAccessTime />
                                    <span>{event.hora}</span>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                    <MdLocationOn />
                                    <span>{event.local}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </>
    );
}
