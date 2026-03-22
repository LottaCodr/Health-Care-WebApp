"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import { Form } from "@/components/ui/form";
import CustomFormField from "../CustomFormField";
import SubmitButton from "../ui/SubmitButton";
import { SelectItem } from "../ui/select";

import { Doctors } from "@/constants";
import { createAppointment, updateAppointment } from "@/actions/appointments/appointment.action";
import { getAppointmentSchema } from "@/lib/validation";
import { FormFieldType } from "./PatientForm";
import { Appointment } from "@/actions/appointments/types";
import { Status } from "@/types";

interface AppointmentFormProps {
  userId: string;
  patientId: string;
  type: "create" | "schedule" | "cancel";
  appointment?: Appointment;
  setOpen: (open: boolean) => void;
  onSuccess?: () => void;
}

const AppointmentForm = ({
  userId,
  patientId,
  type,
  appointment,
  setOpen,
  onSuccess,
}: AppointmentFormProps) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const schema = getAppointmentSchema(type);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      primaryPhysician: appointment?.doctor || "",
      schedule: appointment?.date ? new Date(appointment.date) : new Date(),
      reason: appointment?.reason || "",
      note: appointment?.notes || "",
      cancellationReason: appointment?.reason || "",
    },
  });

  const statusMap = {
    create: "pending",
    schedule: "scheduled",
    cancel: "cancelled",
  };

  const handleFormSubmit = async (values: z.infer<typeof schema>) => {
    setIsLoading(true);

    const status = statusMap[type] as Status;

    try {
      if (type === "create") {
        const newAppointment = await createAppointment({
          
          patient: patientId,
          doctorName: values.primaryPhysician,
          date: new Date(values.schedule).toString(),
          reason: values.reason!,
          notes: values.note,
          status,
          cancellationReason: values.cancellationReason,
        });

        if (newAppointment) {
          form.reset();
          router.push(`/patients/${userId}/new-appointment/success?appointmentId=${newAppointment.$id}`);
        }
      } else if (appointment?.id) {
        await updateAppointment( {
          userId,
          appointmentId: appointment.id,
          type,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          appointment: {
            primaryPhysician: values.primaryPhysician,
            schedule: new Date(values.schedule),
            status,
            cancellationReason: values.cancellationReason,
          },
        }, );

        form.reset();
        setOpen(false);
        onSuccess?.();
      }
    } catch (error) {
      console.error("Appointment error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTitle = () => {
    switch (type) {
      case "create": return "New Appointment";
      case "schedule": return "Schedule Appointment";
      case "cancel": return "Cancel Appointment";
      default: return "Appointment";
    }
  };

  const getButtonLabel = () => {
    switch (type) {
      case "cancel": return "Cancel Appointment";
      case "schedule": return "Confirm Schedule";
      default: return "Submit Appointment";
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">

        {type === "create" && (
          <section className="mb-8 space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">{getTitle()}</h2>
            <p className="text-sm text-gray-600">Get an appointment in less than 10 seconds.</p>
          </section>
        )}

        {type !== "cancel" && (
          <>
            <CustomFormField
              fieldType={FormFieldType.SELECT}
              control={form.control}
              name="primaryPhysician"
              label="Primary Physician"
              placeholder="Select a Doctor"
            >
              {Doctors.map((doctor) => (
                <SelectItem key={doctor.name} value={doctor.name}>
                  <div className="flex items-center gap-2">
                    <Image
                      src={doctor.image}
                      alt={doctor.name}
                      width={32}
                      height={32}
                      className="rounded-full border"
                    />
                    <span>{doctor.name}</span>
                  </div>
                </SelectItem>
              ))}
            </CustomFormField>

            <CustomFormField
              fieldType={FormFieldType.DATE_PICKER}
              control={form.control}
              name="schedule"
              label="Appointment Date"
              showTimeSelected
              dateFormat="MM/dd/yyyy - h:mm aa"
            />

            <div className="grid gap-4 md:grid-cols-2">
              <CustomFormField
                fieldType={FormFieldType.TEXTAREA}
                control={form.control}
                name="reason"
                label="Reason"
                placeholder="Enter the reason for the appointment"
              />
              <CustomFormField
                fieldType={FormFieldType.TEXTAREA}
                control={form.control}
                name="note"
                label="Additional Notes"
                placeholder="Optional notes..."
              />
            </div>
          </>
        )}

        {type === "cancel" && (
          <CustomFormField
            fieldType={FormFieldType.TEXTAREA}
            control={form.control}
            name="cancellationReason"
            label="Reason for Cancellation"
            placeholder="Please provide a reason"
          />
        )}

        <SubmitButton
          isLoading={isLoading}
          className={`w-full ${type === "cancel" ? "shad-danger-btn" : "shad-primary-btn"
            }`}
        >
          {getButtonLabel()}
        </SubmitButton>
      </form>
    </Form>
  );
};

export default AppointmentForm;
