# Hospital EMR - Developer Quick Reference

## 🚀 Quick Links

| Topic | File |
|-------|------|
| API Functions | `API_REFERENCE.md` |
| How to Integrate | `INTEGRATION_GUIDE.md` |
| Architecture | `COMPLETE_IMPLEMENTATION.md` |
| Patient Status | `PATIENT_STATUS_FLOW.md` |
| File Inventory | `FILE_INVENTORY.md` |
| Full Overview | `README_COMPLETE.md` |

---

## 💡 Common Tasks

### Add Patient to Queue (Front Desk)
```typescript
import { useUpdatePatientStatus } from '@/hooks/use-emr';

const { mutate: updateStatus } = useUpdatePatientStatus();
await updateStatus(patientId, PatientStatus.AwaitingConsultation);
```

### Create Consultation (Doctor)
```typescript
import { useCreateConsultation } from '@/hooks/use-emr';

const { mutate: createConsultation } = useCreateConsultation();
const consultation = await createConsultation({
  patientId,
  doctorId: user?.$id,
  symptoms,
  diagnosis,
  notes,
  status: 'InProgress',
  startTime: new Date().toISOString(),
});
```

### Record Nursing Vitals (Nurse)
```typescript
import { useUpdateNursingAction } from '@/hooks/use-emr';

const { mutate: updateAction } = useUpdateNursingAction();
await updateAction(taskId, {
  status: 'Completed',
  description: `BP: ${bp}, Temp: ${temp}°C, Pulse: ${pulse} bpm. Treatment: ${treatment}`,
  completedBy: user?.$id,
  completionTime: new Date().toISOString(),
});
```

### Submit Lab Results (Lab Tech)
```typescript
import { useUpdateLabRequest } from '@/hooks/use-emr';

const { mutate: updateLabRequest } = useUpdateLabRequest();
await updateLabRequest(requestId, {
  status: 'Completed',
  results: resultsText,
  resultFile: base64FileData,
  completionDate: new Date().toISOString(),
});
```

### Dispense Medication (Pharmacist)
```typescript
import { useCreateDispensingRecord } from '@/hooks/use-emr';

const { mutate: createRecord } = useCreateDispensingRecord();
await createRecord({
  prescriptionId,
  patientId,
  pharmacistId: user?.$id,
  dispensedDate: new Date().toISOString(),
  dispensedMedications: selectedMeds,
  notes,
});
```

### Process Payment (Front Desk)
```typescript
import { useCreatePayment, useUpdatePatientStatus } from '@/hooks/use-emr';

const { mutate: createPayment } = useCreatePayment();
const { mutate: updateStatus } = useUpdatePatientStatus();

await createPayment({
  patientId,
  amount,
  paymentMethod: 'Cash',
  status: 'Completed',
  description,
  processedBy: user?.$id,
  processedDate: new Date().toISOString(),
});

await updateStatus(patientId, PatientStatus.Discharged);
```

---

## 🔐 Protect a Screen

```typescript
import { useRoleProtection } from '@/lib/role-utils';

export default function MyScreen() {
  const { authorized, loading } = useRoleProtection([UserRole.Doctor, UserRole.Admin]);

  if (loading) return <LoadingSkeleton />;
  if (!authorized) return <ErrorAlert message="Access Denied" />;

  return <div>Your content</div>;
}
```

---

## 📝 Log an Action

```typescript
import { useAuditLog, AuditActions } from '@/lib/audit-logging';

const { log } = useAuditLog();

await log(user?.$id, {
  action: AuditActions.CONSULTATION_CREATED,
  entityType: 'Consultation',
  entityId: consultationId,
  details: { symptoms, diagnosis },
});
```

---

## 🔔 Real-Time Updates

```typescript
import { useRealtimeSubscriptions } from '@/lib/realtime-subscriptions';

useRealtimeSubscriptions({
  onPatientStatusChange: (patientId, newStatus) => {
    console.log(`Patient moved to ${newStatus}`);
    // Refresh your data
  },
  onLabRequestUpdate: (requestId) => {
    console.log(`Lab test completed`);
    // Refresh lab data
  },
});
```

---

## 📊 Query Patients

```typescript
import { usePatientsByStatus } from '@/hooks/use-emr';

// Get all patients awaiting consultation
const { data: patients, loading, error } = usePatientsByStatus(
  PatientStatus.AwaitingConsultation
);

// Use in render
{loading && <Skeleton />}
{error && <ErrorAlert message={error.message} />}
{patients?.map(patient => <PatientCard key={patient.$id} patient={patient} />)}
```

---

## 🔗 Patient Status Flow

```
Registered
  ↓
AwaitingConsultation (Front Desk Queue)
  ↓
UnderConsultation (Doctor)
  ↓
(Choose one or more):
  SentToNurse → AwaitingNextStep
  SentToLab → AwaitingDoctorReview
  SentToPharmacy → AwaitingPayment
  AwaitingPayment (direct, no other services)
  ↓
Discharged (Front Desk)
```

---

## 🧪 Testing

### Test 1: Register Patient
```
/front-desk/patient-registration
- Fill form → Submit → Patient shows in queue
- Check: Patient status = "Registered"
```

### Test 2: Doctor Consultation
```
/doctor/dashboard
- Select patient from queue → Start Consultation
- Fill form → Create prescription → Submit
- Check: Patient status = "SentToPharmacy"
```

### Test 3: Pharmacist Dispenses
```
/pharmacist/dashboard
- Click prescription → Select medications → Dispense
- Check: Patient status = "AwaitingPayment"
```

### Test 4: Front Desk Payment
```
/front-desk/payment-checkout
- Select patient → Enter amount → Process
- Check: Patient status = "Discharged"
```

### Test 5: View Timeline
```
/patient-timeline/[patientId]
- Should show: Registration → Consultation → Dispensing → Payment
- All with timestamps
```

---

## 🐛 Debugging

### Check Error Logs
```typescript
// Check component error state
console.log(error?.message);
// Check browser console for stack trace
// Check Appwrite dashboard for collection errors
```

### Verify Access
```typescript
// Check if user has role
console.log(user?.role);
// Check if authorized
console.log(authorized);
```

### Monitor Real-Time
```typescript
// Open browser DevTools
// Subscribe to Appwrite messages
// Should see update events flowing
```

### Audit Trail
```
/admin/dashboard → Recent Activity Logs
// Shows every action with timestamp
```

---

## 📱 Component Props Reference

### PatientInfoCard
```typescript
<PatientInfoCard 
  patient={{
    $id: "123",
    name: "John Doe",
    status: "AwaitingConsultation",
    // ... other patient fields
  }} 
/>
```

### ConsultationCard
```typescript
<ConsultationCard 
  consultation={{
    $id: "456",
    symptoms: "Fever",
    diagnosis: "Cold",
    status: "Completed",
  }} 
/>
```

### LoadingSkeleton
```typescript
<LoadingSkeleton /> // Default 3 rows
<LoadingSkeleton rows={5} /> // Custom rows
```

### EmptyState
```typescript
<EmptyState 
  title="No patients"
  description="Check back later"
/>
```

### ErrorAlert
```typescript
<ErrorAlert message="Something went wrong" />
```

### SuccessAlert
```typescript
<SuccessAlert message="Operation successful" />
```

---

## 🔒 Security Checklist

- [ ] Screen wrapped with useRoleProtection()
- [ ] Server action uses "use server"
- [ ] User input validated before submit
- [ ] Error messages don't leak sensitive info
- [ ] User ID included in audit log
- [ ] Document access verified server-side
- [ ] File uploads validated

---

## 📦 Dependencies

**Already Installed:**
- Next.js 13+ (App Router)
- React 18+
- TypeScript
- Tailwind CSS
- Appwrite SDK

**No additional packages needed for core functionality.**

---

## ⚡ Performance Tips

1. Use `useMemo` for expensive computations
2. Paginate large lists
3. Debounce search inputs
4. Cache patient data when possible
5. Use real-time for live updates instead of polling

---

## 🎯 Common Mistakes to Avoid

❌ **Don't:** Use mock data in production
✅ **Do:** Use Appwrite SDK functions

❌ **Don't:** Forget to add useRoleProtection
✅ **Do:** Protect every screen

❌ **Don't:** Skip error handling
✅ **Do:** Handle all async errors

❌ **Don't:** Update UI without logging
✅ **Do:** Log every critical action

❌ **Don't:** Hardcode status values
✅ **Do:** Use PatientStatus enum

---

## 🚀 Before Deploying

- [ ] All screens load without errors
- [ ] Real-time updates working
- [ ] Audit logs recording actions
- [ ] Access control denying unauthorized access
- [ ] Patient timeline showing all events
- [ ] No console errors
- [ ] Build succeeds
- [ ] Environment variables set

---

## 📞 Getting Help

1. Check **API_REFERENCE.md** for function docs
2. Check **INTEGRATION_GUIDE.md** for examples
3. Review similar implemented screen
4. Check audit logs for what went wrong
5. Check browser console for errors

---

## 🎓 Study Order

1. **README_COMPLETE.md** - Overview
2. **API_REFERENCE.md** - Available functions
3. **PATIENT_STATUS_FLOW.md** - Status transitions
4. **app/front-desk/** - Simplest module
5. **app/doctor/** - Most complex module

---

**Happy coding! System is production-ready. 🚀**
