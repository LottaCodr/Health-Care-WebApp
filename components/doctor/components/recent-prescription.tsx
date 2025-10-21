import React from "react";
import { Eye, RotateCcw, MoreVertical } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

const prescriptions = [
  {
    id: 1,
    patient: "Emma Thompson",
    avatar: "https://randomuser.me/api/portraits/women/44.jpg",
    summary: "Sumatriptan 50mg, 1 tablet as needed for migraine",
    time: "Today, 09:41 AM",
    actions: [
      { icon: <Eye size={16} />, label: "View" },
      { icon: <RotateCcw size={16} />, label: "Renew" },
    ],
  },
  {
    id: 2,
    patient: "Michael Chen",
    avatar: "https://randomuser.me/api/portraits/men/32.jpg",
    summary: "Lisinopril 10mg, 1 tablet daily",
    time: "Today, 07:18 AM",
    actions: [{ icon: <Eye size={16} />, label: "View" }],
  },
  {
    id: 3,
    patient: "Sophia Rodriguez",
    avatar: "https://randomuser.me/api/portraits/women/65.jpg",
    summary:
      "Ferrous sulfate, 1 tablet daily\nTake with food if dosing, 1 hour after meal",
    time: "Yesterday, 10:45 AM",
    actions: [{ icon: <Eye size={16} />, label: "View" }],
  },
];

export default function RecentPrescriptions() {
  return (
    <Card className="flex flex-col h-full min-w-[340px] max-w-1/2">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-lg font-semibold text-black dark:text-white">
            Recent Prescriptions
          </CardTitle>
          <CardDescription className="text-xs text-gray-400 mt-1">
            Prescriptions you wrote recently
          </CardDescription>
        </div>
        <button
          className="text-gray-400 hover:text-gray-200 p-1 rounded transition"
          title="More options"
        >
          <MoreVertical size={20} />
        </button>
      </CardHeader>
      <CardContent className="flex-1 pt-2">
        <ul className="space-y-3 overflow-y-auto pr-1">
          {prescriptions.map((rx) => (
            <li
              key={rx.id}
              className="flex items-start justify-between rounded border-l-4 border-gray-800 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2"
            >
              <div className="flex items-start gap-3">
                <img
                  src={rx.avatar}
                  alt={rx.patient}
                  className="w-8 h-8 rounded-full object-cover mt-1 border-2 border-white dark:border-gray-900"
                />
                <div>
                  <div className="text-sm text-black dark:text-white font-medium">
                    {rx.patient}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-300 whitespace-pre-line">
                    {rx.summary}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    <span>🕒 {rx.time}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 items-end min-w-[60px]">
                {rx.actions.map((action, idx) => (
                  <button
                    key={idx}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 transition"
                    title={action.label}
                  >
                    {action.icon}
                    <span className="hidden sm:inline">{action.label}</span>
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
