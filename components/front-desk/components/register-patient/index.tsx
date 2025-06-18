'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Form, FormControl } from "@/components/ui/form";
import CustomFormField from "@/components/CustomFormField";
import SubmitButton from "@/components/ui/SubmitButton";
import FileUploader from "@/components/FileUploader";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SelectItem } from "@/components/ui/select";
import Image from "next/image";

import { registerPatient } from "@/actions/patient.actions";
import { PatientFormValidation } from "@/lib/validation";
import { Doctors, GenderOptions, IdentificationTypes, PatientFormDefaultValues } from "@/constants";

import { FormFieldType } from "@/components/forms/PatientForm";
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';


const SectionTitle = ({ title }: { title: string }) => (
    <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{title}</h3>
        <div className="h-[1px] w-full bg-gray-200 mt-2" />
    </div>
);

const RegisterPatientComponent = () => {
    const router = useRouter();

    const form = useForm<z.infer<typeof PatientFormValidation>>({
        resolver: zodResolver(PatientFormValidation),
        defaultValues: {
            ...PatientFormDefaultValues,

        },
    });

    const { toast } = useToast();

    const mutation = useMutation({
        mutationFn: async (values: z.infer<typeof PatientFormValidation>) => {
            let formData;

            if (
                Array.isArray(values.identificationDocument) &&
                values.identificationDocument.length > 0
            ) {
                const file = values.identificationDocument[0];
                formData = new FormData();
                formData.append('blobFile', new Blob([file], { type: file.type }));
                formData.append('fileName', file.name);
            }

            const patientData = {
                ...values,
                birthDate: new Date(values.birthDate),
                identificationDocument: formData,
            };

            return await registerPatient(patientData);
        },
        onSuccess: (data) => {
            toast({
                title: 'Success',
                description: 'Patient registered successfully!',
            });

            // Redirect or reset form
            // router.push(`/patients/${data.$id}/new-appointment`);
        },
        onError: (error) => {
            toast({
                title: 'Error',
                description: 'Failed to register patient.',
                variant: 'default',
            });
            console.error(error);
        },
    });



    const onSubmit = (values: z.infer<typeof PatientFormValidation>) => {
        mutation.mutate(values);
    }

    return (
        <div className="container max-w-5xl mx-auto px-4 py-8">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-12">
                    <div className="text-center space-y-1">
                        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Patient Registration</h1>
                        <p className="text-gray-600 dark:text-gray-300">Please complete the form to register.</p>
                    </div>

                    {/* Personal Information */}
                    <section className="space-y-6">
                        <SectionTitle title="Personal Information" />

                        <CustomFormField
                            fieldType={FormFieldType.INPUT}
                            control={form.control}
                            name="name"
                            label="Full Name"
                            placeholder="Lotanna Chuka"
                            iconSrc="/assets/icons/user.svg"
                            iconAlt="user"
                        />

                        <div className="grid md:grid-cols-2 gap-6">
                            <CustomFormField
                                fieldType={FormFieldType.INPUT}
                                control={form.control}
                                name="email"
                                label="Email"
                                placeholder="lotanna@gmail.com"
                                iconSrc="/assets/icons/email.svg"
                                iconAlt="email"
                            />
                            <CustomFormField
                                fieldType={FormFieldType.PHONE_INPUT}
                                control={form.control}
                                name="phone"
                                label="Phone Number"
                                placeholder="+234..."
                                iconAlt="phone"
                            />
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <CustomFormField
                                fieldType={FormFieldType.DATE_PICKER}
                                control={form.control}
                                name="birthDate"
                                label="Date of Birth"
                            />

                            <CustomFormField
                                fieldType={FormFieldType.SKELETON}
                                control={form.control}
                                name="gender"
                                label="Gender"
                                renderSkeleton={(field) => (
                                    <FormControl>
                                        <RadioGroup
                                            className="flex gap-6 h-10 items-center"
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                        >
                                            {GenderOptions.map((gender) => (
                                                <div key={gender} className="flex items-center gap-2">
                                                    <RadioGroupItem value={gender} id={gender} />
                                                    <label htmlFor={gender} className="text-gray-700 dark:text-gray-300">{gender}</label>
                                                </div>
                                            ))}
                                        </RadioGroup>
                                    </FormControl>
                                )}
                            />
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <CustomFormField
                                fieldType={FormFieldType.INPUT}
                                control={form.control}
                                name="address"
                                label="Address"
                                placeholder="Efab Estate, Life Camp"
                            />
                            <CustomFormField
                                fieldType={FormFieldType.INPUT}
                                control={form.control}
                                name="occupation"
                                label="Occupation"
                                placeholder="Software Engineer"
                            />
                        </div>
                    </section>

                    {/* Emergency Contact */}
                    <section className="space-y-6">
                        <SectionTitle title="Emergency Contact" />

                        <div className="grid md:grid-cols-2 gap-6">
                            <CustomFormField
                                fieldType={FormFieldType.INPUT}
                                control={form.control}
                                name="emergencyContactName"
                                label="Contact Name"
                            />
                            <CustomFormField
                                fieldType={FormFieldType.PHONE_INPUT}
                                control={form.control}
                                name="emergencyContactNumber"
                                label="Contact Phone"
                            />
                        </div>
                    </section>

                    {/* Medical Info */}
                    <section className="space-y-6">
                        <SectionTitle title="Medical Information" />

                        <CustomFormField
                            fieldType={FormFieldType.SELECT}
                            control={form.control}
                            name="primaryPhysician"
                            label="Primary Physician"
                            placeholder="Select a physician"

                        >
                            {Doctors.map((doctor) => (
                                <SelectItem className="bg-white" key={doctor.name} value={doctor.name}>
                                    <div className="flex bg-white w-full items-center gap-2">
                                        <Image
                                            src={doctor.image}
                                            width={32}
                                            height={32}
                                            alt={doctor.name}
                                            className="rounded-full border"
                                        />
                                        <span>{doctor.name}</span>
                                    </div>
                                </SelectItem>
                            ))}
                        </CustomFormField>

                        <div className="grid md:grid-cols-2 gap-6">
                            <CustomFormField
                                fieldType={FormFieldType.INPUT}
                                control={form.control}
                                name="insuranceProvider"
                                label="Insurance Provider"
                            />
                            <CustomFormField
                                fieldType={FormFieldType.INPUT}
                                control={form.control}
                                name="insurancePolicyNumber"
                                label="Policy Number"
                            />
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <CustomFormField
                                fieldType={FormFieldType.TEXTAREA}
                                control={form.control}
                                name="allergies"
                                label="Allergies"
                            />
                            <CustomFormField
                                fieldType={FormFieldType.TEXTAREA}
                                control={form.control}
                                name="currentMedication"
                                label="Current Medications"
                            />
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <CustomFormField
                                fieldType={FormFieldType.TEXTAREA}
                                control={form.control}
                                name="familyMedicationHistory"
                                label="Family Medical History"
                            />
                            <CustomFormField
                                fieldType={FormFieldType.TEXTAREA}
                                control={form.control}
                                name="pastMedicalHistory"
                                label="Past Medical History"
                            />
                        </div>
                    </section>

                    {/* ID & Consent */}
                    <section className="space-y-6">
                        <SectionTitle title="Identification & Consent" />

                        <CustomFormField
                            fieldType={FormFieldType.SELECT}
                            control={form.control}
                            name="identificationType"
                            label="ID Type"
                            placeholder="Select type"
                        >
                            <div className='bg-white'>
                                {IdentificationTypes.map((type) => (
                                    <SelectItem className="bg-white" key={type} value={type}>
                                        {type}
                                    </SelectItem>
                                ))}
                            </div>
                        </CustomFormField>

                        <CustomFormField
                            fieldType={FormFieldType.INPUT}
                            control={form.control}
                            name="identificationNumber"
                            label="ID Number"
                            placeholder="e.g. A123456789"
                        />

                        <CustomFormField
                            fieldType={FormFieldType.SKELETON}
                            control={form.control}
                            name="identificationDocument"
                            label="Upload ID Document"
                            renderSkeleton={(field) => (
                                <FormControl>
                                    <FileUploader files={field.value} onChange={field.onChange} />
                                </FormControl>
                            )}
                        />

                        <CustomFormField
                            fieldType={FormFieldType.CHECKBOX}
                            control={form.control}
                            name="treatmentConsent"
                            label="I consent to receive treatment"
                        />
                        <CustomFormField
                            fieldType={FormFieldType.CHECKBOX}
                            control={form.control}
                            name="disclosureConsent"
                            label="I consent to data usage for treatment"
                        />
                        <CustomFormField
                            fieldType={FormFieldType.CHECKBOX}
                            control={form.control}
                            name="privacyConsent"
                            label="I accept the privacy policy"
                        />
                    </section>

                    <div className="flex justify-end">
                        <SubmitButton isLoading={mutation.isPending}>Submit & Continue</SubmitButton>
                    </div>
                </form>
            </Form>
        </div>
    );
};

export default RegisterPatientComponent;
