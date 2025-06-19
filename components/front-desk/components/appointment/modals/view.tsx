'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Appointment } from "@/actions/appointments/types"
import StatusBadge from "@/components/StatusBadge"
import { formatDate, formatTime } from "@/utils/export"

interface ViewModalProps {
    open: boolean
    onClose: () => void
    appointment: Appointment | null
}

export function ViewAppointmentModal({ open, onClose, appointment }: ViewModalProps) {
    if (!appointment) return null

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Appointment Details</DialogTitle>
                </DialogHeader>
                <div className="space-y-2 text-sm">
                    <p><strong>Patient:</strong> {appointment.patientName}</p>
                    <p><strong>Phone:</strong> {appointment.patient.phone}</p>
                    <p><strong>Doctor:</strong> {appointment.doctor}</p>
                    <p><strong>Date:</strong> {formatDate(appointment.date)}</p>
                    <p><strong>Time:</strong> {formatTime(appointment.time)}</p>
                    <p className="flex gap-2"><strong>Status:</strong> <StatusBadge status={appointment.status} /></p>
                    {appointment.notes && <p><strong>Note:</strong> {appointment.notes}</p>}
                </div>
            </DialogContent>
        </Dialog>
    )
}
