// columns/appointmentColumns.ts

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Appointment, AppointmentStatus } from "@/actions/appointments/types";

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
    { accessorKey: "patientName", header: "Patient Name" },
    { accessorKey: "date", header: "Date" },
    { accessorKey: "time", header: "Time" },
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
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => onView(appointment)}>
              View
            </Button>
            <Button size="sm" variant="secondary" onClick={() => onEdit(appointment)}>
              Edit
            </Button>
            <Button size="sm" variant="destructive" onClick={() => onDelete(appointment)}>
              Delete
            </Button>
          </div>
        );
      },
    },
  ];
}

function StatusBadge({ status }: { status: Appointment["status"] }) {
  const colors: Record<AppointmentStatus, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    rescheduled: "bg-blue-100 text-blue-800",
    scheduled: "bg-purple-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
    "no-show": "bg-red-100 text-red-800",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${colors[status]}`}
    >
      {status}
    </span>
  );
}
