import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { FiEye, FiEdit2 } from "react-icons/fi";
import { format } from "date-fns";

interface Appointment {
  id: string;
  patientName: string;
  date: string;       // e.g. '2025-05-23'
  time: string;       // e.g. '14:30'
  status: "Scheduled" | "Completed" | "Cancelled";
}

// Helper for status badge
function StatusBadge({ status }: { status: Appointment["status"] }) {
  let color = "";
  let bg = "";
  let icon = null;
  switch (status) {
    case "Scheduled":
      color = "text-blue-700";
      bg = "bg-blue-100";
      break;
    case "Completed":
      color = "text-green-700";
      bg = "bg-green-100";
      break;
    case "Cancelled":
      color = "text-red-700";
      bg = "bg-red-100";
      break;
  }
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${color} ${bg}`}
      style={{ minWidth: 80, justifyContent: "center" }}
    >
      {status}
    </span>
  );
}

const appointmentColumns: ColumnDef<Appointment>[] = [
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
    cell: ({ getValue }) => {
      const dateStr = getValue() as string;
      let formatted = dateStr;
      try {
        formatted = format(new Date(dateStr), "MMM dd, yyyy");
      } catch {}
      return <span className="whitespace-nowrap">{formatted}</span>;
    },
  },
  {
    accessorKey: "time",
    header: "Time",
    cell: ({ getValue }) => {
      // Format time as e.g. 2:30 PM
      const timeStr = getValue() as string;
      let formatted = timeStr;
      try {
        const [h, m] = timeStr.split(":");
        const date = new Date();
        date.setHours(Number(h), Number(m));
        formatted = format(date, "h:mm a");
      } catch {}
      return <span className="whitespace-nowrap">{formatted}</span>;
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ getValue }) => <StatusBadge status={getValue() as Appointment["status"]} />,
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
            className="hover:bg-blue-50"
            title="View"
            onClick={() => alert(`Viewing ${appointment.patientName}`)}
          >
            <FiEye className="w-4 h-4 text-blue-600" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Edit appointment"
            className="hover:bg-green-50"
            title="Edit"
            onClick={() => alert(`Editing ${appointment.patientName}`)}
          >
            <FiEdit2 className="w-4 h-4 text-green-600" />
          </Button>
        </div>
      );
    },
  },
];
