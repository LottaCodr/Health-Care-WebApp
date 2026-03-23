"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import {
  CheckCircle2, AlertCircle, ChevronLeft, ChevronRight,
  Loader2, User, Phone, Heart, Shield, Stethoscope,
} from "lucide-react";

import { Form, FormControl } from "@/components/ui/form";
import CustomFormField from "@/components/CustomFormField";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PatientFormValidation } from "@/lib/validation";
import { CovidVaccinationOptions, GenderOptions, PatientFormDefaultValues } from "@/constants";
import { FormFieldType } from "@/components/forms/PatientForm";
import { usePatientMutations } from "@/actions/front-desk/mutation";
import { usePatientContext } from "@/context/patients/patient-context";
import { useAuth } from "@/context/auth-provider";

function safeScrollToTop() {
  if (typeof window !== "undefined" && window.scrollTo) {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

// ─── Step config ──────────────────────────────────────────────────────────────

const STEPS = [
  { label: "Patient Info", description: "Personal details", icon: User },
  { label: "Emergency Contact", description: "Next of kin", icon: Phone },
  { label: "Medical History", description: "Health background", icon: Heart },
  { label: "Insurance Details", description: "Coverage information", icon: Shield },
];

const STEP_FIELDS = [
  ["name", "email", "phone", "birthDate", "religion", "gender", "address", "occupation"],
  ["emergencyContactName", "emergencyContactNumber", "emergencyContactRelationship", "emergencyContactEmail", "emergencyContactAddress"],
  ["allergies", "significantMedicationHistory", "longTermMedication", "covidVaccinationOptions", "bloodGroup", "genoType"],
  ["policyNumber", "hmo", "hmoName", "company", "companyName", "privateClient"],
];

// ─── Section title ────────────────────────────────────────────────────────────

function SectionTitle({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6">
      <h3 className="text-lg font-bold text-gray-900">{title}</h3>
      {description && <p className="text-xs text-gray-400 mt-1">{description}</p>}
      <div className="h-0.5 w-8 bg-blue-600 mt-3 rounded-full" />
    </div>
  );
}

// ─── Vertical stepper (desktop) ───────────────────────────────────────────────

function VerticalStepper({ currentStep }: { currentStep: number }) {
  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0">
      {/* Brand header */}
      <div className="flex items-center gap-3 mb-10">
        <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
          <Stethoscope size={19} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-black text-gray-900 tracking-tight">Patient Registration</p>
          <p className="text-[10px] text-gray-400 font-medium">Nile Valley Hospital</p>
        </div>
      </div>

      {/* Steps */}
      <div className="flex flex-col gap-1">
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isActive = idx === currentStep;
          const isDone = idx < currentStep;

          return (
            <div key={step.label} className="flex gap-3">
              {/* Line + circle */}
              <div className="flex flex-col items-center">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200
                                    ${isActive ? "bg-blue-600 shadow-lg shadow-blue-200 scale-110"
                    : isDone ? "bg-green-500"
                      : "bg-gray-100"}`}>
                  {isDone
                    ? <CheckCircle2 size={16} className="text-white" />
                    : <Icon size={16} className={isActive ? "text-white" : "text-gray-400"} />
                  }
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`w-0.5 h-10 mt-1 rounded-full transition-colors duration-300
                                        ${isDone ? "bg-green-400" : "bg-gray-100"}`} />
                )}
              </div>

              {/* Label */}
              <div className="pt-1.5 pb-10">
                <p className={`text-sm font-bold leading-tight transition-colors
                                    ${isActive ? "text-blue-600" : isDone ? "text-green-600" : "text-gray-400"}`}>
                  {step.label}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">{step.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress */}
      <div className="mt-auto pt-8 border-t border-gray-100">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Progress</p>
        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-500"
            style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
          />
        </div>
        <p className="text-xs font-semibold text-gray-500 mt-2">
          Step {currentStep + 1} of {STEPS.length}
        </p>
      </div>
    </aside>
  );
}

// ─── Mobile progress bar ──────────────────────────────────────────────────────

function MobileProgress({ currentStep }: { currentStep: number }) {
  return (
    <div className="lg:hidden mb-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {(() => { const Icon = STEPS[currentStep].icon; return <Icon size={14} className="text-blue-600" />; })()}
          <span className="text-sm font-bold text-gray-800">{STEPS[currentStep].label}</span>
        </div>
        <span className="text-xs text-gray-400 font-medium">{currentStep + 1}/{STEPS.length}</span>
      </div>
      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-600 rounded-full transition-all duration-500"
          style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
        />
      </div>
      {/* Step dots */}
      <div className="flex items-center gap-1.5 mt-3">
        {STEPS.map((_, idx) => (
          <div key={idx} className={`h-1 rounded-full transition-all duration-300
                        ${idx === currentStep ? "w-6 bg-blue-600" : idx < currentStep ? "w-3 bg-green-500" : "w-3 bg-gray-200"}`} />
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const RegistrationSuite = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { dispatch } = usePatientContext();
  const { registerPatient } = usePatientMutations(dispatch);

  const form = useForm<z.infer<typeof PatientFormValidation>>({
    resolver: zodResolver(PatientFormValidation),
    defaultValues: { ...PatientFormDefaultValues, userId: user?.id!, status: "registered" },
    mode: "onTouched",
  });

  const [currentStep, setCurrentStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [validatingStep, setValidatingStep] = useState(false);

  const validateStep = async () => {
    setValidatingStep(true);
    const result = await form.trigger(STEP_FIELDS[currentStep] as any, { shouldFocus: true });
    setValidatingStep(false);
    return result;
  };

  const handleNext = async () => {
    if (validatingStep) return;
    if (await validateStep()) setCurrentStep((p) => Math.min(p + 1, STEPS.length - 1));
  };

  const handleBack = () => setCurrentStep((p) => Math.max(p - 1, 0));

  const onSubmit = async (values: z.infer<typeof PatientFormValidation>) => {
    setSubmitError(null);
    const userId = uuidv4();
    try {
      await registerPatient.mutateAsync({
        name: values.name, address: values.address, email: values.email,
        id: userId, religion: values.religion, phone: values.phone,
        gender: values.gender, occupation: values.occupation,
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
        hmo: values.hmo, user_id: user?.id,
        hmo_name: values.hmoName, company: values.company,
        company_name: values.companyName, private_client: values.privateClient,
        recommendations: values.recommendations,
      });
      setSubmitted(true);
    } catch (error: any) {
      setSubmitError(error?.message ?? "Failed to register patient. Please try again.");
      safeScrollToTop();
    }
  };

  const handleFinalSubmit = async () => {
    setSubmitError(null);
    setValidatingStep(true);
    const isValid = await validateStep();
    setValidatingStep(false);
    if (!isValid) { safeScrollToTop(); return; }
    await onSubmit(form.getValues() as z.infer<typeof PatientFormValidation>);
  };

  useEffect(() => { safeScrollToTop(); }, [currentStep]);

  useEffect(() => {
    if (submitted) {
      const timer = setTimeout(() => {
        form.reset(); setSubmitted(false); setCurrentStep(0);
        router.push("/frontdesk/patient");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [submitted, form, router]);

  return (
    <div className="min-h-screen bg-gray-50/60 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex gap-0">

            {/* ── Left sidebar (desktop) ── */}
            <div className="hidden lg:block w-72 shrink-0 bg-gray-50/80 border-r border-gray-100 p-8">
              <VerticalStepper currentStep={currentStep} />
            </div>

            {/* ── Main content ── */}
            <div className="flex-1 p-6 sm:p-8 lg:p-10">
              <Form {...form}>
                <form onSubmit={(e) => e.preventDefault()} autoComplete="off">

                  {/* Mobile header */}
                  <div className="lg:hidden mb-6">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-200">
                        <Stethoscope size={16} className="text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-gray-900">Patient Registration</p>
                        <p className="text-[10px] text-gray-400">Nile Valley Hospital</p>
                      </div>
                    </div>
                    <MobileProgress currentStep={currentStep} />
                  </div>

                  {/* ── Success state ── */}
                  {submitted ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-5 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-green-50 border border-green-100 flex items-center justify-center">
                        <CheckCircle2 size={30} className="text-green-500" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">Registration Successful!</h2>
                        <p className="text-sm text-gray-400 mt-2 max-w-sm mx-auto">
                          The patient has been successfully registered and added to the system.
                        </p>
                      </div>
                      <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-xl">
                        <Loader2 size={13} className="text-blue-500 animate-spin" />
                        <p className="text-xs text-blue-600 font-medium">Redirecting in 5 seconds...</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setSubmitted(false); setCurrentStep(0); form.reset(); }}
                        className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200"
                      >
                        Register Another Patient
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* ── Error banner ── */}
                      {submitError && (
                        <div className="flex items-start gap-3 bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-2xl mb-6">
                          <AlertCircle size={15} className="shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-xs font-bold">Registration Failed</p>
                            <p className="text-xs mt-0.5 text-red-600">{submitError}</p>
                          </div>
                          <button onClick={() => setSubmitError(null)} className="text-red-400 hover:text-red-600 text-lg leading-none">×</button>
                        </div>
                      )}

                      {/* ── Step 1: Patient Info ── */}
                      {currentStep === 0 && (
                        <section className="space-y-5">
                          <SectionTitle title="Personal Information" description="Basic details about the patient" />
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <CustomFormField fieldType={FormFieldType.INPUT} control={form.control} name="name" label="Full Name" placeholder="John Doe" iconSrc="/assets/icons/user.svg" iconAlt="user" required />
                            <CustomFormField fieldType={FormFieldType.INPUT} control={form.control} name="religion" label="Religion" placeholder="Christianity, Islam, etc." iconSrc="/assets/icons/religion.svg" iconAlt="religion" required />
                            <CustomFormField fieldType={FormFieldType.INPUT} control={form.control} name="email" label="Email Address" placeholder="patient@example.com" iconSrc="/assets/icons/email.svg" iconAlt="email" required />
                            <CustomFormField fieldType={FormFieldType.PHONE_INPUT} control={form.control} name="phone" label="Phone Number" placeholder="+234 800 000 0000" iconAlt="phone" required />
                            <CustomFormField fieldType={FormFieldType.DATE_PICKER} control={form.control} name="birthDate" label="Date of Birth" required />
                            <CustomFormField
                              fieldType={FormFieldType.SKELETON} control={form.control} name="gender" label="Gender" required
                              renderSkeleton={(field) => (
                                <FormControl>
                                  <RadioGroup className="flex flex-row gap-4 h-11 items-center" onValueChange={field.onChange} defaultValue={field.value}>
                                    {GenderOptions.map((gender) => (
                                      <div key={gender} className="flex items-center gap-2">
                                        <RadioGroupItem value={gender} id={gender} />
                                        <label htmlFor={gender} className="text-sm font-medium text-gray-700 cursor-pointer">{gender}</label>
                                      </div>
                                    ))}
                                  </RadioGroup>
                                </FormControl>
                              )}
                            />
                            <CustomFormField fieldType={FormFieldType.INPUT} control={form.control} name="occupation" label="Occupation" placeholder="Software Engineer" required />
                            <CustomFormField fieldType={FormFieldType.INPUT} control={form.control} name="address" label="Residential Address" placeholder="123 Main Street, City" required />
                          </div>
                        </section>
                      )}

                      {/* ── Step 2: Emergency Contact ── */}
                      {currentStep === 1 && (
                        <section className="space-y-5">
                          <SectionTitle title="Emergency Contact" description="Person to contact in case of emergency" />
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <CustomFormField fieldType={FormFieldType.INPUT} control={form.control} name="emergencyContactName" label="Contact Name" placeholder="Jane Doe" required />
                            <CustomFormField fieldType={FormFieldType.PHONE_INPUT} control={form.control} name="emergencyContactNumber" label="Contact Phone" placeholder="+234 800 000 0000" required />
                            <CustomFormField fieldType={FormFieldType.INPUT} control={form.control} name="emergencyContactRelationship" label="Relationship" placeholder="Spouse, Parent, Sibling" required />
                            <CustomFormField fieldType={FormFieldType.INPUT} control={form.control} name="emergencyContactEmail" label="Contact Email" placeholder="contact@example.com" required />
                            <div className="sm:col-span-2">
                              <CustomFormField fieldType={FormFieldType.INPUT} control={form.control} name="emergencyContactAddress" label="Contact Address" placeholder="123 Main Street, City" required />
                            </div>
                          </div>
                        </section>
                      )}

                      {/* ── Step 3: Medical History ── */}
                      {currentStep === 2 && (
                        <section className="space-y-5">
                          <SectionTitle title="Medical History" description="Relevant health background and medications" />
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <CustomFormField fieldType={FormFieldType.TEXTAREA} control={form.control} name="allergies" label="Known Allergies" placeholder="List any known allergies (medications, food, etc.)" required />
                            <CustomFormField fieldType={FormFieldType.TEXTAREA} control={form.control} name="significantMedicationHistory" label="Medical / Surgical History" placeholder="Diabetes, Hypertension, Previous surgeries" required />
                            <div className="sm:col-span-2">
                              <CustomFormField fieldType={FormFieldType.TEXTAREA} control={form.control} name="longTermMedication" label="Long-Term Medications" placeholder="List any ongoing medications" required />
                            </div>
                            <CustomFormField
                              fieldType={FormFieldType.SKELETON} control={form.control} name="covidVaccinationOptions" label="COVID-19 Vaccination Status" required
                              renderSkeleton={(field) => (
                                <FormControl>
                                  <RadioGroup className="flex flex-col gap-2.5" onValueChange={field.onChange} defaultValue={field.value}>
                                    {CovidVaccinationOptions.map((option) => (
                                      <div key={option} className="flex items-center gap-2">
                                        <RadioGroupItem value={option} id={option} />
                                        <label htmlFor={option} className="text-sm font-medium text-gray-700 cursor-pointer">{option}</label>
                                      </div>
                                    ))}
                                  </RadioGroup>
                                </FormControl>
                              )}
                            />
                            <div className="space-y-5">
                              <CustomFormField fieldType={FormFieldType.INPUT} control={form.control} name="bloodGroup" label="Blood Group" placeholder="O+, A-, B+, AB-" required />
                              <CustomFormField fieldType={FormFieldType.INPUT} control={form.control} name="genoType" label="Genotype" placeholder="AA, AS, SS" required />
                            </div>
                          </div>
                        </section>
                      )}

                      {/* ── Step 4: Insurance ── */}
                      {currentStep === 3 && (
                        <section className="space-y-5">
                          <SectionTitle title="Insurance Information" description="Medical coverage and payment details" />
                          <div className="space-y-5">
                            <CustomFormField fieldType={FormFieldType.INPUT} control={form.control} name="policyNumber" label="Policy Number" placeholder="ABC123456789" required />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                              <div className="space-y-4">
                                <CustomFormField fieldType={FormFieldType.CHECKBOX} control={form.control} name="hmo" label="Covered by HMO" required />
                                <CustomFormField fieldType={FormFieldType.INPUT} control={form.control} name="hmoName" label="HMO Provider Name" placeholder="Enter HMO name" required />
                              </div>
                              <div className="space-y-4">
                                <CustomFormField fieldType={FormFieldType.CHECKBOX} control={form.control} name="company" label="Company Insurance" required />
                                <CustomFormField fieldType={FormFieldType.INPUT} control={form.control} name="companyName" label="Company Name" placeholder="Enter company name" required />
                              </div>
                            </div>
                            <CustomFormField fieldType={FormFieldType.CHECKBOX} control={form.control} name="privateClient" label="Private Client (Self-Pay)" required />
                          </div>
                        </section>
                      )}

                      {/* ── Navigation ── */}
                      <div className="flex items-center justify-between mt-10 pt-6 border-t border-gray-100">
                        <button
                          type="button"
                          onClick={handleBack}
                          disabled={currentStep === 0 || validatingStep}
                          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all
                                                        ${currentStep === 0
                              ? "invisible"
                              : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                            }`}
                        >
                          <ChevronLeft size={16} /> Back
                        </button>

                        {/* Step indicator — center */}
                        <div className="flex items-center gap-1.5">
                          {STEPS.map((_, idx) => (
                            <div key={idx} className={`h-1.5 rounded-full transition-all duration-300
                                                            ${idx === currentStep ? "w-5 bg-blue-600" : idx < currentStep ? "w-3 bg-green-500" : "w-3 bg-gray-200"}`} />
                          ))}
                        </div>

                        {currentStep < STEPS.length - 1 ? (
                          <button
                            type="button"
                            onClick={handleNext}
                            disabled={validatingStep}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm shadow-blue-200 transition-all disabled:opacity-60"
                          >
                            {validatingStep ? <Loader2 size={14} className="animate-spin" /> : null}
                            Next <ChevronRight size={16} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleFinalSubmit}
                            disabled={registerPatient.isPending}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm shadow-blue-200 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {registerPatient.isPending ? (
                              <><Loader2 size={14} className="animate-spin" /> Registering...</>
                            ) : (
                              <><CheckCircle2 size={15} /> Register Patient</>
                            )}
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </form>
              </Form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegistrationSuite;