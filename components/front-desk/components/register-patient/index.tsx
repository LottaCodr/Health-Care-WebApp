"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl } from "@/components/ui/form";
import CustomFormField from "@/components/CustomFormField";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PatientFormValidation } from "@/lib/validation";
import { CovidVaccinationOptions, GenderOptions, PatientFormDefaultValues } from "@/constants";
import { FormFieldType } from "@/components/forms/PatientForm";
import { usePatientMutations } from "@/actions/patients/mutation";
import { usePatientContext } from "@/context/patients/patient-context";
import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

/**
 * Section Title Component
 * Displays a title with optional description and decorative underline
 */
const SectionTitle = ({ title, description }: { title: string; description?: string }) => (
    <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            {title}
        </h3>
        {description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{description}</p>
        )}
        <div className="h-1 w-12 bg-primary mt-3 rounded-full" />
    </div>
);

/**
 * Progress Stepper Component
 * Visual indicator of current step in multi-step form
 */
const Stepper = ({ currentStep, steps }: { currentStep: number; steps: string[] }) => (
    <div className="mb-8">
        {/* Mobile: Simple progress bar */}
        <div className="md:hidden">
            <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">
                    Step {currentStep + 1} of {steps.length}
                </span>
                <span className="text-xs text-gray-500">{steps[currentStep]}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                />
            </div>
        </div>

        {/* Desktop: Full stepper */}
        <div className="hidden md:flex items-center justify-between">
            {steps.map((step, idx) => (
                <div key={step} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1">
                        <div
                            className={`w-10 h-10 flex items-center justify-center rounded-full border-2 transition-all duration-300 ${idx === currentStep
                                ? "border-primary bg-primary text-white shadow-lg scale-110"
                                : idx < currentStep
                                    ? "border-green-500 bg-green-500 text-white"
                                    : "border-gray-300 bg-white text-gray-400"
                                } font-semibold`}
                        >
                            {idx < currentStep ? <CheckCircle2 size={20} /> : idx + 1}
                        </div>
                        <span
                            className={`text-xs font-medium mt-2 text-center transition-colors ${idx === currentStep
                                ? "text-primary"
                                : idx < currentStep
                                    ? "text-green-600"
                                    : "text-gray-400"
                                }`}
                        >
                            {step}
                        </span>
                    </div>
                    {idx < steps.length - 1 && (
                        <div
                            className={`h-1 flex-1 mx-2 rounded transition-colors ${idx < currentStep ? "bg-green-500" : "bg-gray-200"
                                }`}
                        />
                    )}
                </div>
            ))}
        </div>
    </div>
);

const steps = [
    "Patient Information",
    "Emergency Contact",
    "Medical History",
    "Insurance Details",
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
        ["name", "email", "phone", "birthDate", "religion", "gender", "address", "occupation"],
        ["emergencyContactName", "emergencyContactNumber", "emergencyContactRelationship", "emergencyContactEmail", "emergencyContactAddress"],
        ["allergies", "significantMedicationHistory", "longTermMedication", "covidVaccinationOptions", "bloodGroup", "genoType"],
        ["policyNumber", "hmo", "hmoName", "company", "companyName", "privateClient"],
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
        const userId = uuidv4();

        try {
            await registerPatient.mutateAsync({
                ...values,
                userId,
                birthDate: new Date(values.birthDate),
            });
            setSubmitted(true);
        } catch (error: any) {
            setSubmitError(error?.message || "Failed to register patient. Please try again.");
            setSubmitted(false);
        }
    };

    // Scroll to top smoothly on step change
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, [currentStep]);

    // Auto-dismiss success message after 5 seconds
    useEffect(() => {
        if (submitted) {
            const timer = setTimeout(() => {
                form.reset();
                setSubmitted(false);
                setCurrentStep(0);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [submitted, form]);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 w-full">
            <div className="container max-w-4xl mx-auto">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 md:p-10">
                    <Form {...form}>
                        <form
                            onSubmit={form.handleSubmit(onSubmit)}
                            className="space-y-8"
                            autoComplete="off"
                        >
                            {/* Header */}
                            <div className="text-center space-y-3 pb-4 border-b border-gray-200 dark:border-gray-700">
                                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                                    Patient Registration
                                </h1>
                                <p className="text-gray-600 dark:text-gray-300 text-sm md:text-base max-w-2xl mx-auto">
                                    Complete all required fields to register a new patient.
                                    <span className="text-red-500 ml-1">*</span> indicates required fields.
                                </p>
                            </div>

                            <Stepper currentStep={currentStep} steps={steps} />

                            {/* Success State */}
                            {submitted ? (
                                <div className="flex flex-col items-center justify-center py-16 space-y-6 animate-fade-in">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-green-100 rounded-full blur-xl opacity-50" />
                                        <CheckCircle2 className="text-green-500 relative" size={80} strokeWidth={1.5} />
                                    </div>
                                    <div className="text-center space-y-2">
                                        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                                            Registration Successful!
                                        </h2>
                                        <p className="text-gray-600 dark:text-gray-300 max-w-md">
                                            The patient has been successfully registered. You will be redirected shortly.
                                        </p>
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSubmitted(false);
                                                setCurrentStep(0);
                                                form.reset();
                                            }}
                                            className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
                                        >
                                            Register Another Patient
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* Error Alert */}
                                    {submitError && (
                                        <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg animate-fade-in">
                                            <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
                                            <div className="flex-1">
                                                <p className="font-medium">Registration Failed</p>
                                                <p className="text-sm mt-1">{submitError}</p>
                                            </div>
                                            <button
                                                onClick={() => setSubmitError(null)}
                                                className="text-red-700 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    )}

                                    {/* Step 1: Personal Information */}
                                    {currentStep === 0 && (
                                        <section className="space-y-6 animate-fade-in">
                                            <SectionTitle
                                                title="Personal Information"
                                                description="Basic details about the patient"
                                            />
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <CustomFormField
                                                    fieldType={FormFieldType.INPUT}
                                                    control={form.control}
                                                    name="name"
                                                    label="Full Name"
                                                    placeholder="John Doe"
                                                    iconSrc="/assets/icons/user.svg"
                                                    iconAlt="user"
                                                    required
                                                />
                                                <CustomFormField
                                                    fieldType={FormFieldType.INPUT}
                                                    control={form.control}
                                                    name="religion"
                                                    label="Religion"
                                                    placeholder="Christianity, Islam, etc."
                                                    iconSrc="/assets/icons/religion.svg"
                                                    iconAlt="religion"
                                                    required
                                                />
                                                <CustomFormField
                                                    fieldType={FormFieldType.INPUT}
                                                    control={form.control}
                                                    name="email"
                                                    label="Email Address"
                                                    placeholder="patient@example.com"
                                                    iconSrc="/assets/icons/email.svg"
                                                    iconAlt="email"
                                                    required
                                                />
                                                <CustomFormField
                                                    fieldType={FormFieldType.PHONE_INPUT}
                                                    control={form.control}
                                                    name="phone"
                                                    label="Phone Number"
                                                    placeholder="+234 800 000 0000"
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
                                                <CustomFormField
                                                    fieldType={FormFieldType.SKELETON}
                                                    control={form.control}
                                                    name="gender"
                                                    label="Gender"
                                                    required
                                                    renderSkeleton={(field) => (
                                                        <FormControl>
                                                            <RadioGroup
                                                                className="flex gap-6 h-11 items-center"
                                                                onValueChange={field.onChange}
                                                                defaultValue={field.value}
                                                            >
                                                                {GenderOptions.map((gender) => (
                                                                    <div key={gender} className="flex items-center gap-2">
                                                                        <RadioGroupItem value={gender} id={gender} />
                                                                        <label
                                                                            htmlFor={gender}
                                                                            className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
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
                                                    required
                                                />
                                                <CustomFormField
                                                    fieldType={FormFieldType.INPUT}
                                                    control={form.control}
                                                    name="address"
                                                    label="Residential Address"
                                                    placeholder="123 Main Street, City"
                                                    required
                                                />
                                            </div>
                                        </section>
                                    )}

                                    {/* Step 2: Emergency Contact */}
                                    {currentStep === 1 && (
                                        <section className="space-y-6 animate-fade-in">
                                            <SectionTitle
                                                title="Emergency Contact Information"
                                                description="Person to contact in case of emergency"
                                            />
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <CustomFormField
                                                    fieldType={FormFieldType.INPUT}
                                                    control={form.control}
                                                    name="emergencyContactName"
                                                    label="Contact Name"
                                                    placeholder="Jane Doe"
                                                    required
                                                />
                                                <CustomFormField
                                                    fieldType={FormFieldType.PHONE_INPUT}
                                                    control={form.control}
                                                    name="emergencyContactNumber"
                                                    label="Contact Phone"
                                                    placeholder="+234 800 000 0000"
                                                    required
                                                />
                                                <CustomFormField
                                                    fieldType={FormFieldType.INPUT}
                                                    control={form.control}
                                                    name="emergencyContactRelationship"
                                                    label="Relationship"
                                                    placeholder="Spouse, Parent, Sibling"
                                                    required
                                                />
                                                <CustomFormField
                                                    fieldType={FormFieldType.INPUT}
                                                    control={form.control}
                                                    name="emergencyContactEmail"
                                                    label="Contact Email"
                                                    placeholder="contact@example.com"
                                                    required
                                                />
                                                <div className="md:col-span-2">
                                                    <CustomFormField
                                                        fieldType={FormFieldType.INPUT}
                                                        control={form.control}
                                                        name="emergencyContactAddress"
                                                        label="Contact Address"
                                                        placeholder="123 Main Street, City"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                        </section>
                                    )}

                                    {/* Step 3: Medical History */}
                                    {currentStep === 2 && (
                                        <section className="space-y-6 animate-fade-in">
                                            <SectionTitle
                                                title="Medical History"
                                                description="Relevant medical information"
                                            />
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <CustomFormField
                                                    fieldType={FormFieldType.TEXTAREA}
                                                    control={form.control}
                                                    name="allergies"
                                                    label="Known Allergies"
                                                    placeholder="List any known allergies (medications, food, etc.)"
                                                    required
                                                />
                                                <CustomFormField
                                                    fieldType={FormFieldType.TEXTAREA}
                                                    control={form.control}
                                                    name="significantMedicationHistory"
                                                    label="Medical/Surgical History"
                                                    placeholder="Diabetes, Hypertension, Previous surgeries"
                                                    required
                                                />
                                                <div className="md:col-span-2">
                                                    <CustomFormField
                                                        fieldType={FormFieldType.TEXTAREA}
                                                        control={form.control}
                                                        name="longTermMedication"
                                                        label="Long-Term Medications"
                                                        placeholder="List any ongoing medications"
                                                        required
                                                    />
                                                </div>
                                                <CustomFormField
                                                    fieldType={FormFieldType.SKELETON}
                                                    control={form.control}
                                                    name="covidVaccinationOptions"
                                                    label="COVID-19 Vaccination Status"
                                                    required
                                                    renderSkeleton={(field) => (
                                                        <FormControl>
                                                            <RadioGroup
                                                                className="flex flex-col gap-3"
                                                                onValueChange={field.onChange}
                                                                defaultValue={field.value}
                                                            >
                                                                {CovidVaccinationOptions.map((option) => (
                                                                    <div key={option} className="flex items-center gap-2">
                                                                        <RadioGroupItem value={option} id={option} />
                                                                        <label
                                                                            htmlFor={option}
                                                                            className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
                                                                        >
                                                                            {option}
                                                                        </label>
                                                                    </div>
                                                                ))}
                                                            </RadioGroup>
                                                        </FormControl>
                                                    )}
                                                />
                                                <div className="space-y-6">
                                                    <CustomFormField
                                                        fieldType={FormFieldType.INPUT}
                                                        control={form.control}
                                                        name="bloodGroup"
                                                        label="Blood Group"
                                                        placeholder="O+, A-, B+, AB-"
                                                        required
                                                    />
                                                    <CustomFormField
                                                        fieldType={FormFieldType.INPUT}
                                                        control={form.control}
                                                        name="genoType"
                                                        label="Genotype"
                                                        placeholder="AA, AS, SS"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                        </section>
                                    )}

                                    {/* Step 4: Insurance Details */}
                                    {currentStep === 3 && (
                                        <section className="space-y-6 animate-fade-in">
                                            <SectionTitle
                                                title="Insurance Information"
                                                description="Medical insurance and payment details"
                                            />
                                            <div className="space-y-6">
                                                <CustomFormField
                                                    control={form.control}
                                                    fieldType={FormFieldType.INPUT}
                                                    name="policyNumber"
                                                    label="Policy Number"
                                                    placeholder="ABC123456789"
                                                    required
                                                />
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div className="space-y-3">
                                                        <CustomFormField
                                                            fieldType={FormFieldType.CHECKBOX}
                                                            control={form.control}
                                                            name="hmo"
                                                            label="Covered by HMO"
                                                            required
                                                        />
                                                        <CustomFormField
                                                            fieldType={FormFieldType.INPUT}
                                                            control={form.control}
                                                            name="hmoName"
                                                            label="HMO Provider Name"
                                                            placeholder="Enter HMO name"
                                                            required
                                                        />
                                                    </div>
                                                    <div className="space-y-3">
                                                        <CustomFormField
                                                            fieldType={FormFieldType.CHECKBOX}
                                                            control={form.control}
                                                            name="company"
                                                            label="Company Insurance"
                                                            required
                                                        />
                                                        <CustomFormField
                                                            fieldType={FormFieldType.INPUT}
                                                            control={form.control}
                                                            name="companyName"
                                                            label="Company Name"
                                                            placeholder="Enter company name"
                                                            required
                                                        />
                                                    </div>
                                                </div>
                                                <CustomFormField
                                                    fieldType={FormFieldType.CHECKBOX}
                                                    control={form.control}
                                                    name="privateClient"
                                                    label="Private Client (Self-Pay)"
                                                    required
                                                />
                                            </div>
                                        </section>
                                    )}
                                </>
                            )}

                            {/* Navigation Buttons */}
                            {!submitted && (
                                <div className="flex justify-between items-center pt-6 border-t border-gray-200 dark:border-gray-700">
                                    <button
                                        type="button"
                                        className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${currentStep === 0
                                            ? "invisible"
                                            : "bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
                                            }`}
                                        onClick={handleBack}
                                        disabled={currentStep === 0}
                                    >
                                        <ChevronLeft size={20} />
                                        Back
                                    </button>

                                    {currentStep < steps.length - 1 ? (
                                        <button
                                            type="button"
                                            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-white font-semibold shadow-lg hover:shadow-xl hover:bg-primary/90 transition-all"
                                            onClick={handleNext}
                                        >
                                            Next
                                            <ChevronRight size={20} />
                                        </button>
                                    ) : (
                                        <button
                                            type="submit"
                                            className="flex items-center gap-2 px-8 py-3 rounded-lg bg-primary text-white font-semibold shadow-lg hover:shadow-xl hover:bg-primary/90 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                            disabled={registerPatient.isPending}
                                        >
                                            {registerPatient.isPending ? (
                                                <>
                                                    <Loader2 size={20} className="animate-spin" />
                                                    Registering...
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle2 size={20} />
                                                    Register Patient
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            )}
                        </form>
                    </Form>
                </div>
            </div>
        </div>
    );
};

export default RegisterPatientComponent;