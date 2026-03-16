"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

import { Form, FormControl } from "@/components/ui/form";
import CustomFormField from "@/components/CustomFormField";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PatientFormValidation } from "@/lib/validation";
import { CovidVaccinationOptions, GenderOptions, PatientFormDefaultValues } from "@/constants";
import { FormFieldType } from "@/components/forms/PatientForm";
import { usePatientMutations } from "@/actions/front-desk/mutation";
import { usePatientContext } from "@/context/patients/patient-context";
import { useAuth } from "@/context/auth-provider";

/** Safe scroll helper (guard for SSR) */
function safeScrollToTop() {
  if (typeof window !== "undefined" && window.scrollTo) {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

/** Section Title */
const SectionTitle = ({ title, description }: { title: string; description?: string }) => (
  <div className="mb-6">
    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h3>
    {description && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{description}</p>}
    <div className="h-1 w-12 bg-primary mt-3 rounded-full" />
  </div>
);

/** Stepper */
const Stepper = ({ currentStep, steps }: { currentStep: number; steps: string[] }) => (
  <div className="mb-8">
    <div className="sm:hidden">
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
    <div className="hidden sm:flex items-center justify-between gap-1 flex-wrap">
      {steps.map((step, idx) => (
        <div key={step} className="flex items-center flex-1 min-w-[100px]">
          <div className="flex flex-col items-center flex-1 min-w-0">
            <div
              className={`w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full border-2 transition-all duration-300 ${
                idx === currentStep
                  ? "border-primary bg-primary text-white shadow-lg scale-110"
                  : idx < currentStep
                  ? "border-green-500 bg-green-500 text-white"
                  : "border-gray-300 bg-white text-gray-400"
              } font-semibold`}
            >
              {idx < currentStep ? <CheckCircle2 size={18} /> : idx + 1}
            </div>
            <span
              className={`text-xs md:text-sm font-medium mt-2 text-center transition-colors break-words ${
                idx === currentStep
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
              className={`h-1 flex-1 mx-1 md:mx-2 rounded transition-colors min-w-2 ${
                idx < currentStep ? "bg-green-500" : "bg-gray-200"
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

const RegistrationSuite = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { dispatch } = usePatientContext();
  const { registerPatient } = usePatientMutations(dispatch);

  const form = useForm<z.infer<typeof PatientFormValidation>>({
    resolver: zodResolver(PatientFormValidation),
    defaultValues: {
      ...PatientFormDefaultValues,
      userId: user?.id!,
      status: "registered",
    },
    mode: "onTouched",
  });

  const [currentStep, setCurrentStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [validatingStep, setValidatingStep] = useState(false);

  // Step field names for validation
  const stepFields = [
    [
      "name",
      "email",
      "phone",
      "birthDate",
      "religion",
      "gender",
      "address",
      "occupation",
    ],
    [
      "emergencyContactName",
      "emergencyContactNumber",
      "emergencyContactRelationship",
      "emergencyContactEmail",
      "emergencyContactAddress",
    ],
    [
      "allergies",
      "significantMedicationHistory",
      "longTermMedication",
      "covidVaccinationOptions",
      "bloodGroup",
      "genoType",
    ],
    [
      "policyNumber",
      "hmo",
      "hmoName",
      "company",
      "companyName",
      "privateClient",
    ],
  ];

  // Validate the fields of the *currentStep* before moving forward
  const validateStep = async () => {
    setValidatingStep(true);
    const fields = stepFields[currentStep];
    const result = await form.trigger(fields as any, { shouldFocus: true });
    setValidatingStep(false);
    return result;
  };

  const handleNext = async () => {
    if (validatingStep) return;
    const valid = await validateStep();
    if (valid) {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  // Helper: Scroll to the first error field in DOM
  function scrollToFirstError(errors: any) {
    // Get the field with first error (flat search)
    const errorField = Object.keys(errors)[0];
    if (errorField) {
      const el = document.querySelector(`[name="${errorField}"]`);
      if (el && typeof (el as any).focus === "function") {
        (el as any).focus();
        try {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        } catch { /* ignore if scrollIntoView fails */ }
      }
    }
  }

  // SUBMIT LOGIC: No longer intercept <form> submit! Drive from button only.

  // We must only drive submission from a button click event on the last step, not via <form onSubmit>.
  // Therefore: leave <form onSubmit={e => e.preventDefault()}>, and control everything from the submit button's onClick.

  const onSubmit = async (values: z.infer<typeof PatientFormValidation>) => {
    // Console the output on submit (as per instructions)
    console.log("Form submitted. Output values:", values);
    setSubmitError(null);
    const userId = uuidv4();

    try {
      const payload = {
        name: values.name,
        address: values.address,
        email: values.email,
        id: userId,
        religion: values.religion,
        phone: values.phone,
        gender: values.gender,
        occupation: values.occupation,
        birth_date: values.birthDate,
        emergency_contact_name: values.emergencyContactName,
        emergency_contact_number: values.emergencyContactNumber,
        emergency_contact_relationship: values.emergencyContactRelationship,
        emergency_contact_email: values.emergencyContactEmail,
        emergency_contact_address: values.emergencyContactAddress,
        allergies: values.allergies,
        significant_medication_history: values.significantMedicationHistory,
        long_term_medication: values.longTermMedication,
        covid_vaccination_options: values.covidVaccinationOptions,
        blood_group: values.bloodGroup,
        geno_type: values.genoType,
        policy_number: values.policyNumber,
        hmo: values.hmo,
        user_id: user?.id,
        hmo_name: values.hmoName,
        company: values.company,
        company_name: values.companyName,
        private_client: values.privateClient,
        recommendations: values.recommendations,
      };

      await registerPatient.mutateAsync(payload);
      setSubmitError(null);

      setSubmitted(true);
    } catch (error: any) {
      let details =
        error?.message || "Failed to register patient. Please try again.";
      if (error?.response?.data)
        details += " | " + JSON.stringify(error.response.data);
      setSubmitError(details);
      setSubmitted(false);
      safeScrollToTop();
    }
  };

  // Scroll to top on step change
  useEffect(() => {
    safeScrollToTop();
  }, [currentStep]);

  // Auto-dismiss success & reset after 5 seconds
  useEffect(() => {
    if (submitted) {
      const timer = setTimeout(() => {
        form.reset();
        setSubmitted(false);
        setCurrentStep(0);
        router.push("/frontdesk/patient");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [submitted, form, router]);

  // This is the actual "Submit" drive logic for the last step
  const handleFinalSubmit = async () => {
    setSubmitError(null);
    setValidatingStep(true);
    const isValid = await validateStep();
    setValidatingStep(false);
    if (!isValid) {
      safeScrollToTop();
      scrollToFirstError(form.formState.errors);
      return;
    }
    // If valid, get all current form values and submit
    const values = form.getValues();
    await onSubmit(values as z.infer<typeof PatientFormValidation>);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-4 sm:py-8 px-2 sm:px-4 w-full">
      <div className="mx-auto w-full max-w-lg sm:max-w-2xl md:max-w-3xl lg:max-w-4xl">
        <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-lg sm:shadow-xl p-4 sm:p-6 md:p-8 lg:p-10">
          <Form {...form}>
            <form
              // Prevent native submit, so submit logic is driven only by the button
              onSubmit={(e) => e.preventDefault()}
              className="space-y-6 sm:space-y-8"
              autoComplete="off"
            >
              {/* Header */}
              <div className="text-center space-y-2 sm:space-y-3 pb-4 border-b border-gray-200 dark:border-gray-700">
                <h1 className="text-2xl xs:text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
                  Patient Registration
                </h1>
                <p className="text-gray-600 dark:text-gray-300 text-xs xs:text-sm sm:text-base max-w-2xl mx-auto">
                  Complete all required fields to register a new patient.
                  <span className="text-red-500 ml-1">*</span> indicates required fields.
                </p>
              </div>

              <Stepper currentStep={currentStep} steps={steps} />

              {submitted ? (
                <div className="flex flex-col items-center justify-center py-10 sm:py-16 space-y-5 sm:space-y-6 animate-fade-in">
                  <div className="relative">
                    <div className="absolute inset-0 bg-green-100 rounded-full blur-xl opacity-50" />
                    <CheckCircle2 className="text-green-500 relative" size={60} strokeWidth={1.5} />
                  </div>
                  <div className="text-center space-y-1.5 sm:space-y-2">
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                      Registration Successful!
                    </h2>
                    <p className="text-gray-600 dark:text-gray-300 max-w-md text-sm sm:text-base">
                      The patient has been successfully registered. You will be redirected shortly.
                    </p>
                  </div>
                  <div className="flex gap-2 sm:gap-3 flex-col xs:flex-row w-full xs:w-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setSubmitted(false);
                        setCurrentStep(0);
                        form.reset();
                      }}
                      className="w-full xs:w-auto px-4 py-2 sm:px-6 sm:py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
                    >
                      Register Another Patient
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Error Alert */}
                  {submitError && (
                    <div className="flex items-start gap-2 sm:gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-2 xs:px-3 sm:px-4 py-2 xs:py-2.5 sm:py-3 rounded-lg animate-fade-in">
                      <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium">Registration Failed</p>
                        <p className="text-xs sm:text-sm mt-0.5 sm:mt-1">{submitError}</p>
                      </div>
                      <button
                        onClick={() => setSubmitError(null)}
                        className="text-red-700 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 text-lg leading-none ml-2"
                        aria-label="Dismiss"
                      >
                        ×
                      </button>
                    </div>
                  )}

                  {/* Step 1: Patient Info */}
                  {currentStep === 0 && (
                    <section className="space-y-4 sm:space-y-6 animate-fade-in">
                      <SectionTitle
                        title="Personal Information"
                        description="Basic details about the patient"
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
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
                                className="flex flex-row gap-3 xs:gap-4 sm:gap-6 h-11 items-center flex-wrap"
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                {GenderOptions.map((gender) => (
                                  <div key={gender} className="flex items-center gap-2">
                                    <RadioGroupItem value={gender} id={gender} />
                                    <label
                                      htmlFor={gender}
                                      className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer whitespace-nowrap"
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
                    <section className="space-y-4 sm:space-y-6 animate-fade-in">
                      <SectionTitle
                        title="Emergency Contact Information"
                        description="Person to contact in case of emergency"
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
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
                        <div className="sm:col-span-2">
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
                    <section className="space-y-4 sm:space-y-6 animate-fade-in">
                      <SectionTitle
                        title="Medical History"
                        description="Relevant medical information"
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
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
                        <div className="sm:col-span-2">
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
                                className="flex flex-col gap-2 xs:gap-3"
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
                        <div className="space-y-2 sm:space-y-6">
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
                    <section className="space-y-4 sm:space-y-6 animate-fade-in">
                      <SectionTitle
                        title="Insurance Information"
                        description="Medical insurance and payment details"
                      />
                      <div className="space-y-4 sm:space-y-6">
                        <CustomFormField
                          control={form.control}
                          fieldType={FormFieldType.INPUT}
                          name="policyNumber"
                          label="Policy Number"
                          placeholder="ABC123456789"
                          required
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                          <div className="space-y-2 sm:space-y-3">
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
                          <div className="space-y-2 sm:space-y-3">
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
                <div className="flex flex-col xs:flex-row justify-between items-stretch xs:items-center pt-4 sm:pt-6 border-t border-gray-200 dark:border-gray-700 gap-2 xs:gap-4">
                  <button
                    type="button"
                    className={`flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-all text-sm sm:text-base ${
                      currentStep === 0
                        ? "invisible"
                        : "bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
                    }`}
                    onClick={handleBack}
                    disabled={currentStep === 0 || validatingStep}
                  >
                    <ChevronLeft size={20} />
                    Back
                  </button>
                  {currentStep < steps.length - 1 ? (
                    <button
                      type="button"
                      className="flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2 sm:py-3 rounded-lg bg-primary text-white font-semibold shadow hover:shadow-md hover:bg-primary/90 transition-all text-sm sm:text-base"
                      onClick={handleNext}
                      disabled={validatingStep}
                    >
                      {validatingStep ? <Loader2 size={16} className="animate-spin" /> : null}
                      Next
                      <ChevronRight size={20} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="flex items-center justify-center gap-1.5 sm:gap-2 px-6 sm:px-8 py-2 sm:py-3 rounded-lg bg-primary text-white font-semibold shadow hover:shadow-md hover:bg-primary/90 transition-all disabled:opacity-60 disabled:cursor-not-allowed text-sm sm:text-base"
                      disabled={registerPatient.isPending}
                      onClick={handleFinalSubmit}
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

export default RegistrationSuite;
