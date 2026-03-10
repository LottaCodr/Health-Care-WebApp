# End-to-End Patient Flow Testing Guide

## Overview

This guide provides step-by-step instructions to test the complete hospital EMR patient journey from registration through discharge. Follow these scenarios to verify all workflows are functioning correctly.

---

## 📋 Test Scenario 1: Basic Patient Flow (No Lab/Nursing)

### Prerequisites
- User accounts for: Front Desk, Doctor, Pharmacist staff
- Appwrite database properly configured

### Step 1: Patient Registration (Front Desk)
**Location:** `/front-desk/dashboard` → Register Patient

**Actions:**
1. Click "Register Patient" button
2. Fill in patient form:
   - Name: "John Test Patient"
   - Email: "john@test.com"
   - Phone: "1234567890"
   - Gender: Male
   - DOB: "1990-01-15"
   - Blood Group: "O+"
   - Allergies: "None"
3. Click Submit
4. **Expected Result:** Patient created with status `Registered`

**Verify in Database:**
```
Collection: Patients
Filter: name = "John Test Patient"
Check: status = "Registered"
```

---

### Step 2: Move to Queue (Front Desk)
**Location:** `/front-desk/patient-queue`

**Actions:**
1. Find "John Test Patient" in Registered queue
2. Click "Move to Queue" or "Start Consultation"
3. **Expected Result:** Patient status updates to `AwaitingConsultation`

**Verify:**
- Patient disappears from Registered queue
- Patient appears in AwaitingConsultation queue

---

### Step 3: Doctor Consultation (Doctor)
**Location:** `/doctor/dashboard` → Patient Consultation

**Actions:**
1. Doctor dashboard shows patients in `AwaitingConsultation` status
2. Click on "John Test Patient"
3. Start consultation:
   - Enter Symptoms: "Fever and headache"
   - Enter Diagnosis: "Common cold"
   - Add Prescription:
     - Drug: "Paracetamol"
     - Dosage: "500mg"
     - Frequency: "Twice daily"
     - Duration: "5 days"
   - **DO NOT** create lab requests or nursing actions
4. Complete consultation
5. **Expected Result:** Patient status updates to `SentToPharmacy` (because only prescription, no other services)

**Verify:**
```
Collections Created:
- Consultation (with symptoms, diagnosis)
- Prescription (Active status)
Patient Status: SentToPharmacy
```

---

### Step 4: Pharmacist Dispenses (Pharmacist)
**Location:** `/pharmacist/dashboard` → Prescription Queue

**Actions:**
1. Pharmacist sees patient in `SentToPharmacy` status
2. Click "Dispense" on Paracetamol prescription
3. Fill Drug Dispensing Form:
   - Drug Name: "Paracetamol"
   - Quantity: 50 tablets
   - Expiry: "2026-12-31"
   - Batch: "BATCH-2026-001"
4. Click "Dispense Medications"
5. **Expected Result:** Patient status updates to `AwaitingPayment`

**Verify:**
```
Collections Updated:
- Prescription: status = "Dispensed"
- DrugDispensingRecord: created
Patient Status: AwaitingPayment
```

---

### Step 5: Process Payment (Front Desk)
**Location:** `/front-desk/dashboard` → Awaiting Payment

**Actions:**
1. Find "John Test Patient" in Awaiting Payment queue
2. Click "Process Payment"
3. Enter Payment Details:
   - Amount: 1000 EGP
   - Payment Method: "Cash"
4. Click "Complete Payment"
5. **Expected Result:** Patient status updates to `Discharged`

**Verify:**
```
Collections:
- Payment: created with status = "Completed"
Patient Status: Discharged
Patient removed from all queues
```

---

## 📋 Test Scenario 2: Complex Flow (With Lab + Nursing)

### Prerequisites
- User accounts for: Front Desk, Doctor, Nurse, Lab Technician, Pharmacist
- Same as Scenario 1

### Step 1-2: Register & Queue (Same as Scenario 1)
Register patient "Jane Lab Patient" and move to queue.

---

### Step 3: Doctor Consultation (WITH Lab & Nursing)
**Location:** `/doctor/dashboard`

**Actions:**
1. Start consultation with "Jane Lab Patient"
2. Enter Symptoms: "Persistent cough and fatigue"
3. Enter Diagnosis: "Possible respiratory infection"
4. **Create Prescription:**
   - Drug: "Amoxicillin"
   - Dosage: "500mg"
   - Frequency: "Three times daily"
   - Duration: "7 days"
5. **Create Lab Request:**
   - Test Type: "Chest X-Ray"
   - Test Description: "To rule out pneumonia"
   - Priority: "Urgent"
6. **Create Nursing Action:**
   - Action Type: "Vitals"
   - Description: "Check vital signs and oxygen saturation"
7. Complete consultation with routing decision
8. **Expected Result:** Patient status updates to `SentToNurse` (highest priority: Nursing > Lab > Pharmacy)

---

### Step 4: Nurse Records Vitals (Nurse)
**Location:** `/nurse/dashboard` → Assigned Patients

**Actions:**
1. Nurse sees patient in `SentToNurse` status
2. Click "View & Care"
3. Click "Record Patient Vitals"
4. Fill Vitals Form:
   - Temperature: 38.5°C
   - BP: 120/80
   - Heart Rate: 92
   - Respiratory Rate: 22
   - O2 Saturation: 94%
5. Click "Record Vitals"
6. **Expected Result:** Nursing action completed but patient still in `SentToNurse` until lab is done (if lab requests exist)

**Note:** In this scenario, since both lab and nursing are requested, we need to decide routing. The system should keep patient in `SentToNurse` until nurse completes, then move to `SentToLab`. Alternatively, implement logic that patient must complete ALL assigned tasks before progressing.

---

### Step 5: Lab Technician Uploads Results (Lab Tech)
**Location:** `/lab-tech/dashboard` → Pending Tests

**Actions:**
1. Lab Tech sees "Jane Lab Patient" in `SentToLab` (or pending lab queue)
2. Click "Perform Test"
3. Fill Lab Result Form:
   - Results: "Chest X-Ray shows mild bronchitis, no pneumonia"
   - Normal Range: "Clear lungs"
   - Interpretation: "Findings consistent with viral bronchitis"
4. Click "Submit Results"
5. **Expected Result:** Lab request marked as `Completed`, patient status updates to `AwaitingPayment`

**Verify:**
```
LabRequest: status = "Completed", results populated
Patient Status: AwaitingPayment
```

---

### Step 6: Pharmacist Dispenses (Same as Scenario 1)
Patient goes directly to pharmacy from lab (status changed to `SentToPharmacy` after lab completes), or if still in nursing/lab, pharmacist sees pending prescription in queue.

---

### Step 7: Process Payment (Same as Scenario 1)
Patient discharged after payment.

---

## 🔍 Real-Time Testing

### Dashboard Auto-Refresh
1. Keep Doctor Dashboard open
2. In another browser/tab, as Front Desk, move patient to queue
3. **Expected:** Doctor Dashboard refreshes and shows new patient in queue

### Status Badge Colors
1. Navigate to any patient queue
2. Verify status badges display correct colors:
   - `Registered` → Gray
   - `AwaitingConsultation` → Blue
   - `UnderConsultation` → Purple
   - `SentToNurse` → Pink
   - `SentToLab` → Orange
   - `SentToPharmacy` → Green
   - `AwaitingPayment` → Yellow
   - `Discharged` → Emerald

---

## ✅ Validation Checklist

### Patient Status Transitions
- [ ] Registered → AwaitingConsultation
- [ ] AwaitingConsultation → UnderConsultation
- [ ] UnderConsultation → SentToNurse/SentToLab/SentToPharmacy/AwaitingPayment
- [ ] SentToNurse → AwaitingPayment
- [ ] SentToLab → AwaitingPayment
- [ ] SentToPharmacy → AwaitingPayment
- [ ] AwaitingPayment → Discharged

### RBAC Enforcement
- [ ] Front Desk cannot access Doctor screens
- [ ] Doctor cannot process payments
- [ ] Nurse cannot view Lab queue
- [ ] Lab Tech cannot dispense drugs
- [ ] Pharmacist cannot access Nurse actions
- [ ] All roles can only see relevant data for their role

### Data Integrity
- [ ] Consultations link to correct Patient & Doctor
- [ ] Prescriptions link to Consultation & Patient
- [ ] Lab Requests link to Patient & Consultation
- [ ] Nursing Actions link to Patient & Nurse
- [ ] Payments link to correct Patient
- [ ] All created timestamps are correct
- [ ] Status updates populate `$updatedAt`

### Error Handling
- [ ] Empty queue shows "No patients" message
- [ ] Invalid data shows validation errors
- [ ] Network errors show retry options
- [ ] Unauthorized access shows proper error

### Loading States
- [ ] Page shows loading spinner while fetching data
- [ ] Buttons show loading state during submission
- [ ] Forms disable inputs during submission

### Toast Notifications
- [ ] Success: "Patient registered successfully"
- [ ] Success: "Consultation created"
- [ ] Error: "Failed to register patient"
- [ ] Error messages are user-friendly

---

## 🐛 Common Issues & Debugging

### Patient Not Appearing in Queue
**Check:**
1. Verify patient status is correct in database
2. Verify user role matches the queue filter
3. Check browser cache (clear if needed)
4. Check network tab for failed requests

**Solution:**
```typescript
// Check in browser console
await listPatientsByStatus("AwaitingConsultation")
```

---

### Status Not Updating
**Check:**
1. Verify `updatePatientStatus()` function executed without error
2. Check Appwrite console for permission errors
3. Verify patient document exists in correct collection

---

### Hooks Not Triggering Refetch
**Check:**
1. Verify refetch function is being called
2. Check if dependencies changed correctly
3. Look for console errors

---

## 📊 Performance Testing

### Load Testing
1. Register 100+ patients
2. Measure query performance:
   - `listPatientsByStatus()` should return in < 1s
   - Search should respond in < 500ms

### Real-Time Performance
1. Open dashboard on multiple browsers
2. Perform action on one
3. Measure time for other browsers to update (should be < 3s)

---

## 📝 Test Results Template

```
Date: ___________
Tester: ___________
Environment: [Local/Staging/Production]

Scenario 1 (Basic Flow): [PASS/FAIL]
- Patient Registration: [PASS/FAIL]
- Move to Queue: [PASS/FAIL]
- Doctor Consultation: [PASS/FAIL]
- Pharmacist Dispensing: [PASS/FAIL]
- Payment Processing: [PASS/FAIL]

Scenario 2 (Complex Flow): [PASS/FAIL]
- Nursing Vitals: [PASS/FAIL]
- Lab Results: [PASS/FAIL]

RBAC Testing: [PASS/FAIL]
Real-Time Testing: [PASS/FAIL]
Error Handling: [PASS/FAIL]

Overall Result: [PASS/FAIL]

Issues Found:
1. ___________
2. ___________

Notes:
___________
```

---

**Last Updated:** February 2026
**Status:** Production Ready
