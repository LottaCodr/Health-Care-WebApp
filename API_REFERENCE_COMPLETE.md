# Hospital EMR - Complete API Reference

## Service Layer Functions

### Patient Operations

#### `createPatient(patientData)`
Creates a new patient record in the system.

**Parameters:**
```typescript
{
  name: string;
  email: string;
  phone: string;
  gender: "Male" | "Female" | "Other";
  dateOfBirth: string; // ISO date
  address: string;
  city: string;
  state: string;
  bloodGroup: string;
  genotype: string;
  allergies: string;
  medicalHistory: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;
  status: PatientStatus;
  registrationDate: string;
  registeredBy: string; // Staff ID
  notes: string;
}
```

**Returns:** `Patient`

**Example:**
```typescript
const patient = await createPatient({
  name: "John Doe",
  email: "john@example.com",
  phone: "1234567890",
  gender: "Male",
  dateOfBirth: "1990-01-15",
  address: "123 Main St",
  city: "Cairo",
  state: "Cairo",
  bloodGroup: "O+",
  genotype: "AA",
  allergies: "None",
  medicalHistory: "Hypertension",
  emergencyContactName: "Jane Doe",
  emergencyContactPhone: "0987654321",
  emergencyContactRelationship: "Spouse",
  status: PatientStatus.Registered,
  registrationDate: new Date().toISOString(),
  registeredBy: currentUserId,
  notes: "Regular checkup"
});
```

---

#### `getPatientById(patientId)`
Fetch a single patient by ID.

**Parameters:** `patientId: string`

**Returns:** `Patient | null`

---

#### `updatePatientStatus(patientId, status)`
Update patient's current status in the system.

**Parameters:**
- `patientId: string`
- `status: PatientStatus`

**Returns:** `Patient`

**Important:** Only valid transitions are allowed. Use `isValidTransition()` from `patient-status-utils.ts` to validate.

---

#### `listPatientsByStatus(status)`
Get all patients with a specific status.

**Parameters:** `status: PatientStatus`

**Returns:** `Patient[]`

**Example:**
```typescript
const awaitingConsultation = await listPatientsByStatus(PatientStatus.AwaitingConsultation);
const sentToNurse = await listPatientsByStatus(PatientStatus.SentToNurse);
```

---

#### `searchPatients(searchQuery)`
Search patients by name, email, or phone.

**Parameters:** `searchQuery: string`

**Returns:** `Patient[]`

---

#### `getAllPatients()`
Get all patients in the system (paginated).

**Parameters:** None

**Returns:** `Patient[]`

---

### Consultation Operations

#### `createConsultation(consultationData)`
Create a new consultation record.

**Parameters:**
```typescript
{
  patientId: string;
  doctorId: string;
  startTime: string; // ISO datetime
  symptoms: string;
  diagnosis: string;
  notes: string;
  status: "Scheduled" | "InProgress" | "Completed" | "Cancelled";
}
```

**Returns:** `Consultation`

---

#### `updateConsultation(consultationId, updates)`
Update consultation details.

**Parameters:**
- `consultationId: string`
- `updates: Partial<Consultation>`

**Returns:** `Consultation`

**Example:**
```typescript
await updateConsultation(consultationId, {
  diagnosis: "Hypertension Type 2",
  status: "Completed",
  endTime: new Date().toISOString()
});
```

---

#### `listConsultationsByDoctor(doctorId)`
Get all consultations for a specific doctor.

**Parameters:** `doctorId: string`

**Returns:** `Consultation[]`

---

#### `listConsultationsByPatient(patientId)`
Get all consultations for a specific patient.

**Parameters:** `patientId: string`

**Returns:** `Consultation[]`

---

### Prescription Operations

#### `createPrescription(prescriptionData)`
Create a new prescription.

**Parameters:**
```typescript
{
  consultationId: string;
  patientId: string;
  doctorId: string;
  medications: Array<{
    drugName: string;
    dosage: string; // e.g., "500mg"
    frequency: string; // e.g., "Twice daily"
    duration: string; // e.g., "10 days"
    instructions: string; // Special instructions
  }>;
  instructions: string;
  dosageDuration: string;
  status: "Active" | "Dispensed" | "Completed";
}
```

**Returns:** `Prescription`

---

#### `updatePrescription(prescriptionId, updates)`
Update prescription (e.g., mark as dispensed).

**Parameters:**
- `prescriptionId: string`
- `updates: Partial<Prescription>`

**Returns:** `Prescription`

---

#### `listPrescriptionsByPatient(patientId)`
Get all prescriptions for a patient.

**Parameters:** `patientId: string`

**Returns:** `Prescription[]`

---

#### `listPendingPrescriptions()`
Get all active (pending) prescriptions in the system.

**Parameters:** None

**Returns:** `Prescription[]`

---

### Lab Request Operations

#### `createLabRequest(labRequestData)`
Create a new lab test request.

**Parameters:**
```typescript
{
  patientId: string;
  consultationId: string;
  doctorId: string;
  testType: string; // e.g., "Blood Test", "X-Ray"
  testDescription: string;
  status: "Pending" | "InProgress" | "Completed" | "Cancelled";
  priority: "Normal" | "Urgent";
  requestDate: string;
}
```

**Returns:** `LabRequest`

---

#### `updateLabRequest(labRequestId, updates)`
Update lab request (e.g., add results).

**Parameters:**
- `labRequestId: string`
- `updates: Partial<LabRequest>`

**Returns:** `LabRequest`

**Example:**
```typescript
await updateLabRequest(labRequestId, {
  status: "Completed",
  results: "Blood glucose: 120 mg/dL, Status: Normal",
  completionDate: new Date().toISOString()
});
```

---

#### `listPendingLabRequests()`
Get all pending lab requests in the system.

**Parameters:** None

**Returns:** `LabRequest[]`

---

#### `listCompletedLabRequests()`
Get all completed lab requests.

**Parameters:** None

**Returns:** `LabRequest[]`

---

#### `completeLabRequest(labRequestId, results, patientId, nextStatus?)`
Complete a lab request and advance patient status.

**Parameters:**
- `labRequestId: string`
- `results: string` - Test results
- `patientId: string`
- `nextStatus?: PatientStatus` - Defaults to `AwaitingPayment`

**Returns:** `{ labRequest: LabRequest; patient: Patient }`

---

### Nursing Action Operations

#### `createNursingAction(actionData)`
Create a nursing task for a patient.

**Parameters:**
```typescript
{
  patientId: string;
  consultationId: string;
  actionType: string; // e.g., "Vitals", "Injection", "Wound Dressing"
  description: string;
  status: "Pending" | "Completed";
  assignedNurse: string; // Staff ID
}
```

**Returns:** `NursingAction`

---

#### `updateNursingAction(actionId, updates)`
Update nursing action status.

**Parameters:**
- `actionId: string`
- `updates: Partial<NursingAction>`

**Returns:** `NursingAction`

---

#### `listNursingActionsByPatient(patientId)`
Get all nursing actions for a patient.

**Parameters:** `patientId: string`

**Returns:** `NursingAction[]`

---

#### `listPendingNursingActions()`
Get all pending nursing actions.

**Parameters:** None

**Returns:** `NursingAction[]`

---

#### `completeNursingAction(actionId, patientId, completionNotes?, nextStatus?)`
Mark nursing action as complete and advance patient.

**Parameters:**
- `actionId: string`
- `patientId: string`
- `completionNotes?: string`
- `nextStatus?: PatientStatus` - Defaults to `AwaitingPayment`

**Returns:** `{ action: NursingAction; patient: Patient }`

---

### Payment Operations

#### `createPayment(paymentData)`
Process a payment for a patient.

**Parameters:**
```typescript
{
  patientId: string;
  amount: number;
  paymentMethod: "Cash" | "Card" | "Transfer" | "Cheque";
  status: "Pending" | "Completed" | "Failed" | "Refunded";
  description: string;
  processedBy: string; // Staff ID
  processedDate: string;
}
```

**Returns:** `Payment`

---

#### `listPendingPayments()`
Get all pending payments.

**Parameters:** None

**Returns:** `Payment[]`

---

#### `listPaymentsByPatient(patientId)`
Get payment history for a patient.

**Parameters:** `patientId: string`

**Returns:** `Payment[]`

---

### Drug Dispensing Operations

#### `createDrugDispensingRecord(dispensingData)`
Record drug dispensing from pharmacy.

**Parameters:**
```typescript
{
  prescriptionId: string;
  patientId: string;
  pharmacistId: string;
  dispensedDate: string;
  dispensedMedications: Array<{
    drugId: string;
    drugName: string;
    quantityDispensed: number;
    quantityRemaining: number;
    expiryDate: string;
    batchNumber: string;
  }>;
  notes: string;
}
```

**Returns:** `DrugDispensingRecord`

---

#### `dispensePrescription(prescriptionId, patientId, pharmacistId, dispensedMedications, nextStatus?)`
Dispense a prescription and update patient status.

**Parameters:**
- `prescriptionId: string`
- `patientId: string`
- `pharmacistId: string`
- `dispensedMedications: Array<{...}>`
- `nextStatus?: PatientStatus` - Defaults to `AwaitingPayment`

**Returns:** `{ prescription: Prescription; dispensing: DrugDispensingRecord; patient: Patient }`

---

### Patient Flow Utilities

#### `routePatientAfterConsultation(patientId, hasNursingActions, hasLabRequests, hasPrescription)`
Determine next patient status based on consultation services.

**Parameters:**
- `patientId: string`
- `hasNursingActions: boolean`
- `hasLabRequests: boolean`
- `hasPrescription: boolean`

**Returns:** `Patient` (with updated status)

**Logic:**
1. If nursing actions → `SentToNurse`
2. Else if lab requests → `SentToLab`
3. Else if prescription → `SentToPharmacy`
4. Else → `AwaitingPayment`

---

## React Hooks

### Patient Hooks

#### `usePatient(patientId)`
Fetch a single patient.

**Returns:**
```typescript
{
  data: Patient | null;
  loading: boolean;
  error: Error | null;
}
```

---

#### `usePatientsByStatus(status)`
Fetch patients by status.

**Returns:**
```typescript
{
  data: Patient[];
  loading: boolean;
  error: Error | null;
}
```

---

#### `useAllPatients()`
Fetch all patients in the system.

**Returns:**
```typescript
{
  data: Patient[];
  loading: boolean;
  error: Error | null;
}
```

---

### Mutation Hooks

#### `useCreateConsultation()`
Mutation hook for creating consultations.

**Returns:**
```typescript
{
  mutate: (data) => Promise<Consultation>;
  loading: boolean;
  error: Error | null;
}
```

**Example:**
```typescript
const { mutate, loading, error } = useCreateConsultation();

const handleCreateConsultation = async () => {
  try {
    const consultation = await mutate({
      patientId,
      doctorId,
      symptoms: "Fever and cough",
      diagnosis: "Common cold",
      notes: "Prescribed antibiotics",
      status: "Completed"
    });
    toast.success("Consultation recorded");
  } catch (err) {
    toast.error("Failed to record consultation");
  }
};
```

---

#### `useUpdatePatientStatus()`
Mutation hook for updating patient status.

**Returns:**
```typescript
{
  mutate: (patientId, status) => Promise<Patient>;
  loading: boolean;
  error: Error | null;
}
```

---

#### `useCompleteLabRequest()`
Mutation hook for completing lab requests.

**Returns:**
```typescript
{
  mutate: (labRequestId, results, patientId) => Promise<{...}>;
  loading: boolean;
  error: Error | null;
}
```

---

#### `useCompleteNursingAction()`
Mutation hook for completing nursing actions.

**Returns:**
```typescript
{
  mutate: (actionId, patientId, notes?) => Promise<{...}>;
  loading: boolean;
  error: Error | null;
}
```

---

#### `useDispensePrescription()`
Mutation hook for dispensing prescriptions.

**Returns:**
```typescript
{
  mutate: (prescriptionId, patientId, pharmacistId, medications) => Promise<{...}>;
  loading: boolean;
  error: Error | null;
}
```

---

#### `useRoutePatientAfterConsultation()`
Mutation hook for routing patients after consultation.

**Returns:**
```typescript
{
  mutate: (patientId, nursing, lab, prescription) => Promise<Patient>;
  loading: boolean;
  error: Error | null;
}
```

---

## Status Management Utilities

Located in `lib/patient-status-utils.ts`

#### `isValidTransition(fromStatus, toStatus): boolean`
Check if status transition is allowed.

---

#### `getStatusLabel(status): string`
Get human-readable status label.

---

#### `getStatusColor(status): string`
Get Tailwind CSS color classes for status badge.

---

#### `getResponsibleRole(status): string[]`
Get which role(s) handle the patient in current status.

---

#### `getPatientProgressPercentage(status): number`
Get patient's progress through hospital (0-100%).

---

#### `getNextSteps(status): string[]`
Get human-readable next steps for patient.

---

## Error Handling

All async operations use try-catch and throw errors:

```typescript
try {
  const patient = await createPatient(data);
} catch (error) {
  console.error("Error creating patient:", error);
  // Show user-friendly error message
}
```

Use toast notifications for user feedback:

```typescript
import { useToast } from "@/hooks/use-toast";

const { toast } = useToast();

try {
  await createPayment(paymentData);
  toast.success("Payment processed successfully");
} catch (error) {
  toast.error("Payment failed: " + error.message);
}
```

---

## Rate Limiting & Best Practices

1. **Debounce search**: Search queries are debounced by 300ms
2. **Avoid N+1 queries**: Load related data in bulk when possible
3. **Cache when appropriate**: Use React Query or similar for caching
4. **Batch operations**: Group multiple updates when possible

---

## Audit Logging

All significant actions are logged:

```typescript
import { logAction } from "@/lib/appwrite-service";

await createPatient(patientData);
await logAction(
  userId,          // Who did it
  "CREATE_PATIENT", // What action
  "Patient",        // What entity type
  patientId,        // Which entity
  { name, phone }   // Changes
);
```

---

**Last Updated:** February 2026
**API Version:** 1.0.0
