import React from "react";
import { CheckCircle, ClipboardList, Trash2, MoreVertical } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

const tasks = [
  {
    id: 1,
    title: "Review lab results for Emma Thompson",
    due: "Today, 10:40 AM",
    urgent: true,
    completed: false,
  },
  {
    id: 2,
    title: "Complete medical certificate for James Wilson",
    due: "Today, 4:00 PM",
    urgent: false,
    completed: false,
  },
  {
    id: 3,
    title: "Follow up on Michael Chen's medication",
    due: "Tomorrow, 9:00 AM",
    urgent: false,
    completed: false,
  },
  {
    id: 4,
    title: "Review treatment plan for Sophia Rodriguez",
    due: "Tomorrow, 11:00 AM",
    urgent: false,
    completed: false,
  },
];

export default function PendingTasks() {
  return (
    <Card className="flex flex-col h-full min-w-[340px] max-w-1/2">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-lg font-semibold text-black">
            Pending Tasks
          </CardTitle>
          <CardDescription className="text-xs text-gray-400 mt-1">
            Tasks requiring your attention
          </CardDescription>
        </div>
        
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0">
        <ul className="flex-1 space-y-2 overflow-y-auto pr-1 px-6">
          {tasks.map((task) => (
            <li
              key={task.id}
              className={`flex items-start justify-between rounded px-3 py-2 border-l-4 ${
                task.urgent ? "border-red-500" : "border-gray-800"
              } bg-gray-50`}
            >
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-1 accent-red-600"
                  checked={task.completed}
                  readOnly
                  tabIndex={-1}
                />
                <div>
                  <div className="text-sm text-black font-medium">
                    {task.title}
                  </div>
                  <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                    <ClipboardList
                      size={13}
                      className="inline-block text-gray-500"
                    />
                    <span>{task.due}</span>
                    {task.urgent && (
                      <span className="ml-2 px-1.5 py-0.5 bg-red-600 text-white text-[10px] rounded font-semibold">
                        URGENT
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  className="p-1 text-gray-400 hover:text-green-500"
                  title="Mark as done"
                >
                  <CheckCircle size={18} />
                </button>
                <button
                  className="p-1 text-gray-400 hover:text-red-500"
                  title="Delete"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="mt-4 pt-0">
        <button className="w-full text-xs text-gray-400 hover:text-red-500 transition py-1 rounded flex items-center justify-center gap-1">
          <ClipboardList size={14} />
          <span>Export/Remove completed tasks</span>
        </button>
      </CardFooter>
    </Card>
  );
}
