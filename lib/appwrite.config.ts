import { Client, Account, Databases, Storage, Messaging } from "appwrite";

export const {
  NEXT_PUBLIC_PROJECT_ID,
  NEXT_PUBLIC_API_KEY,
  NEXT_PUBLIC_DATABASE_ID,
  NEXT_PUBLIC_DOCTOR_COLLECTION,
  NEXT_PUBLIC_STAFF_COLLECTION_ID,
  NEXT_PUBLIC_APPOINTMENT_COLLECTION_ID,
  NEXT_PUBLIC_PATIENT_COLLECTION_ID,
  NEXT_PUBLIC_BUCKET_ID: BUCKET_ID,
  NEXT_PUBLIC_ENDPOINT,
} = process.env;

console.log('endpoint', NEXT_PUBLIC_ENDPOINT!)
const client = new Client()
  .setEndpoint('https://cloud.appwrite.io/v1').setProject(process.env.NEXT_PUBLIC_PROJECT_ID!)
  ;

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const message = new Messaging(client);
