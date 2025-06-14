declare type CreateAppointmentParams = {
    userId: string;
    patient: string;
    primaryPhysician: string;
    reason?: string;
    schedule: Date;
    status: Status;
    note: string | undefined;
    cancellationReason: string | undefined;
};

declare type UpdateAppointmentParams = {
    appointmentId: string;
    userId: string;
    timeZone: string;
    appointment: Appointment;
    type: string;
};