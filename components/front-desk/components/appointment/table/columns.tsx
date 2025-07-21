// columns/appointmentColumns.ts

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Appointment, AppointmentStatus } from "@/actions/appointments/types";
import { FiEye, FiEdit2, FiTrash2 } from "react-icons/fi";
import { formatDate, formatTime } from "@/utils/export";

export function getAppointmentColumns({
  onView,
  onEdit,
  onDelete,
}: {
  onView: (appointment: Appointment) => void;
  onEdit: (appointment: Appointment) => void;
  onDelete: (appointment: Appointment) => void;
}): ColumnDef<Appointment>[] {
  return [
    {
      accessorKey: "patientName",
      header: "Patient Name",
      cell: ({ getValue }) => (
        <span className="font-medium text-gray-900">{getValue() as string}</span>
      ),
    },
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ getValue }) => (
        <span className="whitespace-nowrap">{formatDate(getValue() as string)}</span>
      ),
    },
    {
      accessorKey: "time",
      header: "Time",
      cell: ({ getValue }) => (
        <span className="whitespace-nowrap">{formatTime(getValue() as string)}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ getValue }) => (
        <StatusBadge status={getValue() as Appointment["status"]} />
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const appointment = row.original;
        return (
          <div className="flex gap-1">
            <Button
              size="icon"
              variant="ghost"
              aria-label="View appointment"
              onClick={() => onView(appointment)}
              className="hover:bg-blue-50"
              title="View"
            >
              <FiEye className="w-4 h-4 text-blue-600" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Edit appointment"
              onClick={() => onEdit(appointment)}
              className="hover:bg-yellow-50"
              title="Edit"
            >
              <FiEdit2 className="w-4 h-4 text-yellow-600" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Delete appointment"
              onClick={() => onDelete(appointment)}
              className="hover:bg-red-50"
              title="Delete"
            >
              <FiTrash2 className="w-4 h-4 text-red-600" />
            </Button>
          </div>
        );
      },
    },
  ];
}

function StatusBadge({ status }: { status: Appointment["status"] }) {
  const statusMap: Record<
    AppointmentStatus,
    { label: string; color: string; icon: React.ReactNode }
  > = {
    pending: {
      label: "Pending",
      color: "bg-yellow-100 text-yellow-800 border-yellow-300",
      icon: (
        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" className="stroke-yellow-400" />
          <path d="M12 6v6l3 3" className="stroke-yellow-600" />
        </svg>
      ),
    },
    rescheduled: {
      label: "Rescheduled",
      color: "bg-blue-100 text-blue-800 border-blue-300",
      icon: (
        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M12 8v4l3 3" className="stroke-blue-600" />
          <circle cx="12" cy="12" r="10" className="stroke-blue-400" />
        </svg>
      ),
    },
    scheduled: {
      label: "Scheduled",
      color: "bg-purple-100 text-purple-800 border-purple-300",
      icon: (
        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" className="stroke-purple-400" />
          <path d="M12 8v4l3 3" className="stroke-purple-600" />
        </svg>
      ),
    },
    completed: {
      label: "Completed",
      color: "bg-green-100 text-green-800 border-green-300",
      icon: (
        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M5 13l4 4L19 7" className="stroke-green-600" />
        </svg>
      ),
    },
    cancelled: {
      label: "Cancelled",
      color: "bg-red-100 text-red-800 border-red-300",
      icon: (
        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <line x1="6" y1="6" x2="18" y2="18" className="stroke-red-600" />
          <line x1="6" y1="18" x2="18" y2="6" className="stroke-red-600" />
        </svg>
      ),
    },
    "no-show": {
      label: "No Show",
      color: "bg-red-100 text-red-800 border-red-300",
      icon: (
        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" className="stroke-red-400" />
          <path d="M8 15h8M9 9h.01M15 9h.01" className="stroke-red-600" />
        </svg>
      ),
    },
  };

  const { label, color, icon } = statusMap[status] || {
    label: status,
    color: "bg-gray-100 text-gray-800 border-gray-300",
    icon: null,
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold ${color}`}
      title={label}
    >
      {icon}
      {label}
    </span>
  );
}
