/**
 * Hospital EMR System - Visual Architecture Diagrams
 * ASCII art representations of the system structure
 */

# 🏗️ Hospital EMR System - Architecture Diagrams

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     HOSPITAL EMR SYSTEM                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │  Front Desk  │  │   Doctor     │  │   Nurse      │           │
│  │  Dashboard   │  │  Dashboard   │  │  Dashboard   │           │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘           │
│         │                 │                 │                   │
│         v                 v                 v                   │
│  ┌──────────────────────────────────────────────────┐           │
│  │         CUSTOM REACT HOOKS (use-emr.ts)         │           │
│  │  • usePatient()       • useCreateConsultation()  │           │
│  │  • usePatientsByStatus()  • useCreatePayment()   │           │
│  │  • useConsultationsByDoctor()  • Mutations...    │           │
│  └──────────────────────┬───────────────────────────┘           │
│                         │                                       │
│         ┌───────────────┼───────────────┐                       │
│         v               v               v                       │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐                   │
│  │ TYPES &    │ │ SERVICE    │ │ ROLE &     │                   │
│  │ MODELS     │ │ LAYER      │ │ ROUTING    │                   │
│  │            │ │            │ │            │                   │
│  │ interfaces │ │ Appwrite   │ │ Access     │                   │
│  │ + enums    │ │ functions  │ │ Control    │                   │
│  └────────────┘ └──────┬─────┘ └────────────┘                   │
│                        │                                        │
│                        v                                        │
│  ┌──────────────────────────────────────┐                       │
│  │       APPWRITE BACKEND (BaaS)        │                       │
│  ├──────────────────────────────────────┤                       │
│  │ • Patients Collection                │                       │
│  │ • Consultations Collection           │                       │
│  │ • Prescriptions Collection           │                       │
│  │ • LabRequests Collection             │                       │
│  │ • Payments Collection                │                       │
│  │ • Staff Collection                   │                       │
│  │ • Authentication                     │                       │
│  │ • Real-time Subscriptions (ready)    │                       │
│  └──────────────────────────────────────┘                       │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    PATIENT LIFECYCLE FLOW                        │
└─────────────────────────────────────────────────────────────────┘

  FRONT DESK PHASE
  ───────────────
  
  Register Patient Form
           │
           v
  ┌─────────────────────────┐
  │ Personal Info           │  Step 1
  │ - Name, Email, Phone    │
  │ - DOB, Address          │
  └─────────────────────────┘
           │
           v
  ┌─────────────────────────┐
  │ Medical Info            │  Step 2
  │ - Blood Group           │
  │ - Allergies             │
  │ - Medical History       │
  └─────────────────────────┘
           │
           v
  ┌─────────────────────────┐
  │ Emergency Contact       │  Step 3
  │ - Name, Phone           │
  │ - Relationship          │
  └─────────────────────────┘
           │
           v
  ┌─────────────────────────────┐
  │ Status: REGISTERED          │
  │ Now visible in Dashboard    │
  │ in "Newly Registered" tab   │
  └─────────────────────────────┘
           │
           v
  ┌──────────────────────────────────┐
  │ Front Desk: Move to Queue        │
  │ (Click "Move to Queue" button)   │
  └─────────────────────────┬────────┘
                            │
                            v
                ┌───────────────────────────────┐
                │ Status: AWAITING CONSULTATION │
                │ Now in "Consultation Queue"   │
                └──────────────┬────────────────┘
                               │
  ─────────────────────────────┼─────────────────────────────
  
  DOCTOR PHASE
  ────────────
                               │
                               v
                ┌────────────────────────────────┐
                │ Doctor: Start Consultation     │
                │ (Patient appears in queue)     │
                └──────────────┬─────────────────┘
                               │
                               v
                ┌────────────────────────────────┐
                │ Step 1: Patient & Symptoms     │
                │ - Select patient from queue    │
                │ - Enter chief complaint        │
                └──────────────┬─────────────────┘
                               │
                               v
                ┌────────────────────────────────┐
                │ Step 2: Diagnosis & Notes      │
                │ - Enter diagnosis              │
                │ - Add notes                    │
                │ - Send to Nursing (optional)   │
                └──────────────┬─────────────────┘
                               │
                               v
                ┌────────────────────────────────┐
                │ Step 3: Prescriptions          │
                │ - Add medications (optional)   │
                │ - Drug, dosage, frequency      │
                │ - Add multiple or skip         │
                └──────────────┬─────────────────┘
                               │
                               v
                ┌────────────────────────────────┐
                │ Step 4: Lab Tests              │
                │ - Request tests (optional)     │
                │ - Test type, priority          │
                │ - Add multiple or skip         │
                └──────────────┬─────────────────┘
                               │
                               v
                ┌────────────────────────────────┐
                │ Submit Consultation            │
                │ Creates:                       │
                │ - Consultation Record          │
                │ - Prescription (if added)      │
                │ - Lab Requests (if added)      │
                └──────────────┬─────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          v                    v                    v
  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
  │ SENT TO LAB  │  │ SENT TO      │  │ SENT TO      │
  │              │  │ PHARMACY     │  │ NURSING      │
  │ Status:      │  │              │  │              │
  │ SentToLab    │  │ Status:      │  │ Status:      │
  │              │  │ SentToPharmacy│  │ SentToNurse  │
  └──────────────┘  └──────────────┘  └──────────────┘
          │                    │                    │
  ─────────────────────────────┼────────────────────┼──────
  
  SUPPORTING ROLES PHASE
  ──────────────────────
                        │              │
                        v              v
                  ┌──────────┐  ┌──────────────┐
                  │ LAB TECH │  │ PHARMACIST   │
                  ├──────────┤  ├──────────────┤
                  │ Process  │  │ Dispense     │
                  │ tests    │  │ medication   │
                  │ Upload   │  │ Manage stock │
                  │ results  │  │ Track usage  │
                  └────┬─────┘  └─────┬────────┘
                       │              │
                       v              v
                   DONE           DONE
                       │              │
  ─────────────────────┼──────────────┼──────────────
  
  FRONT DESK FINAL PHASE
  ──────────────────────
                    │ (After all processing)
                    │
                    v
          ┌──────────────────────────┐
          │ Status:                  │
          │ AWAITING PAYMENT         │
          │ Patient ready for        │
          │ checkout and discharge   │
          └──────────┬───────────────┘
                     │
                     v
          ┌──────────────────────────┐
          │ Front Desk: Payment      │
          │ - Select patient         │
          │ - Enter amount           │
          │ - Select method          │
          │ - Process payment        │
          └──────────┬───────────────┘
                     │
                     v
          ┌──────────────────────────┐
          │ Status: DISCHARGED       │
          │ Payment record created   │
          │ Patient removed from     │
          │ active queue             │
          └──────────────────────────┘
```

## Module Architecture

```
┌────────────────────────────────────────────────────────┐
│              FRONT DESK MODULE                         │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Dashboard            Patient Queue                  │
│  ┌──────────────┐     ┌──────────────┐              │
│  │ Stats Cards  │────▶│ FIFO Order   │              │
│  │ Status Tabs  │     │ Position #   │              │
│  │ Tab Content  │     │ Move Button  │              │
│  └──────────────┘     └──────────────┘              │
│         │                                             │
│         └─────────────────────────────────────────┐  │
│                                    │               │  │
│  Patient Registration          Payment Checkout   │  │
│  ┌──────────────────────┐     ┌──────────────┐   │  │
│  │ Step 1: Personal     │────▶│ 2-Panel      │   │  │
│  │ Step 2: Medical      │     │ Layout       │   │  │
│  │ Step 3: Emergency    │     │ Payment Form │   │  │
│  │ Validation           │     │ History      │   │  │
│  └──────────────────────┘     └──────────────┘   │  │
│                                                    │  │
└────────────────────────────────────────────────────┘  │
         │                                              │
         v                                              │
    ┌─────────────────────────────────────┐           │
    │   Front Desk Service Functions      │           │
    │ • createPatient()                   │           │
    │ • updatePatientStatus()             │           │
    │ • listPatientsByStatus()            │           │
    │ • createPayment()                   │           │
    └─────────────────────────────────────┘           │
                                                       │
┌────────────────────────────────────────────────────────┐
│               DOCTOR MODULE                           │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Dashboard                 Consultation               │
│  ┌──────────────┐         ┌──────────────────┐       │
│  │ Queue Tab    │────────▶│ Step 1: Patient  │       │
│  │ My Consult   │         │ Step 2: Diagnosis│       │
│  │ Completed    │         │ Step 3: Rx       │       │
│  │ Stats        │         │ Step 4: Lab      │       │
│  └──────────────┘         └──────────────────┘       │
│         │                          │                  │
│         └──────────────┬───────────┘                  │
│                        │                              │
│    ┌──────────────────────────────────────┐          │
│    │  Doctor Service Functions            │          │
│    │ • getPatientById()                   │          │
│    │ • createConsultation()               │          │
│    │ • createPrescription()               │          │
│    │ • createLabRequest()                 │          │
│    │ • listConsultationsByDoctor()        │          │
│    └──────────────────────────────────────┘          │
│                                                        │
└────────────────────────────────────────────────────────┘
```

## Component Hierarchy

```
┌─────────────────────────────────────────────────┐
│           App Layout (Root)                     │
├─────────────────────────────────────────────────┤
│                                                 │
│  Authentication Middleware                    │
│  └─ Check user.role                           │
│                                                 │
│  ┌─────────────────────────────────────────┐  │
│  │ Role Router                             │  │
│  ├─────────────────────────────────────────┤  │
│  │ FrontDesk          Doctor               │  │
│  │ ├─ Dashboard       ├─ Dashboard         │  │
│  │ ├─ Registration    ├─ Consultation      │  │
│  │ ├─ Queue           └─ Metrics           │  │
│  │ └─ Payment                              │  │
│  │                                         │  │
│  │ Nurse             LabTech               │  │
│  │ ├─ Dashboard      ├─ Dashboard          │  │
│  │ ├─ Vitals         ├─ Tests Queue        │  │
│  │ └─ Actions        └─ Results Upload     │  │
│  │                                         │  │
│  │ Pharmacist                              │  │
│  │ ├─ Dashboard                            │  │
│  │ ├─ Queue                                │  │
│  │ └─ Dispensing                           │  │
│  └─────────────────────────────────────────┘  │
│         │                                      │
│         v                                      │
│  ┌──────────────────────────────────────┐     │
│  │  Dashboard                           │     │
│  ├──────────────────────────────────────┤     │
│  │ ┌─ Stats Cards  ┌─ Tab Navigation   │     │
│  │ ├─ EmptyState  ├─ LoadingSkeleton   │     │
│  │ └─ ErrorAlert  └─ Tab Content       │     │
│  └──────────────────────────────────────┘     │
│                   │                           │
│                   v                           │
│  ┌──────────────────────────────────────┐     │
│  │  UI Components (emr-ui.tsx)          │     │
│  ├──────────────────────────────────────┤     │
│  │ • PatientInfoCard                    │     │
│  │ • ConsultationCard                   │     │
│  │ • PaymentCard                        │     │
│  │ • LoadingSkeleton                    │     │
│  │ • EmptyState                         │     │
│  │ • ErrorAlert / SuccessAlert          │     │
│  └──────────────────────────────────────┘     │
│                                                 │
└─────────────────────────────────────────────────┘
```

## Data State Management

```
Component Rendering
        │
        v
┌──────────────────┐
│ Custom Hook      │
│ (use-emr.ts)     │
├──────────────────┤
│ State:           │
│ • data           │
│ • loading        │
│ • error          │
└────────┬─────────┘
         │
    ┌────┴────┐
    │          │
    v          v
┌────────┐  ┌──────┐
│Loading │  │Data  │
├────────┤  ├──────┤
│Skeleton│◀─┤Fetch │
└────────┘  │with  │
            │effect
    ↓       │
┌─────┐ └──────┘
│Error│   │
│State│   │
└─────┘   v
    ↓  ┌────────┐
    │  │Render  │
    │  │Data    │
    │  └────────┘
    │     │
    └─────┼─────────┐
          │         │
          v         v
       ┌────────────────┐
       │ User Action    │
       │ (Update Data)  │
       └────────┬───────┘
                │
                v
         ┌──────────────┐
         │ Mutation     │
         │ Hook         │
         ├──────────────┤
         │ Call Service │
         │ Function     │
         └─────┬────────┘
               │
               v
         ┌──────────────┐
         │ Appwrite     │
         │ Database     │
         └──────────────┘
```

## Security Flow

```
┌──────────────────────────────────────────────────┐
│          User Accesses Screen                    │
└────────────────────┬─────────────────────────────┘
                     │
                     v
        ┌────────────────────────────┐
        │ Authentication Check       │
        │ (useAuth())                │
        ├────────────────────────────┤
        │ ✓ User logged in?          │
        │ ✓ Token valid?             │
        │ ✗ Redirect to login        │
        └────────────────┬───────────┘
                         │
                         v
        ┌────────────────────────────┐
        │ Role-Based Access Check    │
        │ (useRoleProtection)        │
        ├────────────────────────────┤
        │ ✓ Role allowed on route?   │
        │ ✗ Redirect to unauthorized│
        └────────────────┬───────────┘
                         │
                         v
        ┌────────────────────────────┐
        │ Render Component           │
        ├────────────────────────────┤
        │ User can now see screen    │
        └────────────────┬───────────┘
                         │
            ┌────────────┴────────────┐
            │                         │
            v                         v
   ┌──────────────┐         ┌──────────────┐
   │ Data Fetch   │         │ Action Call  │
   │ (Hook)       │         │ (Mutation)   │
   ├──────────────┤         ├──────────────┤
   │ Call Service │         │ Call Service │
   │ Function     │         │ Function     │
   └──────┬───────┘         └──────┬───────┘
          │                        │
          v                        v
   ┌──────────────┐         ┌──────────────┐
   │ Appwrite API │         │ Appwrite API │
   │ (Server-side)│         │ (Server-side)│
   │ "use server" │         │ "use server" │
   ├──────────────┤         ├──────────────┤
   │ ✓ Validate   │         │ ✓ Validate   │
   │  context     │         │  context     │
   │ ✓ Fetch data │         │ ✓ Save data  │
   │ ✓ Return     │         │ ✓ Log action │
   │  result      │         │ ✓ Return     │
   └──────┬───────┘         └──────┬───────┘
          │                        │
          └────────────┬───────────┘
                       │
                       v
             ┌────────────────────┐
             │ Update Component   │
             │ State with Result  │
             └────────────────────┘
```

## Technology Stack

```
┌───────────────────────────────────────────────────┐
│                TECHNOLOGY STACK                   │
├───────────────────────────────────────────────────┤
│                                                   │
│  Frontend                                         │
│  ┌─────────────────────────────────────────────┐ │
│  │ Next.js 13+ (App Router)                    │ │
│  │ React 18+                                   │ │
│  │ TypeScript (100% coverage)                  │ │
│  │ Tailwind CSS (Styling)                      │ │
│  └─────────────────────────────────────────────┘ │
│                                                   │
│  Backend/Database                                 │
│  ┌─────────────────────────────────────────────┐ │
│  │ Appwrite (Backend as a Service)             │ │
│  │ • Authentication                            │ │
│  │ • Document Database                         │ │
│  │ • Real-time Subscriptions (ready)           │ │
│  │ • File Storage (ready)                      │ │
│  └─────────────────────────────────────────────┘ │
│                                                   │
│  Security                                         │
│  ┌─────────────────────────────────────────────┐ │
│  │ • TypeScript Type Safety                    │ │
│  │ • Server-Side Data Operations               │ │
│  │ • Role-Based Access Control                 │ │
│  │ • Secure Authentication                     │ │
│  │ • Audit Logging (ready)                     │ │
│  └─────────────────────────────────────────────┘ │
│                                                   │
│  Performance                                      │
│  ┌─────────────────────────────────────────────┐ │
│  │ • Next.js Code Splitting                    │ │
│  │ • React Component Memoization               │ │
│  │ • Custom Hook Optimization                  │ │
│  │ • Tailwind CSS Purging                      │ │
│  │ • Image Optimization (ready)                │ │
│  └─────────────────────────────────────────────┘ │
│                                                   │
└───────────────────────────────────────────────────┘
```

---

## Summary

These diagrams show:
- **System Overview**: How all components connect
- **Data Flow**: Patient journey through the system
- **Module Architecture**: Organization of Front Desk and Doctor
- **Component Hierarchy**: How React components are structured
- **State Management**: How data flows through hooks
- **Security Flow**: How access control works
- **Technology Stack**: What technologies are used

All components follow these patterns and work together seamlessly.
