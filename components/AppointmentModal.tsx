"use client"

import React, { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

import { Button } from "./ui/button"
import { Appointment } from "@/types/appwrite.types"
import AppointmentForm from "./forms/AppointmentForm"

interface AppointmentModalProps {
  type: "schedule" | "cancel"
  patientId: string
  userId: string
  appointment?: Appointment
}

const AppointmentModal: React.FC<AppointmentModalProps> = ({
  type,
  patientId,
  userId,
  appointment,
}) => {
  const [open, setOpen] = useState(false)

  const buttonLabel = type === "schedule" ? "Schedule" : "Cancel"
  const buttonColor = type === "schedule" ? "text-green-600" : "text-red-500"

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className={`capitalize font-medium hover:underline ${buttonColor}`}
          aria-label={`${type} appointment`}
        >
          {buttonLabel}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md p-6 rounded-lg shadow-xl border bg-white">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-lg font-semibold capitalize">
            {type === "schedule" ? "Schedule an Appointment" : "Cancel Appointment"}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            {type === "schedule"
              ? "Fill out the form below to schedule a new appointment."
              : "Please confirm or provide a reason to cancel this appointment."}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          <AppointmentForm
            userId={userId}
            patientId={patientId}
            type={type}
            appointment={appointment}
            setOpen={setOpen}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default AppointmentModal
