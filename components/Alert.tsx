import React from "react";
import { FaCheckCircle, FaExclamationCircle, FaExclamationTriangle, FaInfoCircle } from "react-icons/fa";

type AlertType = "success" | "error" | "warning" | "info";

interface AlertProps {
    type: AlertType;
    title?: string;
    message: string;
    className?: string;
}

const Alert: React.FC<AlertProps> = ({ type, title, message, className = "" }) => {
    const styles = {
        success: {
            container: "bg-green-50 border-green-500 text-green-900 dark:bg-green-900/20 dark:text-green-100",
            icon: "text-green-500",
            IconComponent: FaCheckCircle,
            defaultTitle: "Sucesso",
        },
        error: {
            container: "bg-red-50 border-red-500 text-red-900 dark:bg-red-900/20 dark:text-red-100",
            icon: "text-red-500",
            IconComponent: FaExclamationCircle,
            defaultTitle: "Erro",
        },
        warning: {
            container: "bg-yellow-50 border-yellow-500 text-yellow-900 dark:bg-yellow-900/20 dark:text-yellow-100",
            icon: "text-yellow-500",
            IconComponent: FaExclamationTriangle,
            defaultTitle: "Atenção",
        },
        info: {
            container: "bg-blue-50 border-blue-500 text-blue-900 dark:bg-blue-900/20 dark:text-blue-100",
            icon: "text-blue-500",
            IconComponent: FaInfoCircle,
            defaultTitle: "Informação",
        },
    };

    const currentStyle = styles[type];
    const Icon = currentStyle.IconComponent;

    return (
        <div
            className={`flex items-start gap-4 p-4 rounded-lg border border-l-4 ${currentStyle.container} ${className}`}
            role="alert"
        >
            <Icon className={`mt-0.5 text-xl shrink-0 ${currentStyle.icon}`} />
            <div>
                <h3 className="font-bold text-sm mb-1">
                    {title || currentStyle.defaultTitle}
                </h3>
                <p className="text-sm opacity-90">{message}</p>
            </div>
        </div>
    );
};

export default Alert;
