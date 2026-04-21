"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, HeartPulse } from "lucide-react";
import { Form } from "@/components/ui/form";
import CustomFormField from "@/components/CustomFormField";
import SubmitButton from "@/components/ui/SubmitButton";
import { useCreatePatient } from "@/hooks/emr/use-emr";
import { toast } from "sonner";

export enum FormFieldType {
  INPUT = "input",
  TEXTAREA = "textarea",
  PHONE_INPUT = "phoneInput",
  CHECKBOX = "checkbox",
  DATE_PICKER = "datePicker",
  SELECT = "select",
  SKELETON = "skeleton",
}

const QuickRegisterSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Enter a valid email address"),
  phone: z.string().min(10, "Enter a valid phone number"),
});

type QuickRegisterValues = z.infer<typeof QuickRegisterSchema>;



const PatientForm = () => {
  const router = useRouter();
  const { mutate: createPatient } = useCreatePatient();
  const [loading, setLoading] = useState(false);

  const form = useForm<QuickRegisterValues>({
    resolver: zodResolver(QuickRegisterSchema),
    defaultValues: { name: "", email: "", phone: "" },
  });

  const onSubmit = async (values: QuickRegisterValues) => {
    setLoading(true);
    try {
      const patient = await createPatient({
        name: values.name,
        email: values.email,
        phone: values.phone,
        status: "registered",
        gender: "Male",        
        address: "",
      } as any);

      toast.success("Patient created. Complete their registration now.");
      if (patient?.id) {
        router.push(`/front-desk/register/${patient.id}`);
      } else {
        router.push("/front-desk/patient");
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6 flex-1"
        autoComplete="off"
      >
        {/* Header */}
        <section className="mb-8 space-y-3 text-center">
          <div className="flex justify-center mb-2">
            <span className="inline-flex items-center justify-center rounded-2xl bg-red-50 p-4 shadow-sm border border-red-100">
              <HeartPulse className="text-red-600" size={28} />
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            New Patient
          </h1>
          <p className="text-sm text-gray-400">
            Quick registration — enter contact details to begin.
          </p>
        </section>

        {/* Fields */}
        <div className="space-y-4">
          <CustomFormField
            fieldType={FormFieldType.INPUT}
            control={form.control}
            name="name"
            label="Full Name"
            placeholder="e.g. Amaka Okafor"
          />
          <CustomFormField
            fieldType={FormFieldType.INPUT}
            control={form.control}
            name="email"
            label="Email Address"
            placeholder="e.g. amaka@example.com"
          />
          <CustomFormField
            fieldType={FormFieldType.PHONE_INPUT}
            control={form.control}
            name="phone"
            label="Phone Number"
            placeholder="+234 800 000 0000"
          />
        </div>

        <SubmitButton
          isLoading={loading}
          className="w-full bg-red-700 hover:bg-red-800 text-white font-semibold py-3 rounded-xl shadow-sm shadow-red-200 transition-colors"
        >
          {loading
            ? <span className="flex items-center gap-2"><Loader2 size={15} className="animate-spin" /> Creating...</span>
            : "Register Patient"
          }
        </SubmitButton>
      </form>
    </Form>
  );
};

export default PatientForm;