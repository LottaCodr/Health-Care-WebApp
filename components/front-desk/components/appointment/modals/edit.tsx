'use client'

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { UseFormReturn } from "react-hook-form"

interface EditModalProps {
    open: boolean
    onClose: () => void
    form: UseFormReturn<any>
    onSubmit: (data: any) => void
    isSubmitting: boolean
}

export function EditAppointmentModal({
    open,
    onClose,
    form,
    onSubmit,
    isSubmitting,
}: EditModalProps) {
    const { register, handleSubmit, formState } = form

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Appointment</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <Input {...register("patientName")} placeholder="Patient Name" />
                    {formState.errors.patientName && (
                        <p className="text-sm text-red-500">{formState.errors.patientName.message?.toString()}</p>
                    )}
                    <Input {...register("phone")} placeholder="Phone" />
                    <Input {...register("doctor")} placeholder="Doctor" />
                    <Input type="date" {...register("date")} />
                    <Input type="time" {...register("time")} />
                    <Textarea {...register("note")} placeholder="Note" />
                    <DialogFooter>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? "Updating..." : "Update Appointment"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
