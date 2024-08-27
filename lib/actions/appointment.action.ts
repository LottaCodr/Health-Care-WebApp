import { parseStringify } from "@/app/lib/utils";
import {
  APPOINTMENT_COLLECTION_ID,
  DATABASE_ID,
  databases,
  ENDPOINT,
} from "../appwrite.config";
import { ID, Query } from "node-appwrite";

export const createAppointment = async (
  appointment: CreateAppointmentParams
) => {
  try {
    const newAppointment = await databases.createDocument(
      DATABASE_ID!,
      APPOINTMENT_COLLECTION_ID!,
      ID.unique(),
      appointment
    );

    return parseStringify(newAppointment);
  } catch (error) {
    console.log("An error occurred while getting a user:", error);
  }
};
