"use client";

import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2, AlertCircle, ChevronLeft, ChevronRight,
  Loader2, User, Phone, Heart, Shield, Stethoscope, Baby,
  Building2, Wallet, HeartHandshake, Pencil,
} from "lucide-react";
import { Form, FormControl } from "@/components/ui/form";
import CustomFormField from "@/components/CustomFormField";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PatientFormValidation } from "@/lib/validation";
import {
  CovidVaccinationOptions,
  GenderOptions,
  PatientFormDefaultValues,
  BloodGroupOptions,
  GenotypeOptions,
} from "@/constants";
import { FormFieldType } from "@/components/forms/PatientForm";
import { createPatient } from "@/lib/services/patient.service";
import { useAuth } from "@/context/auth-provider";
import { toast } from "sonner";
import { useFrontDeskStore } from "@/store/frontdesk-store";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcAge(dob?: string): { years: number; display: string; isChild: boolean } | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let years = now.getFullYear() - d.getFullYear();
  let months = now.getMonth() - d.getMonth();
  if (months < 0) { years--; months += 12; }
  if (now.getDate() < d.getDate()) months--;
  const isChild = years < 13;
  const display = years === 0
    ? `${months} month${months !== 1 ? "s" : ""} old`
    : years < 2 ? `${years}yr ${months}mo` : `${years} years old`;
  return { years, display, isChild };
}

function safeScrollToTop() {
  if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
}

// ─── Religion options ─────────────────────────────────────────────────────────

const RELIGION_OPTIONS = ["Christianity", "Islam", "Traditional", "Other"] as const;

// ─── Step config ──────────────────────────────────────────────────────────────

const STEPS = [
  { label: "Patient Info", description: "Personal details", icon: User },
  { label: "Emergency", description: "Next of kin", icon: Phone },
  { label: "Medical History", description: "Health background", icon: Heart },
  { label: "Insurance", description: "Coverage information", icon: Shield },
];

// Step 0–2 fields are static. Step 3 (Insurance) is computed dynamically —
// see getInsuranceFields() below — because only ONE of HMO / Company /
// Private applies at a time, and we must never block submission on fields
// that don't apply to the selected payment type.
const STEP_FIELDS = [
  ["name", "email", "phone", "birthDate", "religion", "gender", "address", "occupation"],
  ["emergencyContactName", "emergencyContactNumber", "emergencyContactRelationship", "emergencyContactEmail", "emergencyContactAddress"],
  ["allergies", "significantMedicationHistory", "longTermMedication", "covidVaccinationOptions", "bloodGroup", "genoType"],
];

type PaymentType = "hmo" | "company" | "private" | null;

function getPaymentType(values: { hmo?: boolean; company?: boolean; privateClient?: boolean }): PaymentType {
  if (values.privateClient) return "private";
  if (values.hmo)           return "hmo";
  if (values.company)       return "company";
  return null;
}

// Only validate the field that's actually relevant to the selected payment type.
// Self-pay needs nothing extra; HMO needs hmoName; Company needs companyName.
function getInsuranceFields(values: any): string[] {
  const type = getPaymentType(values);
  if (type === "hmo")     return ["hmoName"];
  if (type === "company") return ["companyName"];
  return [];   // private or unselected — nothing extra required
}

function getStepFields(step: number, values: any): string[] {
  if (step === 3) return getInsuranceFields(values);
  return STEP_FIELDS[step] ?? [];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionTitle({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6">
      <h3 className="text-lg font-bold text-gray-900">{title}</h3>
      {description && <p className="text-xs text-gray-400 mt-1">{description}</p>}
      <div className="h-0.5 w-8 bg-blue-600 mt-3 rounded-full" />
    </div>
  );
}

function VerticalStepper({ currentStep }: { currentStep: number }) {
  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0">
      <div className="flex items-center gap-3 mb-10">
        <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
          <Stethoscope size={19} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-black text-gray-900 tracking-tight">Patient Registration</p>
          <p className="text-[10px] text-gray-400 font-medium">Nile Valley Hospital</p>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isActive = idx === currentStep;
          const isDone = idx < currentStep;
          return (
            <div key={step.label} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200
                                    ${isActive ? "bg-blue-600 shadow-lg shadow-blue-200 scale-110" : isDone ? "bg-green-500" : "bg-gray-100"}`}>
                  {isDone ? <CheckCircle2 size={16} className="text-white" /> : <Icon size={16} className={isActive ? "text-white" : "text-gray-400"} />}
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`w-0.5 h-10 mt-1 rounded-full transition-colors duration-300 ${isDone ? "bg-green-400" : "bg-gray-100"}`} />
                )}
              </div>
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
      <div className="mt-auto pt-8 border-t border-gray-100">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Progress</p>
        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-blue-600 rounded-full transition-all duration-500"
            style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }} />
        </div>
        <p className="text-xs font-semibold text-gray-500 mt-2">Step {currentStep + 1} of {STEPS.length}</p>
      </div>
    </aside>
  );
}

function MobileProgress({ currentStep }: { currentStep: number }) {
  const Icon = STEPS[currentStep].icon;
  return (
    <div className="lg:hidden mb-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon size={14} className="text-blue-600" />
          <span className="text-sm font-bold text-gray-800">{STEPS[currentStep].label}</span>
        </div>
        <span className="text-xs text-gray-400">{currentStep + 1}/{STEPS.length}</span>
      </div>
      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-blue-600 rounded-full transition-all duration-500"
          style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }} />
      </div>
      <div className="flex items-center gap-1.5 mt-3">
        {STEPS.map((_, idx) => (
          <div key={idx} className={`h-1 rounded-full transition-all duration-300
                        ${idx === currentStep ? "w-6 bg-blue-600" : idx < currentStep ? "w-3 bg-green-500" : "w-3 bg-gray-200"}`} />
        ))}
      </div>
    </div>
  );
}

// ─── Religion field — dropdown with "Other" free-text fallback ───────────────

function ReligionField({ field }: { field: { value: string; onChange: (v: string) => void } }) {
  const isPreset = (RELIGION_OPTIONS as readonly string[]).includes(field.value);
  const [customMode, setCustomMode] = useState(!isPreset && !!field.value);

  if (customMode) {
    return (
      <div className="space-y-1.5">
        <input
          autoFocus
          value={field.value}
          onChange={e => field.onChange(e.target.value)}
          placeholder="Enter religion"
          className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400/25 focus:border-blue-400 focus:bg-white transition-all"
        />
        <button type="button"
          onClick={() => { setCustomMode(false); field.onChange(""); }}
          className="flex items-center gap-1 text-xs text-blue-600 hover:underline font-medium">
          <ChevronLeft size={12} /> Choose from list instead
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {RELIGION_OPTIONS.map(opt => {
        const isSelected = field.value === opt && opt !== "Other";
        return (
          <button key={opt} type="button"
            onClick={() => {
              if (opt === "Other") { setCustomMode(true); field.onChange(""); }
              else field.onChange(opt);
            }}
            className={`h-10 px-3 rounded-xl border text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
              isSelected
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-gray-50 text-gray-600 border-gray-200 hover:border-blue-300 hover:bg-white"
            }`}>
            {opt === "Other" && <Pencil size={11} />}
            {opt}
          </button>
        );
      })}
    </div>
  );
}

// ─── Payment type selector — mutually exclusive HMO / Company / Private ──────

function PaymentTypeSelector({ form }: { form: any }) {
  const hmo     = useWatch({ control: form.control, name: "hmo" as any });
  const company = useWatch({ control: form.control, name: "company" as any });
  const priv    = useWatch({ control: form.control, name: "privateClient" as any });

  const current: PaymentType = getPaymentType({
    hmo: typeof hmo === "boolean" ? hmo : false,
    company: typeof company === "boolean" ? company : false,
    privateClient: typeof priv === "boolean" ? priv : false,
  });

  function select(type: PaymentType) {
    form.setValue("hmo",           type === "hmo");
    form.setValue("company",       type === "company");
    form.setValue("privateClient", type === "private");
    // Clear the field that no longer applies, so stale data never gets submitted
    if (type !== "hmo")     form.setValue("hmoName", "");
    if (type !== "company") form.setValue("companyName", "");
    // Re-run validation for the (now possibly empty) insurance fields so any
    // stale error clears immediately instead of lingering until next trigger.
    form.clearErrors(["hmoName", "companyName"]);
  }

  const OPTIONS: { type: PaymentType; label: string; desc: string; icon: any }[] = [
    { type: "hmo",     label: "HMO Coverage",        desc: "Health insurance via HMO",       icon: HeartHandshake },
    { type: "company", label: "Company Insurance",   desc: "Covered by employer",             icon: Building2      },
    { type: "private", label: "Private (Self-Pay)",  desc: "Patient pays directly — no HMO",  icon: Wallet         },
  ];

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-gray-600">Payment Type <span className="text-red-500">*</span></p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {OPTIONS.map(opt => {
          const Icon       = opt.icon;
          const isSelected = current === opt.type;
          return (
            <button key={opt.type} type="button"
              onClick={() => select(opt.type)}
              className={`flex items-start gap-2.5 p-3.5 rounded-xl border-2 text-left transition-all ${
                isSelected
                  ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                  : "border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-white"
              }`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                isSelected ? "bg-blue-600" : "bg-white border border-gray-100"
              }`}>
                <Icon size={14} className={isSelected ? "text-white" : "text-gray-400"} />
              </div>
              <div>
                <p className={`text-xs font-bold ${isSelected ? "text-gray-900" : "text-gray-600"}`}>{opt.label}</p>
                <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">{opt.desc}</p>
              </div>
            </button>
          );
        })}
      </div>
      {current === null && (
        <p className="text-[11px] text-amber-600 font-medium pt-1">Select a payment type to continue.</p>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function RegistrationSuite() {
  const router = useRouter();
  const { user } = useAuth();

  const form = useForm<z.infer<typeof PatientFormValidation>>({
    resolver: zodResolver(PatientFormValidation),
    defaultValues: PatientFormDefaultValues as any,
    mode: "onTouched",
  });

  // DOB → live age + paediatric detection
  const watchedDOB = useWatch({ control: form.control, name: "birthDate" as any });
  const ageInfo = calcAge(watchedDOB as string);
  const isChild = ageInfo?.isChild ?? false;

  const { currentStep, childClass, parentInfo, referralInfo, setField, nextStep, prevStep, resetForm } = useFrontDeskStore();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [validatingStep, setValidatingStep] = useState(false);

  const validateStep = async () => {
    setValidatingStep(true);
    const fields = getStepFields(currentStep, form.getValues());
    const ok = await form.trigger(fields as any, { shouldFocus: true });

    // Insurance step also requires a payment type to be selected at all —
    // Zod alone can't express "exactly one of these three booleans is true"
    // without seeing the schema, so we enforce it here at the UI layer.
    if (currentStep === 3) {
      const type = getPaymentType(form.getValues());
      if (!type) { setValidatingStep(false); toast.error("Please select a payment type."); return false; }
    }

    setValidatingStep(false);
    return ok;
  };

  const handleNext = async () => {
    if (validatingStep) return;
    if (await validateStep()) nextStep(STEPS.length);
  };

  const handleBack = () => prevStep();

  const handleFinalSubmit = async () => {
    if (submitting) return;
    setSubmitError(null);

    const ok = await validateStep();
    if (!ok) { safeScrollToTop(); toast.error("Please fill all required fields."); return; }

    const v = form.getValues();
    setSubmitting(true);

    try {
      // camelCase form values → snake_case DB columns
      await createPatient({
        // Personal
        name: v.name,
        email: v.email,
        phone: v.phone,
        birth_date: v.birthDate,
        gender: v.gender,
        address: v.address,
        occupation: v.occupation,
        religion: v.religion,
        status: "sent-to-nurse",
        // Emergency contact
        emergency_contact_name: v.emergencyContactName,
        emergency_contact_number: v.emergencyContactNumber,
        emergency_contact_relationship: v.emergencyContactRelationship,
        emergency_contact_email: v.emergencyContactEmail,
        emergency_contact_address: v.emergencyContactAddress,
        // Medical
        allergies: v.allergies,
        significant_medication_history: v.significantMedicationHistory,
        long_term_medication: v.longTermMedication,
        covid_vaccination_options: v.covidVaccinationOptions,
        blood_group: v.bloodGroup,
        geno_type: v.genoType,
        // Insurance
        policy_number: v.policyNumber,
        hmo: v.hmo,
        hmo_name: v.hmo ? v.hmoName : null,
        company: v.company,
        company_name: v.company ? v.companyName : null,
        private_client: v.privateClient,
        // Meta
        user_id: user?.id ?? null,
        // Paediatric (only if child)
        ...(isChild ? {
          child_class: childClass || null,
          parent_info: parentInfo || null,
          referral_info: referralInfo || null,
        } : {}),
      } as any);

      toast.success("Patient registered successfully!");
      setSubmitted(true);
    } catch (err: any) {
      const msg = err?.message ?? err?.details ?? "Registration failed.";
      setSubmitError(msg); toast.error(msg); safeScrollToTop();
    } finally { setSubmitting(false); }
  };

  useEffect(() => { safeScrollToTop(); }, [currentStep]);

  useEffect(() => {
    if (!submitted) return;
    const t = setTimeout(() => {
      form.reset(); setSubmitted(false); resetForm();
      router.push("/front-desk/patient");
    }, 5000);
    return () => clearTimeout(t);
  }, [submitted, form, router]);

  const inputCls = "w-full h-10 px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400/25 focus:border-blue-400 focus:bg-white transition-all";

  const paymentType = getPaymentType(form.getValues());

  return (
    <div className="min-h-screen bg-gray-50/60 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex">

            {/* Sidebar */}
            <div className="hidden lg:block w-72 shrink-0 bg-gray-50/80 border-r border-gray-100 p-8">
              <VerticalStepper currentStep={currentStep} />
            </div>

            {/* Form */}
            <div className="flex-1 p-6 sm:p-8 lg:p-10">
              <Form {...form}>
                <form onSubmit={e => e.preventDefault()} autoComplete="off">

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
                          Patient has been registered and added to the system.
                        </p>
                      </div>
                      <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-xl">
                        <Loader2 size={13} className="text-blue-500 animate-spin" />
                        <p className="text-xs text-blue-600 font-medium">Redirecting in 5 seconds...</p>
                      </div>
                      <button type="button"
                        onClick={() => { setSubmitted(false); resetForm(); form.reset(); }}
                        className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors">
                        Register Another Patient
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Error banner */}
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

                      {/* ── Step 1: Personal Information ── */}
                      {currentStep === 0 && (
                        <section className="space-y-5">
                          <SectionTitle title="Personal Information" description="Basic details about the patient" />
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <CustomFormField fieldType={FormFieldType.INPUT} control={form.control} name="name" label="Full Name" placeholder="John Doe" required />

                            {/* Religion — dropdown, not free text */}
                            <CustomFormField fieldType={FormFieldType.SKELETON} control={form.control} name="religion" label="Religion" required
                              renderSkeleton={field => (
                                <FormControl>
                                  <ReligionField field={field} />
                                </FormControl>
                              )} />

                            <CustomFormField fieldType={FormFieldType.INPUT} control={form.control} name="email" label="Email Address" placeholder="patient@example.com" required />
                            <CustomFormField fieldType={FormFieldType.PHONE_INPUT} control={form.control} name="phone" label="Phone Number" placeholder="+234 800 000 0000" required />

                            {/* DOB with live age badge */}
                            <div className="space-y-1.5">
                              <CustomFormField fieldType={FormFieldType.DATE_PICKER} control={form.control} name="birthDate" label="Date of Birth" required />
                              {ageInfo && (
                                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold
                                                                    ${ageInfo.isChild ? "bg-blue-50 border-blue-100 text-blue-700" : "bg-gray-50 border-gray-100 text-gray-600"}`}>
                                  {ageInfo.isChild ? <Baby size={12} /> : <User size={12} />}
                                  Age: {ageInfo.display}
                                  {ageInfo.isChild && " · Paediatric"}
                                </div>
                              )}
                            </div>

                            <CustomFormField fieldType={FormFieldType.SKELETON} control={form.control} name="gender" label="Gender" required
                              renderSkeleton={field => (
                                <FormControl>
                                  <RadioGroup className="flex flex-row gap-4 h-11 items-center" onValueChange={field.onChange} defaultValue={field.value}>
                                    {GenderOptions.map(g => (
                                      <div key={g} className="flex items-center gap-2">
                                        <RadioGroupItem value={g} id={g} />
                                        <label htmlFor={g} className="text-sm font-medium text-gray-700 cursor-pointer">{g}</label>
                                      </div>
                                    ))}
                                  </RadioGroup>
                                </FormControl>
                              )} />

                            <CustomFormField fieldType={FormFieldType.INPUT} control={form.control} name="occupation" label="Occupation" placeholder="Software Engineer" required />
                            <CustomFormField fieldType={FormFieldType.INPUT} control={form.control} name="address" label="Residential Address" placeholder="123 Main Street, City" required />
                          </div>

                          {/* Paediatric section — auto-shows when age < 13 */}
                          {isChild && (
                            <div className="space-y-4 p-5 bg-blue-50 border border-blue-100 rounded-2xl">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Baby size={15} className="text-blue-600" />
                                <p className="text-sm font-bold text-blue-800">Paediatric Information</p>
                                <span className="text-[10px] font-black uppercase tracking-widest text-blue-500 bg-blue-100 px-2 py-0.5 rounded-full">
                                  Auto-detected · {ageInfo?.display}
                                </span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Class / School Year</p>
                                  <input value={childClass} onChange={e => setField("childClass", e.target.value)}
                                    placeholder="e.g. Primary 3, JSS 1" className={inputCls} />
                                </div>
                                <div className="space-y-1.5">
                                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Parent / Guardian</p>
                                  <input value={parentInfo} onChange={e => setField("parentInfo", e.target.value)}
                                    placeholder="Parent or guardian name" className={inputCls} />
                                </div>
                                <div className="space-y-1.5">
                                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Referral Source</p>
                                  <input value={referralInfo} onChange={e => setField("referralInfo", e.target.value)}
                                    placeholder="Referred by / school / clinic" className={inputCls} />
                                </div>
                              </div>
                            </div>
                          )}
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
                            <CustomFormField fieldType={FormFieldType.TEXTAREA} control={form.control} name="allergies" label="Known Allergies" placeholder="Penicillin, Peanuts, Latex..." required />
                            <CustomFormField fieldType={FormFieldType.TEXTAREA} control={form.control} name="significantMedicationHistory" label="Medical / Surgical History" placeholder="Diabetes, hypertension, surgeries..." required />
                            <div className="sm:col-span-2">
                              <CustomFormField fieldType={FormFieldType.TEXTAREA} control={form.control} name="longTermMedication" label="Long-Term Medications" placeholder="List ongoing medications and dosages..." required />
                            </div>
                            <CustomFormField fieldType={FormFieldType.SKELETON} control={form.control} name="covidVaccinationOptions" label="COVID-19 Vaccination Status" required
                              renderSkeleton={field => (
                                <FormControl>
                                  <RadioGroup className="flex flex-col gap-2.5" onValueChange={field.onChange} defaultValue={field.value}>
                                    {CovidVaccinationOptions.map(opt => (
                                      <div key={opt} className="flex items-center gap-2">
                                        <RadioGroupItem value={opt} id={opt} />
                                        <label htmlFor={opt} className="text-sm font-medium text-gray-700 cursor-pointer">{opt}</label>
                                      </div>
                                    ))}
                                  </RadioGroup>
                                </FormControl>
                              )} />
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

                          <PaymentTypeSelector form={form} />

                          {/* Only the field relevant to the selected payment type renders.
                              This is what actually fixes the self-pay blocking bug —
                              hmoName/companyName never get validated or submitted
                              unless their corresponding payment type is selected. */}
                          {paymentType === "hmo" && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                              <CustomFormField fieldType={FormFieldType.INPUT} control={form.control} name="hmoName" label="HMO Provider Name" placeholder="Enter HMO name" required />
                              <CustomFormField fieldType={FormFieldType.INPUT} control={form.control} name="policyNumber" label="Policy Number" placeholder="ABC123456789" />
                            </div>
                          )}

                          {paymentType === "company" && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                              <CustomFormField fieldType={FormFieldType.INPUT} control={form.control} name="companyName" label="Company Name" placeholder="Enter company name" required />
                              <CustomFormField fieldType={FormFieldType.INPUT} control={form.control} name="policyNumber" label="Policy Number" placeholder="ABC123456789" />
                            </div>
                          )}

                          {paymentType === "private" && (
                            <div className="flex items-center gap-2.5 px-4 py-3 bg-green-50 border border-green-100 rounded-xl">
                              <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                              <p className="text-xs text-green-700 font-medium">
                                No insurance details needed — patient will pay directly at checkout.
                              </p>
                            </div>
                          )}
                        </section>
                      )}

                      {/* Navigation */}
                      <div className="flex items-center justify-between mt-10 pt-6 border-t border-gray-100">
                        <button type="button" onClick={handleBack}
                          disabled={currentStep === 0 || validatingStep}
                          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all
                                                        ${currentStep === 0 ? "invisible" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`}>
                          <ChevronLeft size={16} /> Back
                        </button>

                        <div className="flex items-center gap-1.5">
                          {STEPS.map((_, idx) => (
                            <div key={idx} className={`h-1.5 rounded-full transition-all duration-300
                                                            ${idx === currentStep ? "w-5 bg-blue-600" : idx < currentStep ? "w-3 bg-green-500" : "w-3 bg-gray-200"}`} />
                          ))}
                        </div>

                        {currentStep < STEPS.length - 1 ? (
                          <button type="button" onClick={handleNext} disabled={validatingStep}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm shadow-blue-200 transition-all disabled:opacity-60">
                            {validatingStep && <Loader2 size={14} className="animate-spin" />}
                            Next <ChevronRight size={16} />
                          </button>
                        ) : (
                          <button type="button" onClick={handleFinalSubmit}
                            disabled={submitting || validatingStep}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm shadow-blue-200 transition-all disabled:opacity-60 disabled:cursor-not-allowed">
                            {submitting
                              ? <><Loader2 size={14} className="animate-spin" /> Registering...</>
                              : <><CheckCircle2 size={15} /> Register Patient</>
                            }
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
}