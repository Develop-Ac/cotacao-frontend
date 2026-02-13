"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Lottie from 'lottie-react';
import teamAcAnimation from '../../../public/team_AC_svg.json'; // Adjust path if necessary
import Image from 'next/image';
import logoCompleta from '../../../public/logo_completa.png'; // Adjust path if necessary

interface SplashScreenProps {
    isDataReady: boolean;
    onFinish: () => void;
}

type SplashStep = 'lottie' | 'logo' | 'hidden';

export default function SplashScreen({ isDataReady, onFinish }: SplashScreenProps) {
    const [step, setStep] = useState<SplashStep>('lottie');
    const [minTimeElapsed, setMinTimeElapsed] = useState(false);

    // Minimum display time for the Lottie animation (e.g., 2.5s)
    useEffect(() => {
        const timer = setTimeout(() => {
            setMinTimeElapsed(true);
        }, 2500);
        return () => clearTimeout(timer);
    }, []);

    // Transition from Lottie to Logo
    useEffect(() => {
        // Only proceed if minimum time passed AND data is ready
        if (step === 'lottie' && minTimeElapsed && isDataReady) {
            // Allow a small buffer for the Lottie exit animation if needed, 
            // or switch state immediately to trigger the exit transition.
            setStep('logo');
        }
    }, [step, minTimeElapsed, isDataReady]);

    // Transition from Logo to Finish
    useEffect(() => {
        if (step === 'logo') {
            const timer = setTimeout(() => {
                setStep('hidden');
                // Component will unmount after animation, triggering onExitComplete
            }, 1500); // Display logo for 1.5s
            return () => clearTimeout(timer);
        }
    }, [step]);

    return (
        <AnimatePresence onExitComplete={onFinish}>
            {step !== 'hidden' && (
                <motion.div
                    key="splash-overlay"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8, ease: "easeInOut" }}
                    className="fixed inset-0 z-[99999] flex items-center justify-center bg-gray-50 dark:bg-gray-900"
                >
                    <div className="relative flex items-center justify-center w-full h-full">

                        {/* Lottie Animation Stage */}
                        <AnimatePresence mode="wait">
                            {step === 'lottie' && (
                                <motion.div
                                    key="lottie-container"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
                                    transition={{ duration: 0.5 }}
                                    className="w-[300px] h-[300px] md:w-[500px] md:h-[500px]"
                                >
                                    <Lottie
                                        animationData={teamAcAnimation}
                                        loop={true}
                                        autoplay={true}
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Static Logo Stage */}
                        <AnimatePresence>
                            {step === 'logo' && (
                                <motion.div
                                    key="logo-container"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.8 }}
                                    className="absolute"
                                >
                                    <Image
                                        src={logoCompleta}
                                        alt="Logo Completa"
                                        width={300}
                                        height={100} // Adjust aspect ratio as needed based on the actual image
                                        className="w-[200px] md:w-[300px] h-auto object-contain"
                                        priority
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>

                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
