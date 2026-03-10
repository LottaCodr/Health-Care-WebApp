# Hospital EMR - Patient Status Flow & Workflow Routing

## 📊 Complete Patient Status State Machine

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PATIENT JOURNEY MAP                                │
└─────────────────────────────────────────────────────────────────────────────┘

ENTRY POINT
    │
    ↓
┌─────────────────────────────────────────┐
│  REGISTERED                              │
│  ◆ Front Desk: Register patient          │
│  ◆ Collects: Personal & Medical info    │
│  ◆ System: Creates patient record       │
└────────────┬────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────┐
│  AWAITING_CONSULTATION                   │
│  ◆ Front Desk: Queue management         │
│  ◆ Queue Position: FIFO ordered         │
│  ◆ Waiting for: Doctor availability     │
└────────────┬────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────┐
│  UNDER_CONSULTATION                      │
│  ◆ Doctor: Examining patient            │
│  ◆ Recording: Symptoms & Diagnosis      │
│  ◆ Duration: 15-60 minutes              │
└────────────┬────────────────────────────┘
             │
    ┌────────┼────────┬───────────────┐
    │        │        │               │
    ↓        ↓        ↓               ↓
    
SENT_TO_     SENT_TO_    SENT_TO_    AWAITING_
NURSE        LAB         PHARMACY    PAYMENT
│            │           │           │
│            │           │           │
v            v           v           v

┌──────────┐ ┌────────┐  ┌─────────┐  (No other services)
│ NURSING  │ │  LAB   │  │PHARMACY │  
│ ACTIONS  │ │ TESTS  │  │DISPENSING
└────┬─────┘ └───┬────┘  └────┬────┘
     │           │            │
     │ Record    │ Submit     │ Mark drugs
     │ vitals    │ results    │ dispensed
     │           │            │
     ↓           ↓            ↓
AWAITING_     AWAITING_     AWAITING_
NEXT_STEP     DOCTOR_       PAYMENT
              REVIEW
     │           │            │
     ├───────────┼────────────┤
     │           │            │
     └───────────┼────────────┘
                 │
                 ↓
        ┌──────────────────┐
        │ AWAITING_PAYMENT │
        │ ◆ Front Desk     │
        │ ◆ Process payment│
        └────────┬─────────┘
                 │
                 ↓
        ┌──────────────────┐
        │  DISCHARGED      │
        │  EXIT POINT      │
        └──────────────────┘
```

---

## 🎯 Detailed Status Transitions

### REGISTERED → AWAITING_CONSULTATION
**Trigger:** Patient registration form submitted
**Actor:** Front Desk
**System Action:** `updatePatientStatus(patientId, "AwaitingConsultation")`
**Audit Log:** PATIENT_REGISTERED

```typescript
// In app/front-desk/patient-registration.tsx
const handleSubmit = async () => {
  const patient = await createPatient(formData);
  // Status automatically set to "Registered"
  // Front Desk clicks "Add to Queue"
  await updatePatientStatus(patient.$id, PatientStatus.AwaitingConsultation);
};
```

### AWAITING_CONSULTATION → UNDER_CONSULTATION
**Trigger:** Doctor clicks "Start Consultation"
**Actor:** Doctor
**System Action:** `updatePatientStatus(patientId, "UnderConsultation")`
**Duration:** Consultation form open

```typescript
// In app/doctor/patient-consultation-v2.tsx
const handleStartConsultation = async () => {
  await updatePatientStatus(selectedPatientId, PatientStatus.UnderConsultation);
  setCurrentStep(1); // Start consultation form
};
```

### UNDER_CONSULTATION → SENT_TO_NURSE/LAB/PHARMACY/AWAITING_PAYMENT
**Trigger:** Doctor completes consultation form
**Actor:** Doctor
**Decision:** Based on checkboxes:
- ☑ Send to Nursing → SentToNurse
- ☑ Create Lab Tests → SentToLab
- ☑ Create Prescription → SentToPharmacy
- ☐ None selected → AwaitingPayment

```typescript
// In app/doctor/patient-consultation-v2.tsx
const handleSubmitConsultation = async () => {
  // Create consultation record
  const consultation = await createConsultation({...});

  // Create prescriptions if selected
  if (formData.prescriptions.length > 0) {
    for (const med of formData.prescriptions) {
      await createPrescription({...});
    }
  }

  // Create lab requests if selected
  if (formData.labTests.length > 0) {
    for (const test of formData.labTests) {
      await createLabRequest({...});
    }
  }

  // Create nursing actions if selected
  if (formData.sendToNurse) {
    await createNursingAction({...});
  }

  // Determine final status
  let finalStatus = PatientStatus.AwaitingPayment;
  if (formData.sendToNurse) finalStatus = PatientStatus.SentToNurse;
  else if (formData.labTests.length > 0) finalStatus = PatientStatus.SentToLab;
  else if (formData.prescriptions.length > 0) finalStatus = PatientStatus.SentToPharmacy;

  await updatePatientStatus(selectedPatientId, finalStatus);
};
```

### SENT_TO_NURSE → AWAITING_NEXT_STEP
**Trigger:** Nurse completes vitals and treatment
**Actor:** Nurse
**Required Data:** BP, Temp, Pulse, Treatment description
**System Action:** `updatePatientStatus(patientId, "AwaitingNextStep")`

```typescript
// In app/nurse/task/[id]/page.tsx
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // Update nursing action with vitals
  await updateAction(taskId, {
    status: "Completed",
    description: `BP: ${vitalsBP}, Temp: ${vitalsTemp}°C, Pulse: ${vitalsPulse} bpm...`,
    completedBy: user?.$id,
    completionTime: new Date().toISOString(),
  });

  // Patient moves to AwaitingNextStep
  await updatePatientStatus(updatedAction.patientId, "AwaitingNextStep" as any);
};
```

### SENT_TO_LAB → AWAITING_DOCTOR_REVIEW
**Trigger:** Lab tech submits test results
**Actor:** Lab Technician
**Required Data:** Test results (text), optional file upload
**System Action:** `updatePatientStatus(patientId, "AwaitingDoctorReview")`

```typescript
// In app/lab-tech/test/[id]/page.tsx
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // Submit lab results
  await updateLabRequest(testId, {
    status: "Completed",
    results: results,
    resultFile: fileData,
    completionDate: new Date().toISOString(),
  });

  // Patient moves to AwaitingDoctorReview
  await updatePatientStatus(
    updatedRequest.patientId,
    "AwaitingDoctorReview" as any
  );
};
```

### SENT_TO_PHARMACY → AWAITING_PAYMENT
**Trigger:** Pharmacist marks medications as dispensed
**Actor:** Pharmacist
**Required Data:** Select which medications were dispensed
**System Action:** `updatePatientStatus(patientId, "AwaitingPayment")`

```typescript
// In app/pharmacist/dispense/[id]/page.tsx
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // Create dispensing record
  await createRecord({
    prescriptionId,
    patientId: prescription.patientId,
    pharmacistId: user?.$id,
    dispensedDate: new Date().toISOString(),
    dispensedMedications: dispensedList,
    notes,
  });

  // Patient moves to AwaitingPayment
  await updatePatientStatus(prescription.patientId, "AwaitingPayment" as any);
};
```

### AWAITING_PAYMENT → DISCHARGED
**Trigger:** Front Desk processes payment
**Actor:** Front Desk
**Required Data:** Amount, payment method, description
**System Action:** `updatePatientStatus(patientId, "Discharged")`

```typescript
// In app/front-desk/payment-checkout-v2.tsx
const handleSubmitPayment = async (e: React.FormEvent) => {
  e.preventDefault();

  // Create payment record
  const payment = await createPaymentMutation.mutate({
    patientId: selectedPatientId,
    amount: formData.amount,
    paymentMethod: formData.paymentMethod,
    status: "Completed",
    description: formData.description,
    processedBy: user?.$id || "unknown",
    processedDate: new Date().toISOString(),
  });

  // Patient is discharged
  await updatePatientStatusMutation.mutate(
    selectedPatientId,
    PatientStatus.Discharged
  );
};
```

---

## 🔄 Status Query Reference

### Front Desk Dashboard Query
```typescript
// Shows patients awaiting consultation
const patients = await listPatientsByStatus(PatientStatus.AwaitingConsultation);
```

### Doctor Dashboard Query
```typescript
// Shows patients in queue
const queue = await listPatientsByStatus(PatientStatus.AwaitingConsultation);

// Shows doctor's active consultations
const myConsultations = await listConsultationsByDoctor(doctorId);
```

### Nurse Dashboard Query
```typescript
// Shows all pending nursing actions
const tasks = await listPendingNursingActions();

// Shows specific patient's nursing history
const history = await listNursingActionsByPatient(patientId);
```

### Lab Tech Dashboard Query
```typescript
// Shows all pending lab requests
const tests = await listPendingLabRequests();
```

### Pharmacist Dashboard Query
```typescript
// Shows all active prescriptions
const prescriptions = await listPendingPrescriptions();
```

### Payment Dashboard Query
```typescript
// Shows patients awaiting payment
const paymentQueue = await listPatientsByStatus(PatientStatus.AwaitingPayment);

// Shows specific patient's payment history
const history = await listPaymentsByPatient(patientId);
```

---

## 📊 Status Distribution Dashboard Query

```typescript
// Admin view - all patient statuses
const statuses = [
  PatientStatus.Registered,
  PatientStatus.AwaitingConsultation,
  PatientStatus.UnderConsultation,
  PatientStatus.SentToNurse,
  PatientStatus.SentToLab,
  PatientStatus.SentToPharmacy,
  PatientStatus.AwaitingPayment,
  PatientStatus.AwaitingDoctorReview,
  PatientStatus.AwaitingNextStep,
  PatientStatus.Discharged,
  PatientStatus.Cancelled,
];

const distribution = await Promise.all(
  statuses.map(status => listPatientsByStatus(status))
);
```

---

## 🚨 Status Validation Rules

### Allowed Transitions

```typescript
const ALLOWED_TRANSITIONS: Record<PatientStatus, PatientStatus[]> = {
  [PatientStatus.Registered]: [
    PatientStatus.AwaitingConsultation,
    PatientStatus.Cancelled,
  ],
  [PatientStatus.AwaitingConsultation]: [
    PatientStatus.UnderConsultation,
    PatientStatus.Cancelled,
  ],
  [PatientStatus.UnderConsultation]: [
    PatientStatus.SentToNurse,
    PatientStatus.SentToLab,
    PatientStatus.SentToPharmacy,
    PatientStatus.AwaitingPayment,
    PatientStatus.Cancelled,
  ],
  [PatientStatus.SentToNurse]: [
    PatientStatus.AwaitingNextStep,
    PatientStatus.Cancelled,
  ],
  [PatientStatus.SentToLab]: [
    PatientStatus.AwaitingDoctorReview,
    PatientStatus.Cancelled,
  ],
  [PatientStatus.SentToPharmacy]: [
    PatientStatus.AwaitingPayment,
    PatientStatus.Cancelled,
  ],
  [PatientStatus.AwaitingPayment]: [
    PatientStatus.Discharged,
  ],
  [PatientStatus.AwaitingDoctorReview]: [
    PatientStatus.SentToNurse,
    PatientStatus.SentToPharmacy,
    PatientStatus.AwaitingPayment,
  ],
  [PatientStatus.AwaitingNextStep]: [
    PatientStatus.SentToLab,
    PatientStatus.SentToPharmacy,
    PatientStatus.AwaitingPayment,
  ],
  [PatientStatus.Discharged]: [],
  [PatientStatus.Cancelled]: [],
};

// Validation function
function isValidTransition(
  currentStatus: PatientStatus,
  newStatus: PatientStatus
): boolean {
  return ALLOWED_TRANSITIONS[currentStatus]?.includes(newStatus) ?? false;
}
```

---

## 📱 Real-Time Status Change Events

```typescript
// In any real-time listener
useRealtimeSubscriptions({
  onPatientStatusChange: (patientId: string, newStatus: PatientStatus) => {
    console.log(`Patient ${patientId} moved to ${newStatus}`);
    
    // Update UI based on new status
    switch(newStatus) {
      case PatientStatus.SentToNurse:
        // Update nurse dashboard - new task visible
        break;
      case PatientStatus.SentToLab:
        // Update lab tech dashboard - new test visible
        break;
      case PatientStatus.SentToPharmacy:
        // Update pharmacist dashboard - new prescription visible
        break;
      case PatientStatus.AwaitingPayment:
        // Update front desk dashboard - payment visible
        break;
      case PatientStatus.Discharged:
        // Remove from active queue
        break;
    }
  },
});
```

---

## 🔍 Audit Trail for Status Changes

```typescript
// Every status change is logged
await log(user?.$id, {
  action: AuditActions.PATIENT_STATUS_CHANGED,
  entityType: 'Patient',
  entityId: patientId,
  details: {
    previousStatus: oldStatus,
    newStatus: newStatus,
    changedBy: user?.name,
    changedAt: new Date().toISOString(),
    reason: transitionReason,
  }
});
```

---

## ✅ Production Verification Checklist

- [ ] All status transitions implemented
- [ ] Validation prevents invalid transitions
- [ ] Real-time updates work on status change
- [ ] Audit logs created for each transition
- [ ] Dashboard queries return correct statuses
- [ ] Patient timeline shows all transitions
- [ ] No orphaned patients in unknown status
- [ ] Discharge removes from active queues

---

**Complete Patient Status Flow Documented.**
