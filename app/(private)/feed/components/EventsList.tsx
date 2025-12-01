import { MdEvent, MdLocationOn, MdAccessTime } from 'react-icons/md';

const UPCOMING_EVENTS = [
    {
        id: 1,
        title: 'Happy Hour Trimestral',
        date: '12 Dez',
        time: '18:00',
        location: 'Área de Lazer',
        type: 'social',
    },
    {
        id: 2,
        title: 'Reunião Geral',
        date: '15 Dez',
        time: '09:00',
        location: 'Auditório Principal',
        type: 'work',
    },
    {
        id: 3,
        title: 'Festa de Fim de Ano',
        date: '20 Dez',
        time: '19:00',
        location: 'Salão de Festas',
        type: 'social',
    },
];

export default function EventsList() {
    return (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-gray-800 dark:text-white">
                    Próximos Eventos
                </h4>
                <button className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">
                    Ver todos
                </button>
            </div>

            <div className="flex flex-col gap-4">
                {UPCOMING_EVENTS.map((event) => (
                    <div key={event.id} className="flex items-start gap-3 group cursor-pointer">
                        <div className="flex flex-col items-center justify-center h-12 w-12 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 shrink-0">
                            <span className="text-xs font-bold uppercase">{event.date.split(' ')[1]}</span>
                            <span className="text-lg font-bold leading-none">{event.date.split(' ')[0]}</span>
                        </div>

                        <div className="flex-1">
                            <h5 className="font-medium text-gray-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {event.title}
                            </h5>
                            <div className="flex flex-col gap-1 mt-1">
                                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                    <MdAccessTime />
                                    <span>{event.time}</span>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                    <MdLocationOn />
                                    <span>{event.location}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
