import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";

interface Appointment {
  id: string;
  patientName: string;
  date: string;       // e.g. '2025-05-23'
  time: string;       // e.g. '14:30'
  status: "Scheduled" | "Completed" | "Cancelled";
}

const appointmentColumns: ColumnDef<Appointment>[] = [
  {
    accessorKey: "patientName",
    header: "Patient Name",
  },
  {
    accessorKey: "date",
    header: "Date",
  },
  {
    accessorKey: "time",
    header: "Time",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ getValue }) => {
      const status = getValue() as Appointment["status"];
      const color =
        status === "Scheduled" ? "text-blue-600" :
          status === "Completed" ? "text-green-600" :
            "text-red-600";
      return <span className={color}>{status}</span>;
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const appointment = row.original;
      return (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => alert(`Viewing ${appointment.patientName}`)}>
            View
          </Button>
          <Button size="sm" variant="ghost" onClick={() => alert(`Editing ${appointment.patientName}`)}>
            Edit
          </Button>
        </div>
      );
    },
  },
];
