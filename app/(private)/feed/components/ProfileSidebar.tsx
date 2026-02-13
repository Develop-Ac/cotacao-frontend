"use client";

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MdPerson, MdEvent } from 'react-icons/md';
import { motion } from 'framer-motion';
import { useUser } from '@/app/context/UserContext';

export default function ProfileSidebar() {
    const { user } = useUser();
    const [imgError, setImgError] = useState(false);

    useEffect(() => {
        setImgError(false);
    }, [user?.avatar_url]);

    // If no user yet, we can either return null or a skeleton.
    // Returning null is fine for now as it matches previous behavior,
    // but effectively data should be there instantly if coming from localStorage.
    if (!user) return null;

    return (
        <aside className="hidden xl:flex flex-col gap-4 h-fit">
            {/* User Card */}
            <motion.div
                layoutId="profile-card-container"
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 flex flex-col items-center text-center"
            >
                <motion.div
                    layoutId="profile-avatar-container"
                    className="relative h-20 w-20 mb-4 rounded-full overflow-hidden border-4 border-gray-100 dark:border-gray-800"
                >
                    {user.avatar_url && !imgError ? (
                        <Image
                            src={user.avatar_url}
                            alt={user.nome || "Avatar"}
                            fill
                            className="object-cover"
                            onError={() => setImgError(true)}
                        />
                    ) : (
                        <div className="h-full w-full bg-blue-600 flex items-center justify-center text-3xl font-bold text-white">
                            {user.nome?.charAt(0).toUpperCase() || 'U'}
                        </div>
                    )}
                </motion.div>
                <motion.h3
                    layoutId="profile-name"
                    className="text-lg font-bold text-gray-900 dark:text-white mb-1"
                >
                    {user.nome || 'Usuário'}
                </motion.h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    {user.setor || 'Colaborador'}
                </p>

                <div className="w-full flex justify-center border-t border-gray-100 dark:border-gray-800 pt-4 px-4 text-center">
                    <div>
                        <span className="block text-lg font-bold text-gray-900 dark:text-white">
                            {user._count?.fed_posts || 0}
                        </span>
                        <span className="text-xs text-gray-500">Posts</span>
                    </div>
                </div>
            </motion.div>

            {/* Navigation Menu */}
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <nav className="flex flex-col gap-1">
                    <Link
                        href="/feed/profile"
                        className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800 transition-colors"
                    >
                        <MdPerson className="text-xl text-blue-500" />
                        Meu Perfil
                    </Link>
                    <Link
                        href="/events"
                        className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800 transition-colors"
                    >
                        <MdEvent className="text-xl text-yellow-500" />
                        Eventos
                    </Link>
                </nav>
            </div>
        </aside>
    );
}
