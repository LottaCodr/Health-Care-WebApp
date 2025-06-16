
import { parseStringify } from "@/app/lib/utils";
import { databases, } from "../../lib/appwrite.config";
import { ID, Query, } from "node-appwrite";
import { Appointment } from "@/types/appwrite.types";


const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID!
const appointmentCollectionId = process.env.NEXT_PUBLIC_APPOINTMENT_COLLECTION_ID!



export const createAppointment = async (
  appointment: CreateAppointmentParams
) => {

  if (!databaseId || !appointmentCollectionId) {
    throw new Error('Missing required environment variables: NEXT_PUBLIC_DATABASE_ID or NEXT_PUBLIC_APPOINTMENT_COLLECTION_ID');
  }

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

  if (!databaseId || !appointmentCollectionId) {
    throw new Error('Missing required environment variables: NEXT_PUBLIC_DATABASE_ID or NEXT_PUBLIC_APPOINTMENT_COLLECTION_ID');
  }

  try {
    const res = await databases.listDocuments(databaseId, appointmentCollectionId);
    console.log('appointments:', res.documents as Appointment[])

    const appointments = res.documents as Appointment[]

    return appointments;

  } catch (error) {
    console.error("Failed to fetch appointments:", error);
    return [];
  }
}

export const getAppointment = async (appointmentId: string) => {

  if (!databaseId || !appointmentCollectionId) {
    throw new Error('Missing required environment variables: NEXT_PUBLIC_DATABASE_ID or NEXT_PUBLIC_APPOINTMENT_COLLECTION_ID');
  }
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

  if (!databaseId || !appointmentCollectionId) {
    throw new Error('Missing required environment variables: NEXT_PUBLIC_DATABASE_ID or NEXT_PUBLIC_APPOINTMENT_COLLECTION_ID');
  }

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

  if (!databaseId || !appointmentCollectionId) {
    throw new Error('Missing required environment variables: NEXT_PUBLIC_DATABASE_ID or NEXT_PUBLIC_APPOINTMENT_COLLECTION_ID');
  }

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
  if (!databaseId || !appointmentCollectionId) {
    throw new Error('Missing required environment variables: NEXT_PUBLIC_DATABASE_ID or NEXT_PUBLIC_APPOINTMENT_COLLECTION_ID');
  }
  try {
    await databases.deleteDocument(databaseId, appointmentCollectionId, id);
  } catch (err) {
    console.error("Delete failed:", err);
    throw new Error("Unable to delete appointment");
  }
}