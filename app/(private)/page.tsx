"use client";
import { useState } from "react";

import Feed from "./feed/components/Feed";
import CalendarWidget from "./feed/components/CalendarWidget";
import EventsList from "./feed/components/EventsList";
import ProfileSidebar from "./feed/components/ProfileSidebar";

import { motion } from "framer-motion";

export default function Home() {
  const [currentDate, setCurrentDate] = useState(new Date());

  return (
    <div className="h-full w-full overflow-hidden bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-screen-2xl h-full px-4 md:px-6 2xl:px-10">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-4 xl:gap-8 h-full">

          {/* Left Column - Profile & Navigation (Fixed) */}
          <div className="hidden xl:block xl:col-span-1 h-full overflow-visible no-scrollbar py-4 md:py-6 2xl:py-10 relative z-50">
            <ProfileSidebar />
          </div>

          {/* Center Column - Feed (Scrollable) */}
          <div className="xl:col-span-2 h-full overflow-y-auto custom-scrollbar pb-20 px-1 pt-4 md:pt-6 2xl:pt-10">
            <Feed />
          </div>

          {/* Right Column - Widgets (Fixed) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
            className="hidden xl:flex flex-col gap-4 xl:gap-8 xl:col-span-1 h-full overflow-y-auto no-scrollbar py-4 md:py-6 2xl:py-10"
          >
            <CalendarWidget currentDate={currentDate} onMonthChange={setCurrentDate} />
            <EventsList currentDate={currentDate} />
          </motion.div>

        </div>
      </div>
    </div>
  );
}
