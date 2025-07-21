"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl } from "@/components/ui/form";
import CustomFormField from "@/components/CustomFormField";
import SubmitButton from "@/components/ui/SubmitButton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SelectItem } from "@/components/ui/select";
import Image from "next/image";
import { PatientFormValidation } from "@/lib/validation";
import { Doctors, GenderOptions, IdentificationTypes, PatientFormDefaultValues } from "@/constants";
import { FormFieldType } from "@/components/forms/PatientForm";
import { usePatientMutations } from "@/actions/patients/mutation";
import { usePatientContext } from "@/context/patients/patient-context";
import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";

const SectionTitle = ({ title, description }: { title: string; description?: string }) => (
    <div className="mb-4">
        <h3 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center gap-2">
            {title}
        </h3>
        {description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>
        )}
        <div className="h-[1.5px] w-16 bg-primary mt-2 rounded" />
    </div>
);

const Stepper = ({ currentStep, steps }: { currentStep: number; steps: string[] }) => (
    <div className="flex items-center justify-center gap-4 mb-8">
        {steps.map((step, idx) => (
            <div key={step} className="flex items-center gap-2">
                <div
                    className={`w-8 h-8 flex items-center justify-center rounded-full border-2 ${
                        idx === currentStep
                            ? "border-primary bg-primary text-white"
                            : idx < currentStep
                            ? "border-green-500 bg-green-500 text-white"
                            : "border-gray-300 bg-white text-gray-400"
                    } font-bold transition-colors`}
                >
                    {idx < currentStep ? <CheckCircle2 size={20} /> : idx + 1}
                </div>
                <span
                    className={`text-xs font-medium ${
                        idx === currentStep
                            ? "text-primary"
                            : idx < currentStep
                            ? "text-green-600"
                            : "text-gray-400"
                    }`}
                >
                    {step}
                </span>
                {idx < steps.length - 1 && (
                    <div className="w-8 h-1 bg-gray-200 rounded" />
                )}
            </div>
        ))}
    </div>
);

const steps = [
    "Personal",
    "Emergency",
    "Medical",
    "ID & Consent",
];

const RegisterPatientComponent = () => {
    const form = useForm<z.infer<typeof PatientFormValidation>>({
        resolver: zodResolver(PatientFormValidation),
        defaultValues: { ...PatientFormDefaultValues },
        mode: "onTouched",
    });

    const { dispatch } = usePatientContext();
    const { registerPatient } = usePatientMutations(dispatch);

    const [currentStep, setCurrentStep] = useState(0);
    const [submitted, setSubmitted] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    // Step field names for validation
    const stepFields = [
        [
            "name",
            "email",
            "phone",
            "birthDate",
            "gender",
            "address",
            "occupation",
        ],
        [
            "emergencyContactName",
            "emergencyContactNumber",
        ],
        [
            "primaryPhysician",
            "insuranceProvider",
            "insurancePolicyNumber",
            "allergies",
            "currentMedication",
            "familyMedicationHistory",
            "pastMedicalHistory",
        ],
        [
            "identificationType",
            "identificationNumber",
            "treatmentConsent",
            "disclosureConsent",
            "privacyConsent",
        ],
    ];

    const validateStep = async () => {
        const fields = stepFields[currentStep];
        const result = await form.trigger(fields as any, { shouldFocus: true });
        return result;
    };

    const handleNext = async () => {
        const valid = await validateStep();
        if (valid) {
            setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
        }
    };

    const handleBack = () => {
        setCurrentStep((prev) => Math.max(prev - 1, 0));
    };

    const onSubmit = async (values: z.infer<typeof PatientFormValidation>) => {
        setSubmitError(null);
        try {
            await registerPatient.mutateAsync({
                ...values,
                birthDate: new Date(values.birthDate),
                identificationDocument: undefined, // Add file logic if needed later
            });
            setSubmitted(true);
        } catch (error: any) {
            setSubmitError(error?.message || "Failed to register patient.");
            setSubmitted(false);
        }
    };

    // UX: Scroll to top on step change
    const scrollToTop = () => {
        if (typeof window !== "undefined") {
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    };

    // Scroll to top on step change
    useEffect(() => {
        scrollToTop();
    }, [currentStep]);

    return (
        <div className="container max-w-3xl mx-auto px-4 py-8 bg-white dark:bg-gray-900 rounded-lg shadow-lg">
            <Form {...form}>
                <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-10"
                    autoComplete="off"
                >
                    <div className="text-center space-y-2 mb-2">
                        <h1 className="text-3xl font-extrabold text-primary tracking-tight">
                            Patient Registration
                        </h1>
                        <p className="text-gray-600 dark:text-gray-300 text-base">
                            Please complete the form to register. Fields marked <span className="text-red-500">*</span> are required.
                        </p>
                    </div>

                    <Stepper currentStep={currentStep} steps={steps} />

                    {submitted ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <CheckCircle2 className="text-green-500 mb-4" size={48} />
                            <h2 className="text-2xl font-bold mb-2">Registration Successful!</h2>
                            <p className="text-gray-600 dark:text-gray-300 mb-4">
                                The patient has been registered successfully.
                            </p>
                        </div>
                    ) : (
                        <>
                            {submitError && (
                                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded mb-4">
                                    <AlertCircle size={20} />
                                    <span>{submitError}</span>
                                </div>
                            )}

                            {/* Step 1: Personal Info */}
                            {currentStep === 0 && (
                                <section className="space-y-6 animate-fade-in">
                                    <SectionTitle
                                        title="Personal Information"
                                        description="Tell us about the patient."
                                    />
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <CustomFormField
                                            fieldType={FormFieldType.INPUT}
                                            control={form.control}
                                            name="name"
                                            label="Full Name"
                                            placeholder="Patient name"
                                            iconSrc="/assets/icons/user.svg"
                                            iconAlt="user"
                                            required
                                        />
                                        <CustomFormField
                                            fieldType={FormFieldType.INPUT}
                                            control={form.control}
                                            name="email"
                                            label="Email"
                                            placeholder="patient@email.com"
                                            iconSrc="/assets/icons/email.svg"
                                            iconAlt="email"
                                            required
                                        />
                                    </div>
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <CustomFormField
                                            fieldType={FormFieldType.PHONE_INPUT}
                                            control={form.control}
                                            name="phone"
                                            label="Phone Number"
                                            placeholder="+234..."
                                            iconAlt="phone"
                                            required
                                        />
                                        <CustomFormField
                                            fieldType={FormFieldType.DATE_PICKER}
                                            control={form.control}
                                            name="birthDate"
                                            label="Date of Birth"
                                            required
                                        />
                                    </div>
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <CustomFormField
                                            fieldType={FormFieldType.SKELETON}
                                            control={form.control}
                                            name="gender"
                                            label="Gender"
                                            required
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
                                                                <label
                                                                    htmlFor={gender}
                                                                    className="text-gray-700 dark:text-gray-300"
                                                                >
                                                                    {gender}
                                                                </label>
                                                            </div>
                                                        ))}
                                                    </RadioGroup>
                                                </FormControl>
                                            )}
                                        />
                                        <CustomFormField
                                            fieldType={FormFieldType.INPUT}
                                            control={form.control}
                                            name="occupation"
                                            label="Occupation"
                                            placeholder="Software Engineer"
                                        />
                                    </div>
                                    <CustomFormField
                                        fieldType={FormFieldType.INPUT}
                                        control={form.control}
                                        name="address"
                                        label="Address"
                                        placeholder="Efab Estate, Life Camp"
                                    />
                                </section>
                            )}

                            {/* Step 2: Emergency Contact */}
                            {currentStep === 1 && (
                                <section className="space-y-6 animate-fade-in">
                                    <SectionTitle
                                        title="Emergency Contact"
                                        description="Who should we contact in case of emergency?"
                                    />
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <CustomFormField
                                            fieldType={FormFieldType.INPUT}
                                            control={form.control}
                                            name="emergencyContactName"
                                            label="Contact Name"
                                            required
                                        />
                                        <CustomFormField
                                            fieldType={FormFieldType.PHONE_INPUT}
                                            control={form.control}
                                            name="emergencyContactNumber"
                                            label="Contact Phone"
                                            required
                                        />
                                    </div>
                                </section>
                            )}

                            {/* Step 3: Medical Info */}
                            {currentStep === 2 && (
                                <section className="space-y-6 animate-fade-in">
                                    <SectionTitle
                                        title="Medical Information"
                                        description="Provide relevant medical details."
                                    />
                                    <CustomFormField
                                        fieldType={FormFieldType.SELECT}
                                        control={form.control}
                                        name="primaryPhysician"
                                        label="Primary Physician"
                                        placeholder="Select a physician"
                                        required
                                    >
                                        {Doctors.map((doctor) => (
                                            <SelectItem className="bg-white" key={doctor.name} value={doctor.name}>
                                                <div className="flex items-center gap-2">
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
                                            placeholder="List any allergies"
                                        />
                                        <CustomFormField
                                            fieldType={FormFieldType.TEXTAREA}
                                            control={form.control}
                                            name="currentMedication"
                                            label="Current Medications"
                                            placeholder="List current medications"
                                        />
                                    </div>
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <CustomFormField
                                            fieldType={FormFieldType.TEXTAREA}
                                            control={form.control}
                                            name="familyMedicationHistory"
                                            label="Family Medical History"
                                            placeholder="e.g. Diabetes, Hypertension"
                                        />
                                        <CustomFormField
                                            fieldType={FormFieldType.TEXTAREA}
                                            control={form.control}
                                            name="pastMedicalHistory"
                                            label="Past Medical History"
                                            placeholder="e.g. Surgeries, Hospitalizations"
                                        />
                                    </div>
                                </section>
                            )}

                            {/* Step 4: ID & Consent */}
                            {currentStep === 3 && (
                                <section className="space-y-6 animate-fade-in">
                                    <SectionTitle
                                        title="Identification & Consent"
                                        description="Verify identity and provide consent."
                                    />
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <CustomFormField
                                            fieldType={FormFieldType.SELECT}
                                            control={form.control}
                                            name="identificationType"
                                            label="ID Type"
                                            placeholder="Select type"
                                            required
                                        >
                                            {IdentificationTypes.map((type) => (
                                                <SelectItem className="bg-white" key={type} value={type}>
                                                    {type}
                                                </SelectItem>
                                            ))}
                                        </CustomFormField>
                                        <CustomFormField
                                            fieldType={FormFieldType.INPUT}
                                            control={form.control}
                                            name="identificationNumber"
                                            label="ID Number"
                                            placeholder="e.g. A123456789"
                                            required
                                        />
                                    </div>
                                    <div className="grid md:grid-cols-1 gap-4">
                                        <CustomFormField
                                            fieldType={FormFieldType.CHECKBOX}
                                            control={form.control}
                                            name="treatmentConsent"
                                            label="I consent to receive treatment"
                                            required
                                        />
                                        <CustomFormField
                                            fieldType={FormFieldType.CHECKBOX}
                                            control={form.control}
                                            name="disclosureConsent"
                                            label="I consent to data usage for treatment"
                                            required
                                        />
                                        <CustomFormField
                                            fieldType={FormFieldType.CHECKBOX}
                                            control={form.control}
                                            name="privacyConsent"
                                            label="I accept the privacy policy"
                                            required
                                        />
                                    </div>
                                </section>
                            )}

                            {/* Navigation Buttons */}
                            <div className="flex justify-between items-center pt-6">
                                <button
                                    type="button"
                                    className={`px-4 py-2 rounded font-medium border transition-colors ${
                                        currentStep === 0
                                            ? "opacity-0 pointer-events-none"
                                            : "bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300"
                                    }`}
                                    onClick={handleBack}
                                    tabIndex={currentStep === 0 ? -1 : 0}
                                >
                                    Back
                                </button>
                                {currentStep < steps.length - 1 ? (
                                    <button
                                        type="button"
                                        className="px-6 py-2 rounded bg-primary text-white font-semibold shadow hover:bg-primary-dark transition-colors"
                                        onClick={handleNext}
                                    >
                                        Next
                                    </button>
                                ) : (
                                    <SubmitButton isLoading={registerPatient.isPending}>
                                        Submit &amp; Continue
                                    </SubmitButton>
                                )}
                            </div>
                        </>
                    )}
                </form>
            </Form>
        </div>
    );
};

export default RegisterPatientComponent;
