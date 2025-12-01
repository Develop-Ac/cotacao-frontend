import { MdChevronLeft, MdChevronRight } from 'react-icons/md';

export default function CalendarWidget() {
    const days = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
    // Mocking a specific month for visual consistency
    const currentMonth = 'Dezembro 2025';

    // Simple calendar grid generation (mocked for Dec 2025)
    // Dec 1st 2025 is a Monday. 31 days.
    const calendarDays = [
        { day: 30, prevMonth: true }, // Nov 30
        { day: 1, current: true },
        { day: 2, current: true },
        { day: 3, current: true },
        { day: 4, current: true },
        { day: 5, current: true },
        { day: 6, current: true },
        { day: 7, current: true },
        { day: 8, current: true },
        { day: 9, current: true },
        { day: 10, current: true },
        { day: 11, current: true },
        { day: 12, current: true, active: true }, // Today mocked
        { day: 13, current: true },
        { day: 14, current: true },
        { day: 15, current: true },
        { day: 16, current: true },
        { day: 17, current: true },
        { day: 18, current: true },
        { day: 19, current: true },
        { day: 20, current: true },
        { day: 21, current: true },
        { day: 22, current: true },
        { day: 23, current: true },
        { day: 24, current: true },
        { day: 25, current: true, event: true }, // Christmas
        { day: 26, current: true },
        { day: 27, current: true },
        { day: 28, current: true },
        { day: 29, current: true },
        { day: 30, current: true },
        { day: 31, current: true },
        { day: 1, nextMonth: true },
        { day: 2, nextMonth: true },
        { day: 3, nextMonth: true },
    ];

    return (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-gray-800 dark:text-white">
                    {currentMonth}
                </h4>
                <div className="flex gap-2">
                    <button className="p-1 hover:bg-gray-100 rounded-full dark:hover:bg-gray-800 transition-colors">
                        <MdChevronLeft className="text-xl text-gray-600 dark:text-gray-400" />
                    </button>
                    <button className="p-1 hover:bg-gray-100 rounded-full dark:hover:bg-gray-800 transition-colors">
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
                {calendarDays.map((date, index) => (
                    <div
                        key={index}
                        className={`
              h-8 w-8 flex items-center justify-center rounded-full text-sm cursor-pointer transition-all
              ${!date.current ? 'text-gray-300 dark:text-gray-600' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}
              ${date.active ? 'bg-blue-600 text-white hover:bg-blue-700 dark:hover:bg-blue-700 shadow-md' : ''}
              ${date.event && !date.active ? 'relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:rounded-full after:bg-blue-500' : ''}
            `}
                    >
                        {date.day}
                    </div>
                ))}
            </div>
        </div>
    );
}
