"use client";

import React from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import errorAnimation from '../../public/Error_403_Page.json';

// Dynamically import Lottie to avoid SSR issues
const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

export default function Forbidden() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
            <div className="w-full max-w-md mb-8">
                <Lottie
                    animationData={errorAnimation}
                    loop={true}
                    autoplay={true}
                    style={{ width: '100%', height: 'auto' }}
                />
            </div>

            <div className="text-center">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">403 – Acesso Negado</h1>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                    Você não tem permissão para acessar esta página.
                </p>
                <Link
                    href="/"
                    className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
                >
                    Voltar para a página inicial
                </Link>
            </div>
        </div>
    );
}