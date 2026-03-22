# Hospital EMR - Deployment Checklist

## ✅ Pre-Deployment Verification (Do This First!)

### Code Quality
- [ ] All TypeScript compiles without errors (`npm run build`)
- [ ] No console.error or console.warn in production code
- [ ] All imports resolved (no red squiggly lines)
- [ ] All API calls wrapped in try-catch blocks
- [ ] All user inputs validated before submission
- [ ] Loading states prevent double-clicks
- [ ] Error messages shown to users (not stack traces)

### Testing
- [ ] Run basic flow test (Register → Consult → Dispense → Pay)
- [ ] Run complex flow test (with Nursing + Lab)
- [ ] Test with 10+ patients in database
- [ ] Test real-time updates (patient status changes live)
- [ ] Test on mobile browser
- [ ] Test with slow network (Chrome DevTools throttling)
- [ ] Test with JavaScript disabled (should show fallback)

### Security
- [ ] useRoleProtection() on every protected screen
- [ ] Patient data only visible to authorized users
- [ ] Server actions use "use server" directive
- [ ] No sensitive data in console logs
- [ ] Audit logs recording all critical actions
- [ ] CORS headers correct for production domain
- [ ] API keys not exposed in client code

---

## 🔧 Environment Setup

### 1. Appwrite Configuration

**Create Database**
```bash
# In Appwrite console:
1. Navigate to Databases
2. Create new database: "hospital_emr"
3. Create Collections:
```

**Patient Collection**
```json
{
  "name": "patients",
  "attributes": [
    {"key": "name", "type": "string", "required": true},
    {"key": "email", "type": "email", "required": true},
    {"key": "phone", "type": "string"},
    {"key": "gender", "type": "string"},
    {"key": "dateOfBirth", "type": "datetime"},
    {"key": "bloodGroup", "type": "string"},
    {"key": "status", "type": "string", "default": "Registered"},
    {"key": "registrationDate", "type": "datetime"},
    {"key": "registeredBy", "type": "string"},
    {"key": "medicalHistory", "type": "string"},
    {"key": "allergies", "type": "string"},
    {"key": "emergencyContact", "type": "string"},
    {"key": "emergencyPhone", "type": "string"}
  ],
  "indexes": [
    {"key": "status", "type": "key"},
    {"key": "email", "type": "unique"},
    {"key": "registrationDate", "type": "key"}
  ]
}
```

**Staff Collection**
```json
{
  "name": "staff",
  "attributes": [
    {"key": "name", "type": "string", "required": true},
    {"key": "email", "type": "email", "required": true},
    {"key": "role", "type": "string", "required": true},
    {"key": "department", "type": "string"},
    {"key": "phone", "type": "string"},
    {"key": "licenseNumber", "type": "string"},
    {"key": "isActive", "type": "boolean", "default": true}
  ],
  "indexes": [
    {"key": "email", "type": "unique"},
    {"key": "role", "type": "key"}
  ]
}
```

**Consultation Collection**
```json
{
  "name": "consultations",
  "attributes": [
    {"key": "patientId", "type": "string", "required": true},
    {"key": "doctorId", "type": "string", "required": true},
    {"key": "symptoms", "type": "string"},
    {"key": "diagnosis", "type": "string"},
    {"key": "notes", "type": "string"},
    {"key": "status", "type": "string", "default": "Pending"},
    {"key": "startTime", "type": "datetime"},
    {"key": "endTime", "type": "datetime"}
  ],
  "indexes": [
    {"key": "patientId", "type": "key"},
    {"key": "doctorId", "type": "key"},
    {"key": "status", "type": "key"}
  ]
}
```

**Prescription Collection**
```json
{
  "name": "prescriptions",
  "attributes": [
    {"key": "consultationId", "type": "string", "required": true},
    {"key": "patientId", "type": "string", "required": true},
    {"key": "doctorId", "type": "string", "required": true},
    {"key": "medications", "type": "json"},
    {"key": "notes", "type": "string"},
    {"key": "status", "type": "string", "default": "Pending"},
    {"key": "createdDate", "type": "datetime"}
  ],
  "indexes": [
    {"key": "patientId", "type": "key"},
    {"key": "status", "type": "key"}
  ]
}
```

**Lab Request Collection**
```json
{
  "name": "lab_requests",
  "attributes": [
    {"key": "patientId", "type": "string", "required": true},
    {"key": "doctorId", "type": "string", "required": true},
    {"key": "testType", "type": "string", "required": true},
    {"key": "status", "type": "string", "default": "Pending"},
    {"key": "results", "type": "string"},
    {"key": "createdDate", "type": "datetime"},
    {"key": "completedDate", "type": "datetime"}
  ],
  "indexes": [
    {"key": "patientId", "type": "key"},
    {"key": "status", "type": "key"}
  ]
}
```

**Nursing Action Collection**
```json
{
  "name": "nursing_actions",
  "attributes": [
    {"key": "patientId", "type": "string", "required": true},
    {"key": "consultationId", "type": "string"},
    {"key": "actionType", "type": "string", "required": true},
    {"key": "description", "type": "string"},
    {"key": "status", "type": "string", "default": "Pending"},
    {"key": "assignedNurseId", "type": "string"},
    {"key": "createdDate", "type": "datetime"},
    {"key": "completedDate", "type": "datetime"}
  ],
  "indexes": [
    {"key": "patientId", "type": "key"},
    {"key": "status", "type": "key"},
    {"key": "assignedNurseId", "type": "key"}
  ]
}
```

**Payment Collection**
```json
{
  "name": "payments",
  "attributes": [
    {"key": "patientId", "type": "string", "required": true},
    {"key": "amount", "type": "string", "required": true},
    {"key": "paymentMethod", "type": "string"},
    {"key": "status", "type": "string", "default": "Pending"},
    {"key": "description", "type": "string"},
    {"key": "processedBy", "type": "string"},
    {"key": "processedDate", "type": "datetime"}
  ],
  "indexes": [
    {"key": "patientId", "type": "key"},
    {"key": "status", "type": "key"}
  ]
}
```

**Drug Dispensing Collection**
```json
{
  "name": "drug_dispensing",
  "attributes": [
    {"key": "prescriptionId", "type": "string", "required": true},
    {"key": "patientId", "type": "string", "required": true},
    {"key": "pharmacistId", "type": "string", "required": true},
    {"key": "dispensedMedications", "type": "json"},
    {"key": "status", "type": "string", "default": "Completed"},
    {"key": "dispensedDate", "type": "datetime"},
    {"key": "notes", "type": "string"}
  ],
  "indexes": [
    {"key": "patientId", "type": "key"},
    {"key": "prescriptionId", "type": "key"}
  ]
}
```

**Audit Log Collection**
```json
{
  "name": "audit_logs",
  "attributes": [
    {"key": "userId", "type": "string", "required": true},
    {"key": "action", "type": "string", "required": true},
    {"key": "entityType", "type": "string"},
    {"key": "entityId", "type": "string"},
    {"key": "details", "type": "json"},
    {"key": "timestamp", "type": "datetime"},
    {"key": "ipAddress", "type": "string"}
  ],
  "indexes": [
    {"key": "userId", "type": "key"},
    {"key": "timestamp", "type": "key"},
    {"key": "entityType", "type": "key"}
  ]
}
```

### 2. Environment Variables

**Create .env.local**
```env
# Appwrite Configuration
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://your-appwrite-cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your_project_id
APPWRITE_API_KEY=your_api_key_with_all_permissions

# Database Configuration
NEXT_PUBLIC_DATABASE_ID=hospital_emr
NEXT_PUBLIC_PATIENT_COLLECTION_ID=patients
NEXT_PUBLIC_STAFF_COLLECTION_ID=staff
NEXT_PUBLIC_CONSULTATION_COLLECTION_ID=consultations
NEXT_PUBLIC_PRESCRIPTION_COLLECTION_ID=prescriptions
NEXT_PUBLIC_LAB_REQUEST_COLLECTION_ID=lab_requests
NEXT_PUBLIC_NURSING_ACTION_COLLECTION_ID=nursing_actions
NEXT_PUBLIC_PAYMENT_COLLECTION_ID=payments
NEXT_PUBLIC_DRUG_DISPENSING_COLLECTION_ID=drug_dispensing
NEXT_PUBLIC_AUDIT_LOG_COLLECTION_ID=audit_logs

# Storage Configuration
NEXT_PUBLIC_BUCKET_ID=hospital_documents
NEXT_PUBLIC_STORAGE_URL=https://your-appwrite-cloud.appwrite.io/v1/storage/buckets/{bucket_id}/files/{file_id}/preview

# Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key
CLERK_SECRET_KEY=your_clerk_secret

# Feature Flags
NEXT_PUBLIC_ENABLE_REAL_TIME=true
NEXT_PUBLIC_ENABLE_AUDIT_LOGGING=true
NEXT_PUBLIC_ENABLE_FILE_UPLOADS=true

# App Configuration
NEXT_PUBLIC_APP_NAME=Nile Valley Hospital EMR
NEXT_PUBLIC_APP_URL=https://your-production-url.com
```

### 3. Initialize Database

```bash
# 1. Create seed data script (create `scripts/seed.ts`)
# 2. Run: npx ts-node scripts/seed.ts

# This should:
# - Create sample admin user
# - Create sample doctors, nurses, lab techs, pharmacists
# - Create sample patient
```

---

## 📦 Build & Deploy

### Build Locally First
```bash
# Install dependencies
npm install

# Run type check
npx tsc --noEmit

# Build
npm run build

# Test build
npm run start

# Should show: ✓ Ready on http://localhost:3000
```

### Deploy to Vercel
```bash
# 1. Push code to GitHub
git add .
git commit -m "Hospital EMR - Production Ready"
git push

# 2. Go to vercel.com → New Project → Import GitHub repo
# 3. Set environment variables (from .env.local)
# 4. Deploy
# 5. Test in production
```

### Deploy to Other Platforms

**AWS Amplify**
```bash
npm install -g @aws-amplify/cli
amplify configure
amplify init
amplify publish
```

**Railway**
```bash
npm install -g railway
railway login
railway init
railway up
```

**Render**
```
1. Push to GitHub
2. Connect GitHub to Render
3. Create Web Service
4. Set environment variables
5. Deploy
```

---

## 🧪 Post-Deployment Testing

### 1. Access Check
- [ ] Can access login page at `https://your-domain.com`
- [ ] Can login with test admin account
- [ ] Can login with test doctor account
- [ ] Can login with test nurse account
- [ ] Can login with test pharmacist account
- [ ] Can login with test front-desk account

### 2. Front Desk Module
- [ ] Patient registration form loads
- [ ] Can register new patient
- [ ] Patient appears in queue
- [ ] Can move patient to consultation
- [ ] Can process payment
- [ ] Can discharge patient

### 3. Doctor Module
- [ ] Can see patient queue
- [ ] Can start consultation
- [ ] Can create prescription
- [ ] Can order lab tests
- [ ] Can assign nursing care
- [ ] Patient status updates after consultation

### 4. Nurse Module
- [ ] Can see assigned patients
- [ ] Can record vital signs
- [ ] Can mark actions complete
- [ ] Patient status updates after completion

### 5. Lab Tech Module
- [ ] Can see pending tests
- [ ] Can upload test results
- [ ] Can attach files
- [ ] Patient status updates after completion

### 6. Pharmacist Module
- [ ] Can see pending prescriptions
- [ ] Can dispense medications
- [ ] Can verify drugs
- [ ] Patient status updates after dispensing

### 7. Real-Time Features
- [ ] Open patient dashboard in 2 tabs
- [ ] Update status in one tab
- [ ] Other tab updates without refresh
- [ ] Check console for WebSocket messages

### 8. Audit Logging
- [ ] Perform action (create patient, consultation, etc.)
- [ ] Check `/admin/audit-logs`
- [ ] Action appears in log with timestamp
- [ ] User ID is recorded correctly

### 9. Error Handling
- [ ] Turn off network (DevTools)
- [ ] Try to save form
- [ ] Should show "Network error" or similar
- [ ] Turn network back on
- [ ] Form should work again

### 10. Performance
- [ ] Page load < 2 seconds
- [ ] Form submission < 1 second
- [ ] Patient list with 100 records loads smoothly
- [ ] Search works without lag
- [ ] Real-time updates < 500ms

---

## 🔍 Monitoring

### Set Up Error Tracking
```bash
# Option 1: Sentry
npm install @sentry/nextjs
# Configure in next.config.js and pages

# Option 2: LogRocket
npm install logrocket
# Add to app initialization
```

### Enable Analytics
```bash
# Option 1: Google Analytics
npm install next-google-analytics
# Configure in layout.tsx

# Option 2: Plausible Analytics
# Add <script async defer data-domain="yourdomain.com" src="https://plausible.io/js/script.js"></script>
```

### Monitor Database
- [ ] Check Appwrite dashboard regularly
- [ ] Monitor database storage usage
- [ ] Check for failed queries
- [ ] Review audit logs for suspicious activity

---

## 🚨 Rollback Plan

If something goes wrong after deployment:

### Quick Rollback (Vercel)
```bash
# Go to Vercel dashboard
# Deployments tab → Select previous deployment → Promote to Production
```

### Emergency Maintenance Mode
```typescript
// Add to app/layout.tsx
if (process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true") {
  return <MaintenancePage />;
}
```

### Database Rollback
- Regular backups in Appwrite
- Export collections before major changes
- Document collection schema changes

---

## 🔐 Security Hardening

### Before Going Live
- [ ] Enable HTTPS (Vercel does this automatically)
- [ ] Set CORS headers
- [ ] Review Appwrite security rules
- [ ] Disable public access to collections
- [ ] Review all API keys (regenerate if exposed)
- [ ] Set up rate limiting
- [ ] Enable 2FA for admin accounts
- [ ] Review audit logs for suspicious activity

### Ongoing
- [ ] Monitor for security updates
- [ ] Keep dependencies up to date
- [ ] Review access logs weekly
- [ ] Rotate API keys monthly
- [ ] Backup database weekly
- [ ] Review Appwrite dashboard for failed auth attempts

---

## 📞 Support & Troubleshooting

### Common Issues

**Login Not Working**
```
1. Check Clerk/Appwrite auth configuration
2. Verify environment variables are set
3. Check browser console for auth errors
4. Verify user exists in auth system
5. Check network tab for failed requests
```

**Patient Not Appearing in Queue**
```
1. Check patient status is "AwaitingConsultation"
2. Verify patient exists in database
3. Check current user is Front Desk role
4. Refresh page (clear browser cache)
5. Check audit log for registration event
```

**Real-Time Not Updating**
```
1. Check WebSocket connection in DevTools
2. Verify Appwrite realtime URL is correct
3. Check firewall not blocking WebSockets
4. Try manual refresh
5. Check browser console for errors
```

**Slow Performance**
```
1. Check database indexes are created
2. Check for N+1 queries in service layer
3. Implement pagination for large lists
4. Enable browser caching
5. Consider CDN for static assets
```

### Get Help
1. Check TESTING_GUIDE.md for specific scenario help
2. Check COMPLETE_WORKFLOW_GUIDE.md for functionality docs
3. Check API_REFERENCE_COMPLETE.md for function docs
4. Review implementation code in similar feature
5. Check Appwrite documentation
6. Check Next.js documentation

---

## 📋 Launch Day Checklist

**Morning (4 hours before launch)**
- [ ] Run full test suite
- [ ] Check all environment variables
- [ ] Verify database backups
- [ ] Test on production domain
- [ ] Notify team to avoid changes

**Hour Before Launch**
- [ ] Final database backup
- [ ] Check monitoring/alerting setup
- [ ] Brief team on support process
- [ ] Have rollback plan ready

**At Launch**
- [ ] Deploy to production
- [ ] Monitor error tracking for 30 minutes
- [ ] Check application logs
- [ ] Verify patient flow works
- [ ] Have team on standby

**First Day**
- [ ] Monitor 24/7
- [ ] Check analytics for usage patterns
- [ ] Respond quickly to issues
- [ ] Document any changes made

---

## 🎉 Post-Launch

**Week 1**
- [ ] Daily monitoring of errors and performance
- [ ] Collect user feedback
- [ ] Fix critical bugs immediately
- [ ] Document lessons learned

**Week 2-4**
- [ ] Minor improvements based on feedback
- [ ] Optimize based on usage patterns
- [ ] Train hospital staff on system
- [ ] Finalize documentation

**Month 2+**
- [ ] Regular maintenance updates
- [ ] Monitor security
- [ ] Plan enhancements
- [ ] Support hospital operations

---

**Good luck with your launch! The system is production-ready. 🚀**
