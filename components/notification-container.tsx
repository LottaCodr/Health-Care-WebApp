/**
 * Notification System Component
 * Displays notifications from the store
 */

"use client";

import { useEffect } from "react";
// import { useNotificationStore } from "@/store/store";
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from "lucide-react";

interface NotificationItemProps {
    id: string;
    type: "success" | "error" | "warning" | "info";
    message: string;
    duration?: number;
    onClose: (id: string) => void;
}

function NotificationItem({
    id,
    type,
    message,
    duration = 3000,
    onClose,
}: NotificationItemProps) {
    useEffect(() => {
        if (duration) {
            const timer = setTimeout(() => onClose(id), duration);
            return () => clearTimeout(timer);
        }
    }, [id, duration, onClose]);

    const colors = {
        success: "bg-green-50 border-green-200 text-green-800",
        error: "bg-red-50 border-red-200 text-red-800",
        warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
        info: "bg-blue-50 border-blue-200 text-blue-800",
    };

    const icons = {
        success: <CheckCircle className="h-5 w-5 text-green-500" />,
        error: <AlertCircle className="h-5 w-5 text-red-500" />,
        warning: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
        info: <Info className="h-5 w-5 text-blue-500" />,
    };

    return (
        <div
            className={`flex items-start gap-3 p-4 rounded-lg border ${colors[type]} animate-in slide-in-from-top fade-in duration-300`}
            role="alert"
        >
            <div className="flex-shrink-0">{icons[type]}</div>
            <div className="flex-1">
                <p className="font-medium">{message}</p>
            </div>
            <button
                onClick={() => onClose(id)}
                className="flex-shrink-0 ml-2 inline-flex text-current opacity-70 hover:opacity-100"
                aria-label="Close notification"
            >
                <X className="h-5 w-5" />
            </button>
        </div>
    );
}

/**
 * Notification Container Component
 * Should be placed near root of app
 */
export function NotificationContainer() {
    return null;
    // TODO: Re-enable when store is fixed
    /* const { notifications, removeNotification } = useNotificationStore();

    if (notifications.length === 0) return null;

    return (
        <div
            className="fixed top-4 right-4 z-50 space-y-2 max-w-sm"
            aria-live="polite"
            aria-atomic="true"
        >
            {notifications.map((notification) => (
                <NotificationItem
                    key={notification.id}
                    {...notification}
                    onClose={removeNotification}
                />
            ))}
        </div>
    );
    */
}
