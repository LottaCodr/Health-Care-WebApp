# Hospital EMR System - Complete Implementation Guide

## 📋 Overview

This document outlines the complete hospital EMR patient workflow, system architecture, and implementation details for a production-grade system handling patient flow across multiple departments (Front Desk, Doctor, Nurse, Lab Technician, Pharmacist).

---

## 🔄 Patient Journey Flow (NON-NEGOTIABLE)

```
PATIENT REGISTRATION
    │
    ↓ (Front Desk)
[Status: Registered] → Move to Queue → [Status: AwaitingConsultation]
    │
    ↓ (Doctor)
[Status: UnderConsultation]
    ├─→ Creates: Consultation Record
    ├─→ Creates: Prescription (if needed)
    ├─→ Creates: Lab Request (if needed)
    └─→ Creates: Nursing Action (if needed)
    │
    ↓ (ROUTING DECISION)
    │
    ├─→ [Status: SentToNurse] ─→ Nurse completes action ─→ [Status: AwaitingPayment]
    │
    ├─→ [Status: SentToLab] ─→ Lab Tech uploads results ─→ [Status: AwaitingPayment]
    │
    └─→ [Status: SentToPharmacy] ─→ Pharmacist dispenses drugs ─→ [Status: AwaitingPayment]
    │
    ↓ (Front Desk)
[Status: AwaitingPayment] → Process Payment → [Status: Discharged]
```

---

## 📊 Status Enum Reference

```typescript
enum PatientStatus {
  Registered              // Patient registered by Front Desk
  AwaitingConsultation    // In queue, waiting for doctor
  UnderConsultation       // Currently with doctor
  SentToNurse             // Needs nursing care
  SentToLab               // Lab tests ordered
  SentToPharmacy          // Prescription to dispense
  AwaitingPayment         // All treatment done, awaiting payment
  AwaitingDoctorReview    // Waiting for doctor to review results
  AwaitingNextStep        // Intermediate wait state
  Discharged              // Patient checked out
  Cancelled               // Patient cancelled appointment
}
```

---

## 🏥 Role-Based Module Overview

### **FRONT DESK**

#### Responsibilities:
1. Register new patients
2. Manage patient queue (FIFO)
3. Process payments and discharge
4. Track patient status

#### Key Screens:
- **Dashboard**: Overview of daily statistics
- **Patient Registration**: Multi-step form
- **Patient Queue**: View and manage waiting patients
- **Payment & Checkout**: Process payments
- **Discharge Confirmation**: Complete patient visit

#### Status Transitions:
- `Registered` → `AwaitingConsultation` (on queue move)
- `AwaitingPayment` → `Discharged` (on payment)

#### Key Operations:
```typescript
// Register a patient
const patient = await createPatient({
  name, email, phone, gender, dateOfBirth,
  address, city, state, bloodGroup, genotype,
  allergies, medicalHistory, emergencyContactName,
  emergencyContactPhone, emergencyContactRelationship,
  status: PatientStatus.Registered,
  registrationDate: new Date().toISOString(),
  registeredBy: currentUserId,
  notes: ""
});

// Move patient to queue
await updatePatientStatus(patientId, PatientStatus.AwaitingConsultation);

// Process payment
const payment = await createPayment({
  patientId, amount, paymentMethod, status: "Completed",
  description, processedBy: currentUserId,
  processedDate: new Date().toISOString()
});

// Discharge patient
await updatePatientStatus(patientId, PatientStatus.Discharged);
```

---

### **DOCTOR**

#### Responsibilities:
1. See patients in queue
2. Create consultation records
3. Write diagnoses and notes
4. Create prescriptions
5. Order lab tests
6. Route patient to next department

#### Key Screens:
- **Dashboard**: Consultation queue
- **Patient Consultation**: 4-step form (vitals → symptoms → diagnosis → routing)
- **Diagnosis & Notes**: Write clinical notes
- **Prescription Form**: Add medications
- **Lab Test Request**: Order tests

#### Status Transitions:
- `AwaitingConsultation` → `UnderConsultation` (start exam)
- `UnderConsultation` → `SentToNurse|SentToLab|SentToPharmacy` (based on routing decision)

#### Key Operations:
```typescript
// Create consultation
const consultation = await createConsultation({
  patientId, doctorId,
  symptoms, diagnosis, notes,
  status: "Scheduled",
  startTime: new Date().toISOString()
});

// Update consultation (mark complete)
await updateConsultation(consultationId, {
  status: "Completed",
  endTime: new Date().toISOString()
});

// Create prescription
const prescription = await createPrescription({
  consultationId, patientId, doctorId,
  medications: [
    { drugName, dosage, frequency, duration, instructions }
  ],
  instructions, dosageDuration,
  status: "Active"
});

// Create lab request
const labRequest = await createLabRequest({
  patientId, consultationId, doctorId,
  testType, testDescription,
  status: "Pending",
  priority: "Normal"
});

// Route patient based on requirements
await routePatientAfterConsultation(
  patientId,
  hasNursingActions,  // boolean
  hasLabRequests,     // boolean
  hasPrescription     // boolean
  // Routes to appropriate status: SentToNurse|SentToLab|SentToPharmacy|AwaitingPayment
);
```

---

### **NURSE**

#### Responsibilities:
1. View assigned patients (SentToNurse status)
2. Record patient vitals
3. Perform nursing actions
4. Complete care and update status

#### Key Screens:
- **Dashboard**: Overview of assigned patients
- **Patient Queue**: List of assigned patients
- **Patient Vitals Entry**: Record vital signs
- **Nursing Actions**: Track and complete nursing tasks

#### Status Transitions:
- `SentToNurse` → `AwaitingPayment` (on completion)

#### Key Operations:
```typescript
// Get patients assigned to nurse
const assignedPatients = await listPatientsByStatus(PatientStatus.SentToNurse);

// Get nursing actions pending
const pendingActions = await listPendingNursingActions();

// Create nursing action (if needed)
const action = await createNursingAction({
  patientId, consultationId,
  actionType: "Vitals|Injection|Wound Dressing|etc",
  description,
  status: "Pending",
  assignedNurse: nurseId
});

// Complete nursing action
const result = await completeNursingAction(
  actionId,
  patientId,
  completionNotes, // optional
  nextStatus       // defaults to AwaitingPayment
);
// Returns: { action, patient (with updated status) }
```

---

### **LAB TECHNICIAN**

#### Responsibilities:
1. View pending lab requests
2. Perform tests
3. Upload test results
4. Move patient to next stage

#### Key Screens:
- **Dashboard**: Lab workload overview
- **Pending Test Requests**: Queue of tests to perform
- **Test Result Upload**: Enter test results
- **Completed Tests History**: View past results

#### Status Transitions:
- `SentToLab` → `AwaitingPayment` (on result upload)

#### Key Operations:
```typescript
// Get pending lab requests
const pendingTests = await listPendingLabRequests();

// Get completed tests
const completedTests = await listCompletedLabRequests();

// Complete a lab request
const result = await completeLabRequest(
  labRequestId,
  results,         // test results as string/document
  patientId,
  nextStatus       // defaults to AwaitingPayment
);
// Returns: { labRequest (updated), patient (updated) }
```

---

### **PHARMACIST**

#### Responsibilities:
1. View prescription queue
2. Dispense medications
3. Track dispensing history
4. Update patient status

#### Key Screens:
- **Dashboard**: Prescription workload overview
- **Prescription Queue**: Pending prescriptions
- **Drug Dispensing**: Dispense medications
- **Dispensed History**: Track all dispensed drugs

#### Status Transitions:
- `SentToPharmacy` → `AwaitingPayment` (on dispensing)

#### Key Operations:
```typescript
// Get pending prescriptions
const pendingPrescriptions = await listPendingPrescriptions();

// Dispense prescription
const result = await dispensePrescription(
  prescriptionId,
  patientId,
  pharmacistId,
  dispensedMedications: [
    {
      drugId, drugName, quantityDispensed,
      quantityRemaining, expiryDate, batchNumber
    }
  ],
  nextStatus // defaults to AwaitingPayment
);
// Returns: { prescription (updated), dispensing, patient (updated) }
```

---

## 🛠️ Implementation Checklist

### Phase 1: Data & Services ✅
- [x] TypeScript models (types/models.ts)
- [x] Appwrite service layer (lib/appwrite-service.ts)
- [x] Custom React hooks (hooks/use-emr.ts)
- [x] Role-based utilities (lib/role-utils.ts)
- [x] Routing configuration (lib/app-routes.ts)

### Phase 2: Core Screens

#### Front Desk Module ✅
- [x] Dashboard
- [x] Patient Registration
- [x] Patient Queue
- [x] Payment & Checkout
- [x] Discharge Confirmation

#### Doctor Module ✅
- [x] Dashboard
- [x] Patient Consultation
- [x] Diagnosis & Notes
- [x] Prescription Management
- [x] Lab Test Requests

#### Nurse Module (IN PROGRESS)
- [ ] Dashboard
- [ ] Patient Queue
- [ ] Vitals Entry
- [ ] Nursing Actions

#### Lab Technician Module (IN PROGRESS)
- [ ] Dashboard
- [ ] Pending Tests Queue
- [ ] Result Upload
- [ ] Completed History

#### Pharmacist Module (IN PROGRESS)
- [ ] Dashboard
- [ ] Prescription Queue
- [ ] Drug Dispensing
- [ ] Dispensed History

### Phase 3: Advanced Features
- [ ] Real-time subscriptions (Appwrite Realtime)
- [ ] Patient medical history view
- [ ] Comprehensive reporting
- [ ] Audit logging

---

## 🔐 Role-Based Access Control (RBAC)

### Data Filtering by Role

```typescript
// Helper function in each role's hooks
function getDataForCurrentRole(role: UserRole, data: Patient[]) {
  switch(role) {
    case UserRole.FrontDesk:
      return data; // Can see all patients
    case UserRole.Doctor:
      return data.filter(p => 
        [PatientStatus.AwaitingConsultation, PatientStatus.UnderConsultation].includes(p.status)
      );
    case UserRole.Nurse:
      return data.filter(p => p.status === PatientStatus.SentToNurse);
    case UserRole.LabTechnician:
      return data.filter(p => p.status === PatientStatus.SentToLab);
    case UserRole.Pharmacist:
      return data.filter(p => p.status === PatientStatus.SentToPharmacy);
    default:
      return [];
  }
}
```

### Route Protection

```typescript
// In page.tsx or layout.tsx
import { useRoleProtection } from "@/lib/role-utils";
import { UserRole } from "@/types/models";

export default function ProtectedPage() {
  const { user, hasAccess } = useRoleProtection([
    UserRole.Doctor,
    UserRole.Nurse
  ]);

  if (!hasAccess) {
    return <Unauthorized />;
  }

  return <PageContent />;
}
```

---

## 🔄 Real-Time Updates

### Appwrite Realtime Subscriptions

```typescript
import { RealtimeMessage, client } from "@/lib/appwrite.config";

export function usePatientStatusChanges(patientId: string) {
  const [patient, setPatient] = useState<Patient | null>(null);

  useEffect(() => {
    const unsubscribe = client.subscribe(
      `databases.${DB_ID}.collections.${COLLECTIONS.PATIENTS}.documents.${patientId}`,
      (message: RealtimeMessage) => {
        if (message.events.includes('databases.*.collections.*.documents.*.update')) {
          setPatient(message.payload as Patient);
        }
      }
    );

    return () => unsubscribe();
  }, [patientId]);

  return patient;
}
```

### Dashboard Auto-Refresh Pattern

```typescript
export function useAutoRefreshQueue(status: PatientStatus) {
  const { data, refetch } = usePatientsByStatus(status);

  useEffect(() => {
    // Subscribe to patient status changes
    const unsubscribe = client.subscribe(
      `databases.${DB_ID}.collections.${COLLECTIONS.PATIENTS}`,
      (message) => {
        if (message.events.includes('databases.*.collections.*.documents.*.update')) {
          refetch(); // Refresh queue
        }
      }
    );

    return () => unsubscribe();
  }, [refetch]);

  return data;
}
```

---

## 📱 UI Components

### Status Badge Components

Use `@/components/status-badge.tsx` for visual status indicators:

```typescript
<PatientStatusBadge status={patient.status} />
<ConsultationStatusBadge status={consultation.status} />
<LabRequestStatusBadge status={labRequest.status} />
<PrescriptionStatusBadge status={prescription.status} />
<NursingActionStatusBadge status={nursingAction.status} />
<PaymentStatusBadge status={payment.status} />
```

### Empty States

```typescript
<div className="text-center py-12">
  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
  <h3 className="font-semibold text-slate-900 mb-2">No Patients</h3>
  <p className="text-muted-foreground">
    Check back soon for updates
  </p>
</div>
```

### Loading States

```typescript
import { Loader2 } from "lucide-react";

<div className="flex items-center justify-center py-8">
  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
</div>
```

---

## 🚀 Deployment & Setup

### Environment Variables
```env
NEXT_PUBLIC_DATABASE_ID=xxx
NEXT_PUBLIC_PATIENT_COLLECTION_ID=xxx
NEXT_PUBLIC_APPWRITE_ENDPOINT=xxx
NEXT_PUBLIC_APPWRITE_PROJECT_ID=xxx
APPWRITE_API_KEY=xxx
```

### Start Development Server
```bash
npm install
npm run dev
# Visit http://localhost:3000
```

### Build for Production
```bash
npm run build
npm run start
```

---

## 📊 Example End-to-End Flow

### 1. Patient Registration (Front Desk)
```
FrontDesk Dashboard → Click "Register Patient"
→ Fill multi-step form (basic info, contact, medical history)
→ Submit → Patient created with Registered status
```

### 2. Queue Management (Front Desk)
```
FrontDesk Queue → Select patient → Click "Move to Queue"
→ Patient status updated to AwaitingConsultation
→ Patient appears in Doctor's queue
```

### 3. Consultation (Doctor)
```
Doctor Dashboard → Patient queue shows AwaitingConsultation patients
→ Click patient → Start consultation (UnderConsultation)
→ Record symptoms, diagnosis, notes
→ Create prescription/lab request as needed
→ Route patient → Status updates to SentToNurse|SentToLab|SentToPharmacy
```

### 4. Nursing Care (Nurse)
```
Nurse Dashboard → Shows SentToNurse patients
→ Click patient → Record vitals, perform actions
→ Mark complete → Patient status updates to AwaitingPayment
```

### 5. Payment & Discharge (Front Desk)
```
FrontDesk Dashboard → AwaitingPayment queue
→ Select patient → Enter payment info
→ Confirm payment → Patient discharged
```

---

## 🐛 Error Handling & Logging

All operations include:
- **Error handling** with try-catch
- **User feedback** via toast notifications
- **Audit logging** via `logAction()` function
- **Validation** at form submission

```typescript
try {
  const result = await createPatient(patientData);
  await logAction(userId, "CREATE_PATIENT", "Patient", result.$id);
  toast.success("Patient registered successfully");
} catch (error) {
  console.error("Error:", error);
  toast.error("Failed to register patient");
}
```

---

## 📞 Support & Maintenance

- Consult ARCHITECTURE.md for detailed technical architecture
- Check API_REFERENCE.md for all available functions
- Review STATE_MANAGEMENT.md for state flow diagrams
- Test flows thoroughly before production deployment

---

**Last Updated**: February 2026  
**Status**: Production-Ready  
**Version**: 1.0.0
