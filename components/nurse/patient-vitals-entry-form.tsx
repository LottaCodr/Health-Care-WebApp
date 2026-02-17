"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-provider";
import { usePatient, useCreateNursingAction, useUpdateNursingAction } from "@/hooks/use-emr";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, AlertCircle, CheckCircle2, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PatientVitalsFormProps {
  patientId: string;
  consultationId: string;
  onSuccess?: () => void;
}

/**
 * Patient Vitals Entry Form
 * Allows nurses to record patient vital signs
 * Creates or updates nursing actions for the patient
 */
export function PatientVitalsEntryForm({
  patientId,
  consultationId,
  onSuccess,
}: PatientVitalsFormProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch patient details
  const { data: patient, loading: patientLoading } = usePatient(patientId);
  const { mutate: createNursingAction, loading: creatingAction } = useCreateNursingAction();

  const [formData, setFormData] = useState({
    temperature: "",
    bloodPressureSystolic: "",
    bloodPressureDiastolic: "",
    heartRate: "",
    respiratoryRate: "",
    oxygenSaturation: "",
    weight: "",
    height: "",
    generalCondition: "",
    notes: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.temperature.trim()) {
      newErrors.temperature = "Temperature is required";
    } else if (isNaN(parseFloat(formData.temperature))) {
      newErrors.temperature = "Must be a valid number";
    }

    if (!formData.bloodPressureSystolic.trim()) {
      newErrors.bloodPressureSystolic = "Systolic BP is required";
    }

    if (!formData.bloodPressureDiastolic.trim()) {
      newErrors.bloodPressureDiastolic = "Diastolic BP is required";
    }

    if (!formData.heartRate.trim()) {
      newErrors.heartRate = "Heart rate is required";
    } else if (isNaN(parseInt(formData.heartRate))) {
      newErrors.heartRate = "Must be a valid number";
    }

    if (!formData.respiratoryRate.trim()) {
      newErrors.respiratoryRate = "Respiratory rate is required";
    }

    if (!formData.oxygenSaturation.trim()) {
      newErrors.oxygenSaturation = "O2 Saturation is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fill in all required vital signs");
      return;
    }

    try {
      // Create a nursing action record for vitals
      const vitalSigns = `
Temperature: ${formData.temperature}°C
Blood Pressure: ${formData.bloodPressureSystolic}/${formData.bloodPressureDiastolic} mmHg
Heart Rate: ${formData.heartRate} bpm
Respiratory Rate: ${formData.respiratoryRate} breaths/min
Oxygen Saturation: ${formData.oxygenSaturation}%
Weight: ${formData.weight || "N/A"} kg
Height: ${formData.height || "N/A"} cm
General Condition: ${formData.generalCondition || "N/A"}
Additional Notes: ${formData.notes || "None"}
      `.trim();

      await createNursingAction({
        patientId,
        consultationId,
        actionType: "Vitals",
        description: vitalSigns,
        status: "Completed",
        assignedNurse: user?.id || "",
        completionTime: new Date().toISOString(),
        completedBy: user?.id || "",
      });

      toast.success("Vital signs recorded successfully");

      // Reset form
      setFormData({
        temperature: "",
        bloodPressureSystolic: "",
        bloodPressureDiastolic: "",
        heartRate: "",
        respiratoryRate: "",
        oxygenSaturation: "",
        weight: "",
        height: "",
        generalCondition: "",
        notes: "",
      });

      // Callback or redirect
      if (onSuccess) {
        onSuccess();
      } else {
        setTimeout(() => router.back(), 1500);
      }
    } catch (error) {
      console.error("Error recording vitals:", error);
      toast.error("Failed to record vital signs. Please try again.");
    }
  };

  if (patientLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading patient information...</span>
        </CardContent>
      </Card>
    );
  }

  if (!patient) {
    return (
      <Card className="border-destructive">
        <CardContent className="flex items-center gap-3 py-6">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <div>
            <p className="font-semibold text-destructive">Patient not found</p>
            <p className="text-sm text-muted-foreground">Please check the patient ID and try again</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Record Patient Vitals</CardTitle>
        <CardDescription>
          Enter vital signs for {patient.name}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Patient Information */}
          <div className="bg-slate-50 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-slate-900">Patient Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Name:</span>
                <p className="font-medium">{patient.name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Age:</span>
                <p className="font-medium">
                  {calculateAge(patient.dateOfBirth)} years
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Gender:</span>
                <p className="font-medium">{patient.gender}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Blood Group:</span>
                <p className="font-medium">{patient.bloodGroup}</p>
              </div>
            </div>
          </div>

          {/* VITAL SIGNS SECTION */}
          <div className="border-t pt-6">
            <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Vital Signs <span className="text-destructive">*</span>
            </h3>

            <div className="grid grid-cols-2 gap-4 mb-4">
              {/* Temperature */}
              <div className="space-y-2">
                <Label htmlFor="temperature">
                  Temperature (°C) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="temperature"
                  name="temperature"
                  type="number"
                  step="0.1"
                  placeholder="36.5"
                  value={formData.temperature}
                  onChange={handleInputChange}
                  disabled={creatingAction}
                  className={errors.temperature ? "border-destructive" : ""}
                />
                {errors.temperature && (
                  <p className="text-sm text-destructive">{errors.temperature}</p>
                )}
                <p className="text-xs text-muted-foreground">Normal: 36.5-37.5°C</p>
              </div>

              {/* Heart Rate */}
              <div className="space-y-2">
                <Label htmlFor="heartRate">
                  Heart Rate (bpm) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="heartRate"
                  name="heartRate"
                  type="number"
                  placeholder="72"
                  value={formData.heartRate}
                  onChange={handleInputChange}
                  disabled={creatingAction}
                  className={errors.heartRate ? "border-destructive" : ""}
                />
                {errors.heartRate && (
                  <p className="text-sm text-destructive">{errors.heartRate}</p>
                )}
                <p className="text-xs text-muted-foreground">Normal: 60-100 bpm</p>
              </div>

              {/* Systolic Blood Pressure */}
              <div className="space-y-2">
                <Label htmlFor="bloodPressureSystolic">
                  Systolic BP (mmHg) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="bloodPressureSystolic"
                  name="bloodPressureSystolic"
                  type="number"
                  placeholder="120"
                  value={formData.bloodPressureSystolic}
                  onChange={handleInputChange}
                  disabled={creatingAction}
                  className={errors.bloodPressureSystolic ? "border-destructive" : ""}
                />
                {errors.bloodPressureSystolic && (
                  <p className="text-sm text-destructive">{errors.bloodPressureSystolic}</p>
                )}
                <p className="text-xs text-muted-foreground">Normal: 120 mmHg</p>
              </div>

              {/* Diastolic Blood Pressure */}
              <div className="space-y-2">
                <Label htmlFor="bloodPressureDiastolic">
                  Diastolic BP (mmHg) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="bloodPressureDiastolic"
                  name="bloodPressureDiastolic"
                  type="number"
                  placeholder="80"
                  value={formData.bloodPressureDiastolic}
                  onChange={handleInputChange}
                  disabled={creatingAction}
                  className={errors.bloodPressureDiastolic ? "border-destructive" : ""}
                />
                {errors.bloodPressureDiastolic && (
                  <p className="text-sm text-destructive">{errors.bloodPressureDiastolic}</p>
                )}
                <p className="text-xs text-muted-foreground">Normal: 80 mmHg</p>
              </div>

              {/* Respiratory Rate */}
              <div className="space-y-2">
                <Label htmlFor="respiratoryRate">
                  Respiratory Rate (breaths/min) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="respiratoryRate"
                  name="respiratoryRate"
                  type="number"
                  placeholder="16"
                  value={formData.respiratoryRate}
                  onChange={handleInputChange}
                  disabled={creatingAction}
                  className={errors.respiratoryRate ? "border-destructive" : ""}
                />
                {errors.respiratoryRate && (
                  <p className="text-sm text-destructive">{errors.respiratoryRate}</p>
                )}
                <p className="text-xs text-muted-foreground">Normal: 12-20 breaths/min</p>
              </div>

              {/* Oxygen Saturation */}
              <div className="space-y-2">
                <Label htmlFor="oxygenSaturation">
                  O2 Saturation (%) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="oxygenSaturation"
                  name="oxygenSaturation"
                  type="number"
                  step="0.1"
                  placeholder="98"
                  value={formData.oxygenSaturation}
                  onChange={handleInputChange}
                  disabled={creatingAction}
                  className={errors.oxygenSaturation ? "border-destructive" : ""}
                />
                {errors.oxygenSaturation && (
                  <p className="text-sm text-destructive">{errors.oxygenSaturation}</p>
                )}
                <p className="text-xs text-muted-foreground">Normal: 95-100%</p>
              </div>
            </div>
          </div>

          {/* ANTHROPOMETRIC SECTION */}
          <div className="border-t pt-6">
            <h3 className="text-base font-semibold mb-4">Anthropometric Measurements (Optional)</h3>

            <div className="grid grid-cols-2 gap-4">
              {/* Weight */}
              <div className="space-y-2">
                <Label htmlFor="weight">Weight (kg)</Label>
                <Input
                  id="weight"
                  name="weight"
                  type="number"
                  step="0.1"
                  placeholder="70"
                  value={formData.weight}
                  onChange={handleInputChange}
                  disabled={creatingAction}
                />
              </div>

              {/* Height */}
              <div className="space-y-2">
                <Label htmlFor="height">Height (cm)</Label>
                <Input
                  id="height"
                  name="height"
                  type="number"
                  placeholder="170"
                  value={formData.height}
                  onChange={handleInputChange}
                  disabled={creatingAction}
                />
              </div>
            </div>
          </div>

          {/* CLINICAL OBSERVATIONS */}
          <div className="border-t pt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="generalCondition">General Condition</Label>
              <select
                id="generalCondition"
                name="generalCondition"
                value={formData.generalCondition}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    generalCondition: e.target.value,
                  }))
                }
                disabled={creatingAction}
                className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white"
              >
                <option value="">Select condition...</option>
                <option value="Excellent">Excellent</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="Poor">Poor</option>
                <option value="Critical">Critical</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Any additional observations or concerns..."
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
                disabled={creatingAction}
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-2 border-t pt-6">
            <Button
              type="submit"
              disabled={creatingAction}
              className="flex-1"
            >
              {creatingAction ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Recording...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Record Vitals
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={creatingAction}
              onClick={() => router.back()}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function calculateAge(dateOfBirth: string): number {
  const birth = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}
