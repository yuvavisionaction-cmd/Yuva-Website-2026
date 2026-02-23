# PHASE 2: PROBLEM ANALYSIS - VIMARSH EVENT REGISTRATION SYSTEM
**Analysis Date:** January 18, 2026  
**System:** Vimarsh 2025 Event Registration, Payment, Ticketing & Check-in  
**Status:** READ-ONLY PROBLEM IDENTIFICATION

---

## PHASE 2.1: PAYMENT & ORDER FLOW ISSUES

### 2.1.1 Duplicate Order Creation Problem
**Issue:** Multiple Razorpay orders created for single registration attempt

**Root Causes:**
- No client-side debouncing on form submission (registration.html line 1226)
- No server-side duplicate order prevention in `handleCreateOrder()` (code.gs line 233)
- User can click "Proceed to Payment" multiple times before Razorpay modal opens
- Browser back button after payment creates new order on re-submission

**Impact:**
- Multiple pending orders in Google Sheets for same email
- Razorpay dashboard shows abandoned orders
- Manual reconciliation required to identify valid payments
- Inflated registration count in analytics

**Current Behavior:**
1. User submits form → Order 1 created
2. User clicks again (slow network) → Order 2 created
3. User pays Order 1 → Order 2 remains "Pending" forever
4. Sheet shows 2 rows for same person

### 2.1.2 Payment Verification Race Condition
**Issue:** Webhook and manual confirmation can conflict

**Root Causes:**
- Both `handlePaymentConfirmation()` (line 339) and `handleRazorpayWebhook()` (line 395) update same row
- No locking mechanism between webhook and frontend confirmation
- Webhook signature verification uses different secret than payment signature

**Impact:**
- Potential for duplicate email sends
- QR code regenerated twice
- Last-write-wins creates audit confusion

### 2.1.3 Email Already Registered Check Weakness
**Issue:** Email check happens AFTER order creation

**Current Flow (registration.html line 1252):**
1. Form submitted
2. Order created in Razorpay
3. Row added to sheet with "Pending"
4. THEN email check happens
5. If duplicate found, user sees error but order already exists

**Impact:**
- Abandoned orders in Razorpay for duplicate emails
- Sheet pollution with invalid pending registrations

---

## PHASE 2.2: EMAIL & TICKET DELIVERY ISSUES

### 2.2.1 Email Delivery Failure - No Retry
**Issue:** Single-attempt email sending with no fallback

**Root Causes:**
- `sendPaymentConfirmationEmail()` (code.gs line 638) uses try-catch but only logs errors
- No queue system for failed emails
- GmailApp quota limits (500 emails/day) can be exceeded
- No status tracking for email delivery

**Impact:**
- User pays successfully but receives no confirmation
- No QR code delivered
- User cannot check-in at event
- Support team manually resends emails

**Failure Scenarios:**
- Gmail quota exceeded
- Invalid email address format
- Temporary Gmail API outage
- Email caught in spam filter (no tracking)

### 2.2.2 QR Code Generation Dependency
**Issue:** QR code URL generated but not validated

**Current Implementation (code.gs line 553):**
```javascript
return `https://api.qrserver.com/v1/create-qr-code/?size=300x300...`
```

**Problems:**
- External API dependency (qrserver.com) - no SLA
- No verification that QR image was created
- QR URL stored but image may 404 later
- Email embeds QR as `<img src="">` - fails silently if API down

**Impact:**
- Email sent with broken QR image
- User cannot check-in
- No fallback to text-based check-in code

### 2.2.3 Email Content Inconsistency
**Issue:** Payment amount hardcoded in email template

**Code Location (code.gs line 642-648):**
```javascript
let amount = 300; // Default student amount
if (registrationDetails.paymentCategory === 'Teacher' || 
    registrationDetails.paymentCategory === 'Other') {
  amount = 1200;
}
```

**Problems:**
- Amount calculated in email function, not from actual payment
- If Razorpay config changes, email shows wrong amount
- No validation against actual `payment.amount` from Razorpay

---

## PHASE 2.3: QR CHECK-IN & SCANNING ISSUES

### 2.3.1 Admin Authentication Weakness
**Issue:** QR scan requires admin key but has usability problems

**Current Flow (code.gs line 144-180):**
1. QR scanned → GET request to Apps Script
2. If not admin email → Show password form
3. User enters `ADMIN_KEY` in browser
4. Key sent as GET parameter (visible in URL)
5. Check-in processed

**Security Issues:**
- Admin key transmitted in URL query string (logged in browser history)
- No session - key required for EVERY scan
- Key shared among all admins (no individual accountability)
- No key rotation mechanism

**Usability Issues:**
- Tech Heads must enter password for every single attendee
- Slows down check-in queue
- Password visible on screen to attendees
- No mobile-optimized interface

### 2.3.2 Duplicate Check-In Detection
**Issue:** Already checked-in users show confusing response

**Code (code.gs line 784-794):**
```javascript
if (values[i][COLUMNS.CHECKED_IN_STATUS] === 'Yes') {
  return {
    success: false,  // ← Marked as failure
    message: 'Already checked in',
    data: { ...alreadyCheckedIn: true }
  };
}
```

**Problems:**
- `success: false` makes it look like an error
- Admin sees "Check-in failed" for valid attendee
- No timestamp of original check-in
- Cannot distinguish between "already checked in" and "invalid QR"

### 2.3.3 Offline Check-In Impossible
**Issue:** System requires internet for every scan

**Dependencies:**
- Google Apps Script must be reachable
- Google Sheets API must be available
- No local caching of registration data
- No offline mode for check-in

**Impact During Event:**
- WiFi outage stops all check-ins
- Slow network creates long queues
- No contingency for network failure

### 2.3.4 QR Code URL Structure Exposes System
**Issue:** Check-in URL reveals Apps Script deployment

**Current QR Content (code.gs line 556):**
```
https://script.google.com/macros/s/AKfycbx.../exec?action=checkin&uniqueId=VIM...
```

**Problems:**
- Exposes Google Apps Script URL publicly
- Anyone can craft check-in requests
- No rate limiting on check-in endpoint
- Potential for automated check-in attacks

---

## PHASE 2.4: ADMIN ROLES & SESSION PROBLEMS

### 2.4.1 No Role-Based Access Control
**Issue:** Only binary admin/non-admin distinction

**Current Implementation (code.gs line 78-87):**
- Checks if email in `ADMIN_EMAILS` array OR `adminKey` matches
- No differentiation between Tech Head and Member roles
- All admins have identical permissions

**Missing Capabilities:**
- Tech Heads cannot view logs that Members cannot
- No "view-only" role for observers
- Cannot restrict certain admins to specific functions
- No audit trail of who performed which action

### 2.4.2 Session Management Absent
**Issue:** No session persistence for admin users

**Current Behavior:**
- Every API call requires re-authentication
- Admin key or email check on EVERY request
- No JWT or session token
- Mobile app would require login per action

**Impact:**
- Poor user experience for dashboard
- Cannot build persistent admin interface
- Logout mechanism doesn't exist (nothing to log out from)

### 2.4.3 Admin Dashboard Missing
**Issue:** No centralized admin interface exists

**Current Admin Capabilities:**
- Can call `handleGetRegistrations()` with admin key (code.gs line 855)
- Returns JSON data only
- No HTML dashboard provided
- No filtering, search, or export features

**What Admins Cannot Do:**
- View real-time registration count
- Search by name/email/college
- Filter by payment status or check-in status
- Export filtered data
- Resend confirmation emails from UI
- View payment timeline for a registration

---

## PHASE 2.5: DATA SYNC & AUDIT GAPS

### 2.5.1 Google Sheets as Single Source of Truth
**Issue:** All data stored only in Google Sheets

**Risks:**
- Accidental deletion of rows (no recycle bin)
- No version history for cell edits
- Concurrent edits can cause data loss
- Sheet corruption affects entire system
- No automated backup mechanism

**Observed in Code:**
- No database transactions
- Direct sheet manipulation (code.gs line 295: `sheet.appendRow()`)
- No data validation before write
- No foreign key constraints

### 2.5.2 Razorpay-Sheet Reconciliation Gap
**Issue:** No automated reconciliation between Razorpay and Sheets

**Discrepancy Scenarios:**
1. **Webhook fails** → Payment captured in Razorpay, Sheet shows "Pending"
2. **Sheet row deleted** → Payment exists in Razorpay, no registration record
3. **Manual sheet edit** → Payment status changed without Razorpay verification
4. **Refund in Razorpay** → Sheet still shows "Completed"

**No Automated Detection:**
- No daily reconciliation job
- No alerts for mismatches
- Manual CSV export and comparison required

### 2.5.3 Unique ID Collision Risk
**Issue:** Unique ID generation not guaranteed unique

**Current Generation (code.gs line 67-70):**
```javascript
function generateUniqueId() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `VIM${timestamp}${random}`;
}
```

**Collision Scenarios:**
- Two requests in same millisecond with same random number
- Probability low but non-zero at scale
- No uniqueness check before insertion
- No database constraint to prevent duplicates

### 2.5.4 Volunteer Registration Separate System
**Issue:** Volunteer system (code volunteer.txt) completely isolated

**Separate Components:**
- Different Google Sheet (ID: 1lWOnRqKTjtB5tQ2Vo3FlsjnLztrLc9cpqtA7dj67yFM)
- Different Apps Script deployment
- Different column structure
- No cross-reference between attendee and volunteer registrations

**Impact:**
- Person can register as both attendee and volunteer
- No unified check-in system
- Duplicate payment if registered twice
- Cannot generate combined reports

---

## PHASE 2.6: FRONTEND VALIDATION & UX ISSUES

### 2.6.1 Form Validation Inconsistency
**Issue:** Client-side validation doesn't match server-side

**Example - Email Validation:**
- **Frontend** (registration.html line 1027): `/^[a-z][a-z0-9._%+-]*@[a-z0-9.-]+\.[a-z]{2,}$/`
- **Backend**: No email format validation in `handleCreateOrder()`

**Problems:**
- User can bypass frontend validation via API
- Server accepts invalid data
- No sanitization of inputs

### 2.6.2 Payment Modal Dismissal Handling
**Issue:** User closing Razorpay modal leaves orphaned order

**Code (registration.html line 1157-1162):**
```javascript
modal: {
  ondismiss: function () {
    toggleLoading(false);
    showErrorModal('Payment was cancelled...');
  }
}
```

**Problems:**
- Order already created in Razorpay
- Row already in Google Sheet with "Pending"
- User sees error but can retry → creates duplicate order
- No cleanup of cancelled orders

### 2.6.3 Loading State Management
**Issue:** No timeout for loading spinner

**Code (registration.html line 1130-1134):**
```javascript
function toggleLoading(show) {
  document.getElementById('loadingSpinner').style.display = show ? 'block' : 'none';
  // No timeout mechanism
}
```

**Impact:**
- If API call hangs, spinner shows forever
- User cannot retry without page refresh
- No error shown after reasonable timeout

---

## PHASE 2.7: CRITICAL EDGE CASES

### 2.7.1 Payment Success but Confirmation Fails
**Scenario:**
1. User completes Razorpay payment
2. `handlePaymentSuccess()` called (registration.html line 1176)
3. Network fails during confirmation POST
4. Payment captured but sheet not updated

**Current Handling:**
- Shows error: "Payment succeeded, but we could not confirm..." (line 1207)
- User confused - money deducted, no confirmation email
- Manual intervention required

**No Automated Recovery:**
- Webhook should catch this, but if webhook also fails...
- No retry queue for confirmation
- Support team must manually verify and update

### 2.7.2 Concurrent Registration Attempts
**Scenario:**
- User opens registration form in 2 browser tabs
- Submits both simultaneously with same email

**Current Behavior:**
- Email check (line 1252) happens in both tabs
- Both pass (race condition)
- Two orders created
- User pays one, other remains pending

### 2.7.3 QR Code Scan Before Payment Complete
**Scenario:**
- User receives QR code somehow (email forwarded, screenshot)
- Scans QR before payment completes
- Check-in attempted

**Current Handling (code.gs line 781-782):**
```javascript
if (values[i][COLUMNS.PAYMENT_STATUS] !== 'Completed') {
  return { success: false, message: 'Payment not completed...' };
}
```

**Issue:**
- Generic error message
- Admin doesn't know if payment pending or failed
- No way to manually override for cash payments

---

## SUMMARY OF CRITICAL PROBLEMS

### High Priority Issues:
1. **Duplicate order creation** - No prevention mechanism
2. **Email delivery failure** - No retry or fallback
3. **QR code dependency** - External API, no validation
4. **Admin authentication** - Insecure, poor UX
5. **No reconciliation** - Razorpay vs Sheets mismatches
6. **Single point of failure** - Google Sheets only

### Medium Priority Issues:
7. **No role-based access** - All admins equal
8. **No session management** - Re-auth every request
9. **Offline check-in impossible** - Network required
10. **Volunteer system isolated** - No integration

### Low Priority Issues:
11. **Form validation gaps** - Frontend/backend mismatch
12. **Loading state timeout** - No error recovery
13. **Unique ID collision** - Low probability but possible

---

## IMPACT ASSESSMENT

### User Impact:
- **Payment confusion** - Money deducted, no confirmation
- **Check-in delays** - Slow QR scanning process
- **Email issues** - Missing tickets, cannot attend

### Admin Impact:
- **Manual reconciliation** - Hours of spreadsheet work
- **Check-in bottleneck** - Password entry per attendee
- **No visibility** - Cannot track registrations in real-time

### System Impact:
- **Data integrity** - Orphaned orders, duplicate records
- **Audit trail** - Cannot prove who did what when
- **Scalability** - System slows with concurrent users

---

**END OF PHASE 2 ANALYSIS**
