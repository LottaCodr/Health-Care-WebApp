'use server'

import { parseStringify } from "@/app/lib/utils";
import {  databases,} from "../../lib/appwrite.config";
import { ID, Query, } from "node-appwrite";
import { Appointment } from "@/types/appwrite.types";


const databaseId = process.env.DATABASE_ID!
const appointmentCollectionId = process.env.APPOINTMENT_COLLECTION_ID!


export const createAppointment = async (
  appointment: CreateAppointmentParams
) => {
  try {
    const newAppointment = await databases.createDocument(
      databaseId,
      appointmentCollectionId,
      ID.unique(),
      appointment
    );
    return parseStringify(newAppointment);
  } catch (error) {
    console.log("An error occurred while getting a user:", error);
  }
};

export async function fetchAppointments(): Promise<Appointment[]> {
  const res = await databases.listDocuments(databaseId, appointmentCollectionId);

  const appointments: Appointment[] = res.documents as Appointment[]
  return appointments
}

export const getAppointment = async (appointmentId: string) => {
  try {
    const fetchAppointment = await databases.getDocument(
      databaseId,
      appointmentCollectionId,
      appointmentId
    )

    return parseStringify(fetchAppointment);
  } catch (error) {
    console.log('Failed to fetch the appointment')
  }
};

export const getRecentAppointmentList = async () => {
  try {
    const appointments = await databases.listDocuments(
      databaseId,
      appointmentCollectionId,
      [Query.orderDesc('$createdAt')]
    )

    const initialCounts = {
      scheduledCount: 0,
      pendingCount: 0,
      cancelledCount: 0,
    }

    const counts = (appointments.documents as Appointment[]).reduce((acc, appointment) => {

      if (appointment.status === 'pending' as Appointment['status']) {
        acc.pendingCount += 1;
      } else if (appointment.status === 'scheduled' as Appointment['status']) {
        acc.scheduledCount += 1;
      } else if (appointment.status === 'cancelled' as Appointment['status']) {
        acc.cancelledCount += 1;
      }

      return acc;
    }, initialCounts);
    const data = {
      totalCount: appointments.total,
      ...counts,
      documents: appointments.documents
    }
    return parseStringify(data)
  } catch (error) {
    console.log('error')

  }
}

export const updateAppointment = async ({ appointmentId, userId, appointment, type }: UpdateAppointmentParams) => {
  try {
    const updateAppointment = await databases.updateDocument(
      databaseId,
      appointmentCollectionId,
      appointmentId,
      appointment
    )

    if (!updateAppointment) {
      throw new Error('Appointment not found');
    }

    // revalidatePath('/admin')

    parseStringify(updateAppointment);
  } catch (error) {
    console.log(error)
  }
}

export async function deleteAppointment(id: string) {
  try {
    await databases.deleteDocument(databaseId, appointmentCollectionId, id);
  } catch (err) {
    console.error("Delete failed:", err);
    throw new Error("Unable to delete appointment");
  }
}