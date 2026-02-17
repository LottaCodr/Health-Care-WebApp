"use client";

import { useState, useEffect } from "react";
import { useRealtimeSubscriptions } from "@/lib/realtime-subscriptions";
import { PatientStatus } from "@/types/models";
import { Bell, AlertCircle } from "lucide-react";

interface ActivityNotification {
    id: string;
    type: "patient_update" | "lab_complete" | "prescription_dispensed" | "payment_complete";
    title: string;
    message: string;
    timestamp: Date;
    read: boolean;
}

export function ActivityNotificationCenter() {
    const [notifications, setNotifications] = useState<ActivityNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showPanel, setShowPanel] = useState(false);

    const handlePatientStatusChange = (patientId: string, newStatus: PatientStatus) => {
        const notification: ActivityNotification = {
            id: `patient-${patientId}`,
            type: "patient_update",
            title: "Patient Status Updated",
            message: `Patient ${patientId} status changed to ${newStatus}`,
            timestamp: new Date(),
            read: false,
        };
        addNotification(notification);
    };

    const handleLabRequestUpdate = (requestId: string) => {
        const notification: ActivityNotification = {
            id: `lab-${requestId}`,
            type: "lab_complete",
            title: "Lab Test Completed",
            message: `Lab test ${requestId} results submitted`,
            timestamp: new Date(),
            read: false,
        };
        addNotification(notification);
    };

    const handlePrescriptionDispensed = (prescriptionId: string) => {
        const notification: ActivityNotification = {
            id: `prescription-${prescriptionId}`,
            type: "prescription_dispensed",
            title: "Prescription Dispensed",
            message: `Prescription ${prescriptionId} has been dispensed`,
            timestamp: new Date(),
            read: false,
        };
        addNotification(notification);
    };

    const handlePaymentCompleted = (paymentId: string) => {
        const notification: ActivityNotification = {
            id: `payment-${paymentId}`,
            type: "payment_complete",
            title: "Payment Received",
            message: `Payment ${paymentId} successfully processed`,
            timestamp: new Date(),
            read: false,
        };
        addNotification(notification);
    };

    useRealtimeSubscriptions({
        onPatientStatusChange: handlePatientStatusChange,
        onLabRequestUpdate: handleLabRequestUpdate,
        onPrescriptionDispensed: handlePrescriptionDispensed,
        onPaymentCompleted: handlePaymentCompleted,
    });

    const addNotification = (notification: ActivityNotification) => {
        setNotifications((prev) => [notification, ...prev].slice(0, 10)); // Keep last 10
        setUnreadCount((prev) => prev + 1);
    };

    const markAsRead = (id: string) => {
        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
    };

    const getNotificationIcon = (type: ActivityNotification["type"]) => {
        switch (type) {
            case "patient_update":
                return "👤";
            case "lab_complete":
                return "🧪";
            case "prescription_dispensed":
                return "💊";
            case "payment_complete":
                return "💰";
            default:
                return "📢";
        }
    };

    return (
        <div className="relative">
            {/* Notification Bell */}
            <button
                onClick={() => setShowPanel(!showPanel)}
                className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
            >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {unreadCount}
                    </span>
                )}
            </button>

            {/* Notification Panel */}
            {showPanel && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                    <div className="p-4 border-b border-gray-200">
                        <h3 className="font-semibold text-gray-900">Notifications</h3>
                    </div>

                    {notifications.length === 0 ? (
                        <div className="p-6 text-center text-gray-500">
                            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>No notifications</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200">
                            {notifications.map((notification) => (
                                <button
                                    key={notification.id}
                                    onClick={() => markAsRead(notification.id)}
                                    className={`w-full text-left p-4 hover:bg-gray-50 transition ${notification.read ? "" : "bg-blue-50"
                                        }`}
                                >
                                    <div className="flex gap-3">
                                        <span className="text-2xl">{getNotificationIcon(notification.type)}</span>
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-900">{notification.title}</p>
                                            <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                                            <p className="text-xs text-gray-500 mt-2">
                                                {notification.timestamp.toLocaleTimeString()}
                                            </p>
                                        </div>
                                        {!notification.read && (
                                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
