
import { parseStringify } from "@/app/lib/utils";
import { databases, } from "../../lib/appwrite.config";
import { ID, Query, } from "node-appwrite";
import { Appointment, normalizeAppointment } from "./types";


const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID!
const appointmentCollectionId = process.env.NEXT_PUBLIC_APPOINTMENT_COLLECTION_ID!



export const createAppointment = async (
  appointment: Appointment
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
    const res = await databases.listDocuments(databaseId, appointmentCollectionId,
      [Query.orderDesc('$createdAt')]);
    console.log('appointments:', res.documents)

    const appointments = res.documents.map(normalizeAppointment)

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

    return normalizeAppointment(fetchAppointment);
  } catch (error) {
    console.log('Failed to fetch the appointment')
  }
};

export const getRecentAppointmentList = async () => {

  if (!databaseId || !appointmentCollectionId) {
    throw new Error('Missing required environment variables: NEXT_PUBLIC_DATABASE_ID or NEXT_PUBLIC_APPOINTMENT_COLLECTION_ID');
  }

  try {
    const res = await databases.listDocuments(
      databaseId,
      appointmentCollectionId,
      [Query.orderDesc('$createdAt')]
    );

    const appointments = res.documents.map(normalizeAppointment);

    const counts = appointments.reduce(
      (acc, a) => {
        if (a.status === 'upcoming') acc.pendingCount++;
        else if (a.status === 'scheduled') acc.scheduledCount++;
        else if (a.status === 'cancelled') acc.cancelledCount++;
        return acc;
      },
      { pendingCount: 0, scheduledCount: 0, cancelledCount: 0 }
    );

    return {
      totalCount: res.total,
      ...counts,
      documents: appointments,
    };
  } catch (error) {
    console.error('Error fetching appointment list', error);
  }
}

export const updateAppointment = async (appointmentId: string, updates: Partial<Appointment>) => {
  try {
    const updated = await databases.updateDocument(
      databaseId,
      appointmentCollectionId,
      appointmentId,
      updates
    );

    return normalizeAppointment(updated);
  } catch (error) {
    console.error("Update failed:", error);
    throw error;
  }
};

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