"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserFormValidation } from "@/lib/validation";
import { registerPatient } from "@/actions/patient.actions";
import { Form } from "@/components/ui/form";
import CustomFormField from "../CustomFormField";
import SubmitButton from "../ui/SubmitButton";
import { FaUser, FaEnvelope, FaPhoneAlt, FaHeartbeat } from "react-icons/fa";

export enum FormFieldType {
  INPUT = "input",
  TEXTAREA = "textarea",
  PHONE_INPUT = "phoneInput",
  CHECKBOX = "checkbox",
  DATE_PICKER = "datePicker",
  SELECT = "select",
  SKELETON = "skeleton",
}

const PatientForm = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof UserFormValidation>>({
    resolver: zodResolver(UserFormValidation),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
    },
  });

  async function onSubmit({ name, email, phone }: z.infer<typeof UserFormValidation>) {
    setIsLoading(true);

    try {
      const userData = {
        name,
        email,
        phone,
      };

      // Fill missing fields with empty strings or default values to match RegisterUserParams
      const newUser = await registerPatient({
        name,
        email,
        phone,
        birthDate: new Date(),
        gender: "Male",
        address: "",
        occupation: "",
        emergencyContactName: "",
        emergencyContactNumber: "",
        primaryPhysician: "",
        privacyConsent: false,
        allergies: "",
        identificationDocument: new FormData(),
      });

      if (newUser) router.push(`/patients/${newUser.$id}/register`);
    } catch (error) {
      console.error(error);
    }
    //setIsLoading(false);
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-8 flex-1"
        autoComplete="off"
      >
        <section className="mb-10 space-y-3 text-center">
          <div className="flex justify-center mb-2">
            <span className="inline-flex items-center justify-center rounded-full bg-red-100 p-4 shadow-md">
              <FaHeartbeat className="text-red-600 text-3xl animate-pulse" />
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-red-700 tracking-tight">
            Welcome!
          </h1>
          <p className="text-base text-red-500">
            Let’s get you started with your first appointment.
          </p>
        </section>

        <div className="space-y-5">
          <CustomFormField
            fieldType={FormFieldType.INPUT}
            control={form.control}
            name="name"
            label="Full Name *"
            placeholder="e.g. Lotanna Chuka"
          />

          <CustomFormField
            fieldType={FormFieldType.INPUT}
            control={form.control}
            name="email"
            label="Email *"
            placeholder="e.g. lotanna47@gmail.com"
          />

          <CustomFormField
            fieldType={FormFieldType.PHONE_INPUT}
            control={form.control}
            name="phone"
            label="Phone Number *"
            placeholder="e.g. 000 0000 0000 000"
          />
        </div>

        <div className="pt-4">
          <SubmitButton
            isLoading={isLoading}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg shadow-lg transition-colors focus:ring-2 focus:ring-red-400 focus:outline-none"
          >
            Get Started
          </SubmitButton>
        </div>
      </form>
    </Form>
  );
};

export default PatientForm;
