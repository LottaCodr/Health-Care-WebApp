# Hospital EMR - API Reference & Service Layer

## 📚 Service Layer Functions (lib/appwrite-service.ts)

All functions are `"use server"` and handle Appwrite operations.

### PATIENT OPERATIONS

```typescript
// Create new patient
createPatient(patientData: Omit<Patient, "$id" | "$createdAt" | "$updatedAt">): Promise<Patient>

// Get patient by ID
getPatientById(patientId: string): Promise<Patient | null>

// Update patient status
updatePatientStatus(patientId: string, status: PatientStatus): Promise<Patient>

// List patients by status
listPatientsByStatus(status: PatientStatus): Promise<Patient[]>

// Search patients
searchPatients(query: string): Promise<Patient[]>
```

### CONSULTATION OPERATIONS

```typescript
// Create consultation
createConsultation(consultationData: Omit<Consultation, "$id" | "$createdAt" | "$updatedAt">): Promise<Consultation>

// Get consultation
getConsultationById(consultationId: string): Promise<Consultation | null>

// Get all consultations for patient
listConsultationsByPatient(patientId: string): Promise<Consultation[]>

// Get all consultations by doctor
listConsultationsByDoctor(doctorId: string): Promise<Consultation[]>

// Update consultation
updateConsultation(consultationId: string, updates: Partial<Consultation>): Promise<Consultation>
```

### PRESCRIPTION OPERATIONS

```typescript
// Create prescription
createPrescription(prescriptionData: Omit<Prescription, "$id" | "$createdAt" | "$updatedAt">): Promise<Prescription>

// Get prescription
getPrescriptionById(prescriptionId: string): Promise<Prescription | null>

// List prescriptions for patient
listPrescriptionsByPatient(patientId: string): Promise<Prescription[]>

// List pending prescriptions
listPendingPrescriptions(): Promise<Prescription[]>
```

### LAB REQUEST OPERATIONS

```typescript
// Create lab request
createLabRequest(labRequestData: Omit<LabRequest, "$id" | "$createdAt" | "$updatedAt">): Promise<LabRequest>

// Get lab request
getLabRequestById(requestId: string): Promise<LabRequest | null>

// Get all lab requests for patient
listLabRequestsByPatient(patientId: string): Promise<LabRequest[]>

// Get pending lab requests
listPendingLabRequests(): Promise<LabRequest[]>

// Update lab request (for result submission)
updateLabRequest(requestId: string, updates: Partial<LabRequest>): Promise<LabRequest>
```

### NURSING ACTION OPERATIONS

```typescript
// Create nursing action
createNursingAction(actionData: Omit<NursingAction, "$id" | "$createdAt" | "$updatedAt">): Promise<NursingAction>

// Get nursing action
getNursingActionById(actionId: string): Promise<NursingAction | null>

// Get all actions for patient
listNursingActionsByPatient(patientId: string): Promise<NursingAction[]>

// Get pending nursing actions
listPendingNursingActions(): Promise<NursingAction[]>

// Update nursing action (for vitals & completion)
updateNursingAction(actionId: string, updates: any): Promise<NursingAction>
```

### PAYMENT OPERATIONS

```typescript
// Create payment
createPayment(paymentData: Omit<Payment, "$id" | "$createdAt" | "$updatedAt">): Promise<Payment>

// Get payment
getPaymentById(paymentId: string): Promise<Payment | null>

// Get payments for patient
listPaymentsByPatient(patientId: string): Promise<Payment[]>

// Get pending payments
listPendingPayments(): Promise<Payment[]>
```

### DRUG DISPENSING OPERATIONS

```typescript
// Create dispensing record
createDrugDispensingRecord(dispensingData: Omit<DrugDispensingRecord, "$id" | "$createdAt" | "$updatedAt">): Promise<DrugDispensingRecord>

// Get dispensing record
getDrugDispensingById(recordId: string): Promise<DrugDispensingRecord | null>

// Get dispensing records for patient
listDispensingByPatient(patientId: string): Promise<DrugDispensingRecord[]>
```

### AUDIT OPERATIONS

```typescript
// Create audit log entry
createAuditLog(logData: Omit<AuditLog, "$id" | "$createdAt" | "$updatedAt">): Promise<AuditLog>

// Log action (convenience wrapper)
logAction(userId: string, action: string, entityType: string, entityId: string, changes?: any): Promise<void>
```

---

## 🪝 React Hooks Reference (hooks/use-emr.ts)

### PATIENT HOOKS

```typescript
// Fetch single patient
usePatient(patientId: string): UseAsyncState<Patient>
// Returns: { data: Patient | null, loading: boolean, error: Error | null }

// Fetch patients by status
usePatientsByStatus(status: PatientStatus): UseAsyncState<Patient[]>

// Search patients
useSearchPatients(query: string): UseAsyncState<Patient[]>
```

### CONSULTATION HOOKS

```typescript
// Fetch single consultation
useConsultation(consultationId: string): UseAsyncState<Consultation>

// Get consultations for patient
useConsultationsByPatient(patientId: string): UseAsyncState<Consultation[]>

// Get doctor's consultations
useConsultationsByDoctor(doctorId: string): UseAsyncState<Consultation[]>

// Create consultation mutation
useCreateConsultation(): { mutate: Function, loading: boolean, error: Error | null }

// Update consultation mutation
useUpdateConsultation(): { mutate: Function, loading: boolean, error: Error | null }
```

### PRESCRIPTION HOOKS

```typescript
// Fetch single prescription
usePrescription(prescriptionId: string): UseAsyncState<Prescription>

// Get prescriptions for patient
usePrescriptionsByPatient(patientId: string): UseAsyncState<Prescription[]>

// Get pending prescriptions
usePendingPrescriptions(): UseAsyncState<Prescription[]>

// Create prescription mutation
useCreatePrescription(): { mutate: Function, loading: boolean, error: Error | null }
```

### LAB REQUEST HOOKS

```typescript
// Fetch single lab request
useLabRequest(requestId: string): UseAsyncState<LabRequest>

// Get lab requests for patient
useLabRequestsByPatient(patientId: string): UseAsyncState<LabRequest[]>

// Get pending lab requests
usePendingLabRequests(): UseAsyncState<LabRequest[]>

// Create lab request mutation
useCreateLabRequest(): { mutate: Function, loading: boolean, error: Error | null }

// Update lab request mutation
useUpdateLabRequest(): { mutate: Function, loading: boolean, error: Error | null }
```

### NURSING ACTION HOOKS

```typescript
// Get pending nursing actions
usePendingNursingActions(): UseAsyncState<NursingAction[]>

// Get nursing actions for patient
useNursingActionsByPatient(patientId: string): UseAsyncState<NursingAction[]>

// Create nursing action mutation
useCreateNursingAction(): { mutate: Function, loading: boolean, error: Error | null }

// Update nursing action mutation
useUpdateNursingAction(): { mutate: Function, loading: boolean, error: Error | null }
```

### PAYMENT HOOKS

```typescript
// Get payments for patient
usePaymentsByPatient(patientId: string): UseAsyncState<Payment[]>

// Get pending payments
usePendingPayments(): UseAsyncState<Payment[]>

// Create payment mutation
useCreatePayment(): { mutate: Function, loading: boolean, error: Error | null }
```

### PHARMACY HOOKS

```typescript
// Get pending prescriptions (pharmacist view)
usePendingPrescriptions(): UseAsyncState<Prescription[]>

// Get dispensing records for patient
useDispensingRecordsByPatient(patientId: string): UseAsyncState<DrugDispensingRecord[]>

// Create dispensing record mutation
useCreateDispensingRecord(): { mutate: Function, loading: boolean, error: Error | null }
```

### PATIENT STATUS MUTATION

```typescript
// Update patient status
useUpdatePatientStatus(): { mutate: Function, loading: boolean, error: Error | null }
// Usage: mutate(patientId, newStatus)
```

---

## 🔐 Access Control API

### Role Protection Hook

```typescript
import { useRoleProtection } from '@/lib/role-utils';

// Usage in component
const { authorized, loading } = useRoleProtection([UserRole.Doctor, UserRole.Admin]);

if (!authorized) return <ErrorAlert message="Access Denied" />;
```

### Access Enforcement Server Functions

```typescript
import { enforceCollectionAccess, enforceDocumentAccess } from '@/lib/access-control';

// Check collection access
const check = await enforceCollectionAccess(
  { userId: "user123", role: UserRole.Doctor },
  "consultations",
  "read"
);
if (!check.allowed) throw new Error(check.reason);

// Check document-level access
const docCheck = await enforceDocumentAccess(
  { userId: "user123", role: UserRole.Doctor },
  "consultations",
  "consultation123",
  "write"
);
if (!docCheck.allowed) throw new Error(docCheck.reason);

// Get RLS filters for queries
const filters = getRowLevelSecurityFilter(
  { userId: "user123", role: UserRole.Nurse },
  "nursing_actions"
);
// Returns Query filters specific to nurse's assigned tasks
```

---

## ⏰ Real-Time Subscriptions API

```typescript
import { useRealtimeSubscriptions } from '@/lib/realtime-subscriptions';

useRealtimeSubscriptions({
  // Patient status changed to any value
  onPatientStatusChange?: (patientId: string, newStatus: PatientStatus) => void,
  
  // Lab request results submitted
  onLabRequestUpdate?: (requestId: string, data: LabRequest) => void,
  
  // Prescription marked as dispensed
  onPrescriptionDispensed?: (prescriptionId: string) => void,
  
  // Payment marked as completed
  onPaymentCompleted?: (paymentId: string) => void,
  
  // New consultation created
  onConsultationCreated?: (consultationId: string) => void,
  
  // Nursing action marked completed
  onNursingActionCompleted?: (actionId: string) => void,
});
```

---

## 📝 Audit Logging API

```typescript
import { useAuditLog, AuditActions } from '@/lib/audit-logging';

const { log } = useAuditLog();

// Log an action
await log(userId, {
  action: AuditActions.CONSULTATION_CREATED,
  entityType: 'Consultation',
  entityId: consultationId,
  details: {
    patientId: 'patient123',
    symptoms: 'Fever, cough',
    diagnosis: 'Common cold'
  }
});

// Available actions:
// PATIENT_REGISTERED
// PATIENT_STATUS_CHANGED
// CONSULTATION_CREATED / COMPLETED
// PRESCRIPTION_CREATED / DISPENSED
// LAB_REQUEST_CREATED / COMPLETED
// NURSING_ACTION_CREATED / COMPLETED
// PAYMENT_PROCESSED
// PATIENT_DISCHARGED
```

---

## 🔔 Notification Center API

```typescript
import { ActivityNotificationCenter } from '@/components/activity-notification-center';

// Add to layout
<ActivityNotificationCenter />

// Auto-subscribes to all real-time events
// Auto-displays notifications
// User can click to mark as read
```

---

## 💾 Type Definitions Reference

### Core Types

```typescript
interface Patient {
  $id: string;
  name: string;
  email: string;
  phone: string;
  gender: "Male" | "Female" | "Other";
  dateOfBirth: string;
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
  registeredBy: string;
  notes: string;
  $createdAt: string;
  $updatedAt: string;
}

interface Consultation {
  $id: string;
  patientId: string;
  doctorId: string;
  startTime: string;
  endTime?: string;
  symptoms: string;
  diagnosis: string;
  notes: string;
  status: "Scheduled" | "InProgress" | "Completed" | "Cancelled";
  $createdAt: string;
  $updatedAt: string;
}

interface Prescription {
  $id: string;
  consultationId: string;
  patientId: string;
  doctorId: string;
  medications: PrescriptionMedication[];
  instructions: string;
  dosageDuration: string;
  status: "Active" | "Dispensed" | "Completed";
  createdDate: string;
  $createdAt: string;
  $updatedAt: string;
}

// ... See types/models.ts for all types
```

---

## 🚀 Usage Examples

### Example 1: Doctor Creating Consultation

```typescript
import { useCreateConsultation, useUpdatePatientStatus } from '@/hooks/use-emr';
import { PatientStatus } from '@/types/models';
import { useAuditLog, AuditActions } from '@/lib/audit-logging';

export function ConsultationForm({ patientId }) {
  const { mutate: createConsultation } = useCreateConsultation();
  const { mutate: updateStatus } = useUpdatePatientStatus();
  const { log } = useAuditLog();
  const { user } = useAuth();

  const handleSubmit = async (data) => {
    // Create consultation
    const consultation = await createConsultation({
      patientId,
      doctorId: user?.$id,
      symptoms: data.symptoms,
      diagnosis: data.diagnosis,
      notes: data.notes,
      status: 'InProgress',
      startTime: new Date().toISOString(),
    });

    // Update patient status
    await updateStatus(patientId, PatientStatus.UnderConsultation);

    // Log action
    await log(user?.$id, {
      action: AuditActions.CONSULTATION_CREATED,
      entityType: 'Consultation',
      entityId: consultation.$id,
      details: data,
    });
  };
}
```

### Example 2: Lab Tech Submitting Results

```typescript
import { useUpdateLabRequest, useUpdatePatientStatus } from '@/hooks/use-emr';

export function LabResultEntry({ requestId, patientId }) {
  const { mutate: updateLabRequest } = useUpdateLabRequest();
  const { mutate: updateStatus } = useUpdatePatientStatus();

  const handleSubmit = async (results, file) => {
    await updateLabRequest(requestId, {
      status: 'Completed',
      results: results,
      resultFile: file,
      completionDate: new Date().toISOString(),
    });

    // Update patient status for doctor review
    await updateStatus(patientId, PatientStatus.AwaitingDoctorReview);
  };
}
```

### Example 3: Pharmacist Dispensing Medication

```typescript
import { useCreateDispensingRecord, useUpdatePatientStatus } from '@/hooks/use-emr';

export function DispenseMedication({ prescriptionId, patientId }) {
  const { mutate: createRecord } = useCreateDispensingRecord();
  const { mutate: updateStatus } = useUpdatePatientStatus();

  const handleDispense = async (medications) => {
    await createRecord({
      prescriptionId,
      patientId,
      pharmacistId: user?.$id,
      dispensedDate: new Date().toISOString(),
      dispensedMedications: medications,
    });

    // Route to payment
    await updateStatus(patientId, PatientStatus.AwaitingPayment);
  };
}
```

---

**Complete API Reference. All functions are type-safe and production-ready.**
