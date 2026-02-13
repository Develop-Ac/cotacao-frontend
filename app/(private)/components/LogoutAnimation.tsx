"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Lottie from 'lottie-react';
import carAnimation from '../../../public/blue_Car.json';

interface LogoutAnimationProps {
    onComplete: () => void;
}

export default function LogoutAnimation({ onComplete }: LogoutAnimationProps) {
    const [moveLeft, setMoveLeft] = useState(false);

    useEffect(() => {
        // Start moving left after a delay
        const timer = setTimeout(() => {
            setMoveLeft(true);
        }, 2000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <motion.div
                initial={{ opacity: 0, scale: 0.8, x: 0 }}
                animate={{
                    opacity: 1,
                    scale: 1,
                    x: moveLeft ? "-100vw" : 0
                }}
                transition={{
                    opacity: { duration: 0.5 },
                    scale: { duration: 0.5 },
                    x: { duration: 1.5, ease: "easeInOut" } // Drive off
                }}
                onAnimationComplete={() => {
                    if (moveLeft) {
                        onComplete();
                    }
                }}
                className="w-[300px] h-[300px] md:w-[500px] md:h-[500px]"
            >
                <Lottie
                    animationData={carAnimation}
                    loop={true}
                    autoplay={true}
                />
            </motion.div>
        </div>
    );
}
