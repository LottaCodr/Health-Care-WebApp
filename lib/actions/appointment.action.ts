'use server'

import { parseStringify } from "@/app/lib/utils";
import {
  APPOINTMENT_COLLECTION_ID,
  DATABASE_ID,
  databases,
  
} from "../appwrite.config";
import { ID,  } from "node-appwrite";

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

export const getAppointment = async (appointment: string) => {
 try {
    const getAppointment = databases.getDocument(
        DATABASE_ID!,
        APPOINTMENT_COLLECTION_ID!,
        appointment
    )

    return parseStringify(getAppointment);
 } catch (error) {
    console.log('Failed to fetch the appointment')
 }
};
