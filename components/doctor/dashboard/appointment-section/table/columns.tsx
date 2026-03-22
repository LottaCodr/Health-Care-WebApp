"use client";

import { ColumnDef } from "@tanstack/react-table";
import StatusBadge from "../../../../StatusBadge";
import { formatDateTime } from "@/app/lib/utils";
import { Doctors } from "@/constants";
import Image from "next/image";
import AppointmentModal from "../../../../AppointmentModal";
import { Appointment } from "@/actions/appointments/types";



export const columns: ColumnDef<Appointment>[] = [
  {
    header: "ID",
    cell: ({ row }) => <p className="text-14-medium"> {row.index + 1}</p>,
  },

  {
    accessorKey: 'patient',
    header: 'Patient',
    cell: ({ row }) => <p className="text-14-medium">{row.original.patient.name}</p>
  },

  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <div className="min-w-[115px]">
      <StatusBadge status={row.original.status} />
    </div>
  },
  {
    accessorKey: "schedule",
    header: "Schedule",
    cell: ({ row }) => (
      <p className="text-14-regular min-w-[100px]">
        {formatDateTime(row.original.doctor).dateTime}
      </p>
    )
  },
  {
    accessorKey: "primaryPhysician",
    header: "Doctor",
    cell: ({ row }) => {
      const doctor = Doctors.find((doc) => doc.name === row.original.doctor)

      return (
        <div className="flex items-center gap-3">
          <Image
            src={doctor?.image || "/default-doctor.png"}
            alt={doctor?.name || "Doctor"}
            width={100}
            height={100}
            className="size-8"
          />

          <p className="whitespace-nowrap">
            Dr. {doctor?.name}
          </p>
        </div>
      )
    }
  },
  {
    id: "actions",
    header: () => <div className="pl-4">Actions</div>,
    cell: ({ row: { original: data } }) => {

      return (
        <div className="flex gap-1">
          <AppointmentModal type='schedule'
            patientId={data.patient.$id}
            userId={data.id}
            appointment={data}
          />

          <AppointmentModal type='cancel'
            patientId={data.patient.$id}
            userId={data.id}
            appointment={data}
          />

        </div>

      );
    },
  },
];
