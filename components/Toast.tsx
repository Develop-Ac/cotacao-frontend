"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaTimes } from "react-icons/fa";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextData {
    addToast: (message: string, type: ToastType) => void;
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
    warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextData>({} as ToastContextData);

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts((state) => state.filter((toast) => toast.id !== id));
    }, []);

    const addToast = useCallback((message: string, type: ToastType) => {
        const id = Math.random().toString(36).substring(2, 9);
        const newToast = { id, message, type };

        setToasts((state) => [...state, newToast]);

        setTimeout(() => {
            removeToast(id);
        }, 4000); // Auto close after 4s
    }, [removeToast]);

    const success = useCallback((msg: string) => addToast(msg, "success"), [addToast]);
    const error = useCallback((msg: string) => addToast(msg, "error"), [addToast]);
    const info = useCallback((msg: string) => addToast(msg, "info"), [addToast]);
    const warning = useCallback((msg: string) => addToast(msg, "warning"), [addToast]);

    return (
        <ToastContext.Provider value={{ addToast, success, error, info, warning }}>
            {children}
            <div className="fixed bottom-4 right-4 z-[99999] flex flex-col gap-2 pointer-events-none">
                <AnimatePresence>
                    {toasts.map((toast) => (
                        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
    const icons = {
        success: <FaCheckCircle className="text-green-500" size={20} />,
        error: <FaExclamationCircle className="text-red-500" size={20} />,
        info: <FaInfoCircle className="text-blue-500" size={20} />,
        warning: <FaExclamationCircle className="text-yellow-500" size={20} />,
    };

    const bgColors = {
        success: "bg-white dark:bg-boxdark border-l-4 border-green-500",
        error: "bg-white dark:bg-boxdark border-l-4 border-red-500",
        info: "bg-white dark:bg-boxdark border-l-4 border-blue-500",
        warning: "bg-white dark:bg-boxdark border-l-4 border-yellow-500",
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className={`pointer-events-auto min-w-[300px] max-w-sm w-full shadow-lg rounded-lg p-4 flex items-start gap-3 border border-gray-100 dark:border-strokedark ${bgColors[toast.type]}`}
        >
            <div className="shrink-0 mt-0.5">{icons[toast.type]}</div>
            <div className="flex-1">
                <p className="text-sm font-medium text-black dark:text-white leading-tight">
                    {toast.message}
                </p>
            </div>
            <button
                onClick={() => onRemove(toast.id)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
                <FaTimes size={14} />
            </button>
        </motion.div>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return context;
}
