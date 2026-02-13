'use client';

import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ImSpinner8 } from "react-icons/im";

function InnerTemplate({ children }: { children: React.ReactNode }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ease: 'easeOut', duration: 0.4 }}
            className="w-full min-h-full"
        >
            {children}
        </motion.div>
    );
}

export default function Template({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    return <InnerTemplate key={pathname}>{children}</InnerTemplate>;
}
