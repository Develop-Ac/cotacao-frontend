"use client";

import Feed from "./feed/components/Feed";
import CalendarWidget from "./feed/components/CalendarWidget";
import EventsList from "./feed/components/EventsList";

export default function Home() {
  return (
    <div className="flex items-center justify-center h-[calc(100vh-180px)]">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-4">
          Bem-vindo à Intranet
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Selecione uma opção no menu lateral para começar.
        </p>
      </div>
    </div>
  );
}

