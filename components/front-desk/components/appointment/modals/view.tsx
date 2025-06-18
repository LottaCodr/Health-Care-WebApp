'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Appointment } from "@/actions/appointments/types"
import StatusBadge from "@/components/StatusBadge"

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
                    <p><strong>Phone:</strong> {appointment.doctor}</p>
                    <p><strong>Doctor:</strong> {appointment.doctor}</p>
                    <p><strong>Date:</strong> {appointment.date}</p>
                    <p><strong>Time:</strong> {appointment.time}</p>
                    <p><strong>Status:</strong> <StatusBadge status={appointment.status} /></p>
                    {appointment.notes && <p><strong>Note:</strong> {appointment.notes}</p>}
                </div>
            </DialogContent>
        </Dialog>
    )
}
