# PHASE 3: SYSTEM ARCHITECTURE DESIGN
**Design Date:** January 18, 2026  
**System:** Vimarsh Event Registration & Check-in Platform  
**Status:** IMPLEMENTATION-READY BLUEPRINT

---

## 1. SYSTEM OVERVIEW

### 1.1 Architecture Principles
- **Supabase as Primary Database** - Real-time source of truth
- **Google Sheets as Audit Mirror** - Backup and reconciliation only
- **Deterministic ID Generation** - Same input = same output
- **Stateless PDF Generation** - No file storage, generate on-demand
- **Session-Based Admin Auth** - Login once, scan many
- **Atomic Check-in Operations** - Prevent race conditions

### 1.2 Component Responsibilities

| Component | Responsibilities | NOT Responsible For |
|-----------|-----------------|---------------------|
| **Frontend (HTML/JS)** | Form validation, college selection, status display, ticket retrieval UI | Payment processing, email sending |
| **Supabase** | User data, auth, RBAC, real-time sync, check-in state | Email delivery, PDF generation |
| **Google Apps Script** | Email sending, PDF generation, Razorpay verification, audit sync | Primary data storage |
| **Google Sheets** | Audit trail, backup mirror, manual reconciliation | Real-time queries, source of truth |
| **Razorpay** | Payment processing, order management | User data storage |

---

## 2. DATA MODELS

### 2.1 Supabase Schema

#### Table: `registrations`
```sql
CREATE TABLE registrations (
  -- Primary Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id TEXT UNIQUE NOT NULL, -- Deterministic: VIM2025-{college_code}-{seq}
  
  -- Personal Information
  first_name TEXT NOT NULL,
  last_name TEXT,
  email TEXT NOT NULL,
  mobile TEXT NOT NULL,
  age_group TEXT NOT NULL,
  blood_group TEXT NOT NULL,
  
  -- Academic Information
  college TEXT NOT NULL,
  zone TEXT NOT NULL, -- Auto-derived from college, non-editable
  state TEXT NOT NULL,
  
  -- Event Information
  payment_category TEXT NOT NULL, -- Student/Faculty/Research Scholar/Other
  previous_vimarsh TEXT,
  how_you_know TEXT,
  
  -- Payment Information
  razorpay_order_id TEXT UNIQUE,
  razorpay_payment_id TEXT UNIQUE,
  payment_status TEXT NOT NULL DEFAULT 'pending', -- pending/completed/failed/refunded
  amount_paid INTEGER NOT NULL, -- in paise
  payment_verified_at TIMESTAMPTZ,
  
  -- QR & Check-in
  qr_code_hash TEXT UNIQUE NOT NULL, -- Deterministic hash of registration_id
  checked_in BOOLEAN DEFAULT FALSE,
  checked_in_at TIMESTAMPTZ,
  checked_in_by UUID REFERENCES admin_users(id), -- Admin who scanned
  wristband_issued BOOLEAN DEFAULT FALSE,
  kit_issued BOOLEAN DEFAULT FALSE,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  email_sent BOOLEAN DEFAULT FALSE,
  email_sent_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT valid_email CHECK (email ~* '^[a-z][a-z0-9._%+-]*@[a-z0-9.-]+\.[a-z]{2,}$'),
  CONSTRAINT valid_mobile CHECK (mobile ~ '^[6-9][0-9]{9}$'),
  CONSTRAINT valid_payment_status CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded'))
);

-- Indexes
CREATE INDEX idx_reg_email ON registrations(email);
CREATE INDEX idx_reg_payment_status ON registrations(payment_status);
CREATE INDEX idx_reg_checked_in ON registrations(checked_in);
CREATE INDEX idx_reg_razorpay_order ON registrations(razorpay_order_id);
CREATE INDEX idx_reg_qr_hash ON registrations(qr_code_hash);
```

#### Table: `admin_users`
```sql
CREATE TABLE admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL, -- tech_head/member
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ,
  
  CONSTRAINT valid_role CHECK (role IN ('tech_head', 'member'))
);
```

#### Table: `check_in_logs`
```sql
CREATE TABLE check_in_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id TEXT NOT NULL REFERENCES registrations(registration_id),
  admin_id UUID NOT NULL REFERENCES admin_users(id),
  action TEXT NOT NULL, -- check_in/already_checked_in/payment_pending/invalid
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);

CREATE INDEX idx_checkin_reg ON check_in_logs(registration_id);
CREATE INDEX idx_checkin_admin ON check_in_logs(admin_id);
CREATE INDEX idx_checkin_timestamp ON check_in_logs(timestamp DESC);
```

#### Table: `college_zone_mapping`
```sql
CREATE TABLE college_zone_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_name TEXT UNIQUE NOT NULL,
  zone TEXT NOT NULL, -- North/South/East/West/Central
  college_code TEXT UNIQUE NOT NULL, -- 3-letter code for registration ID
  active BOOLEAN DEFAULT TRUE
);

-- Pre-populate with all colleges from registration form
```

### 2.2 Registration ID Generation Logic

**Format:** `VIM2025-{ZONE_CODE}-{COLLEGE_CODE}-{SEQUENCE}`

**Example:** `VIM2025-N-DU-00142`

**Components:**
- `VIM2025` - Event identifier
- `N` - Zone code (N/S/E/W/C)
- `DU` - College code (3 letters)
- `00142` - Sequential number per college (5 digits, zero-padded)

**Deterministic Generation:**
```sql
-- Supabase Function
CREATE OR REPLACE FUNCTION generate_registration_id(
  p_college TEXT
) RETURNS TEXT AS $$
DECLARE
  v_zone_code TEXT;
  v_college_code TEXT;
  v_sequence INTEGER;
  v_reg_id TEXT;
BEGIN
  -- Get zone and college code
  SELECT 
    SUBSTRING(zone FROM 1 FOR 1),
    college_code
  INTO v_zone_code, v_college_code
  FROM college_zone_mapping
  WHERE college_name = p_college AND active = TRUE;
  
  -- Get next sequence for this college
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(registration_id FROM 'VIM2025-.-...-(.*)') AS INTEGER)
  ), 0) + 1
  INTO v_sequence
  FROM registrations
  WHERE college = p_college;
  
  -- Build registration ID
  v_reg_id := 'VIM2025-' || v_zone_code || '-' || v_college_code || '-' || 
              LPAD(v_sequence::TEXT, 5, '0');
  
  RETURN v_reg_id;
END;
$$ LANGUAGE plpgsql;
```

### 2.3 QR Code Hash Generation

**Deterministic Hash:**
```javascript
// Frontend & Backend use same algorithm
function generateQRHash(registrationId) {
  const secret = 'VIMARSH_2025_QR_SECRET'; // Shared secret
  const payload = `${registrationId}:${secret}`;
  return SHA256(payload).substring(0, 16); // 16-char hash
}
```

**QR Code Content:**
```
https://vimarsh.yuva.ind.in/checkin?qr={hash}
```

**Benefits:**
- Same registration ID always generates same QR
- QR cannot be forged without secret
- Hash lookup in database is fast (indexed)

---

## 3. END-TO-END USER FLOW

### 3.1 Registration Flow

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: Form Submission                                     │
└─────────────────────────────────────────────────────────────┘
User fills form → Frontend validates
↓
Frontend calls: POST /api/registration/initiate
{
  firstName, lastName, email, mobile, college, paymentCategory, ...
}
↓
Backend (Supabase Edge Function):
1. Check if email already registered with completed payment
   → If YES: Return error "Email already registered"
2. Derive zone from college (college_zone_mapping table)
3. Generate deterministic registration_id
4. Generate QR hash from registration_id
5. Insert into registrations table (status: pending)
6. Create Razorpay order via API
7. Update razorpay_order_id in registration
8. Return: { registrationId, orderId, amount, qrHash }

┌─────────────────────────────────────────────────────────────┐
│ STEP 2: Payment                                             │
└─────────────────────────────────────────────────────────────┘
Frontend receives orderId → Opens Razorpay modal
User completes payment
↓
Razorpay returns: { razorpay_payment_id, razorpay_order_id, razorpay_signature }
↓
Frontend calls: POST /api/payment/verify
{
  registrationId,
  razorpayPaymentId,
  razorpayOrderId,
  razorpaySignature
}
↓
Backend (Supabase Edge Function):
1. Verify signature using Razorpay secret
2. Fetch payment details from Razorpay API
3. Update registrations:
   - payment_status = 'completed'
   - razorpay_payment_id = {paymentId}
   - payment_verified_at = NOW()
4. Trigger Google Apps Script webhook for email
5. Sync to Google Sheets (async)
6. Return: { success: true, registrationId }

┌─────────────────────────────────────────────────────────────┐
│ STEP 3: Email Confirmation                                  │
└─────────────────────────────────────────────────────────────┘
Google Apps Script receives webhook
↓
Fetch registration data from Supabase
Generate QR code image (inline, base64)
Send email with:
  - Registration ID
  - Event details
  - Inline QR code image
  - Link to retrieve ticket: https://vimarsh.yuva.ind.in/ticket?id={registrationId}
↓
Update registrations: email_sent = TRUE, email_sent_at = NOW()
```

### 3.2 Duplicate Prevention Logic

**Scenario: User clicks "Proceed to Payment" multiple times**

```javascript
// Frontend: Debounce submit button
let orderCreationInProgress = false;

async function handleSubmit(e) {
  e.preventDefault();
  
  if (orderCreationInProgress) {
    return; // Ignore duplicate clicks
  }
  
  orderCreationInProgress = true;
  submitBtn.disabled = true;
  
  try {
    const result = await createOrder(formData);
    // ... proceed to payment
  } finally {
    orderCreationInProgress = false;
    submitBtn.disabled = false;
  }
}
```

**Scenario: User presses back button after payment**

```javascript
// Frontend: Prevent form resubmission
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    // Page loaded from cache (back button)
    window.location.reload(); // Force fresh load
  }
});

// Store payment completion in sessionStorage
if (sessionStorage.getItem('paymentCompleted')) {
  window.location.href = '/ticket?id=' + sessionStorage.getItem('registrationId');
}
```

**Backend: Idempotency Check**

```sql
-- Before creating order, check for existing pending order
SELECT registration_id, razorpay_order_id, payment_status
FROM registrations
WHERE email = $1
  AND payment_status IN ('pending', 'completed')
ORDER BY created_at DESC
LIMIT 1;

-- If pending order exists < 15 minutes old, return existing order
-- If completed, reject with error
-- Otherwise, create new registration
```

### 3.3 Payment Verification Flow

**Dual Verification (Webhook + Frontend):**

```
Payment Completed in Razorpay
        ↓
    ┌───┴───┐
    ↓       ↓
Webhook   Frontend
(async)   (sync)
    ↓       ↓
    └───┬───┘
        ↓
  First one wins
  (idempotent update)
```

**Idempotent Update:**
```sql
UPDATE registrations
SET 
  payment_status = 'completed',
  razorpay_payment_id = $1,
  payment_verified_at = COALESCE(payment_verified_at, NOW())
WHERE razorpay_order_id = $2
  AND payment_status = 'pending'
RETURNING registration_id;

-- If 0 rows updated, payment already verified
```

---

## 4. TICKET SYSTEM

### 4.1 No Permanent Storage

**Design Principle:** Tickets are generated on-demand, never stored.

**Ticket Retrieval Flow:**

```
User visits: https://vimarsh.yuva.ind.in/ticket?id=VIM2025-N-DU-00142
↓
Frontend calls: GET /api/ticket/generate?registrationId={id}
↓
Backend:
1. Fetch registration from Supabase
2. Verify payment_status = 'completed'
3. Generate QR code image (base64)
4. Call Google Apps Script: generateTicketPDF
5. Apps Script:
   - Loads Canva template (HTML/CSS)
   - Injects registration data
   - Generates PDF using HTML-to-PDF library
   - Returns PDF as base64
6. Backend streams PDF to user
↓
User downloads ticket (filename: Vimarsh_2025_{RegistrationID}.pdf)
```

**Canva Template Structure:**
```html
<!-- ticket-template.html in Google Apps Script -->
<!DOCTYPE html>
<html>
<head>
  <style>
    /* Ticket design from ticket.html */
    /* Inject dynamic data via placeholders */
  </style>
</head>
<body>
  <div class="ticket">
    <div class="left">
      <div class="ticket-number">{{REGISTRATION_ID}}</div>
      <!-- Event details -->
    </div>
    <div class="right">
      <div class="barcode">
        <img src="{{QR_CODE_BASE64}}" />
      </div>
      <p class="name">{{FIRST_NAME}} {{LAST_NAME}}</p>
      <p class="college">{{COLLEGE}}</p>
    </div>
  </div>
</body>
</html>
```

### 4.2 Email Design

**Confirmation Email (No PDF Attachment):**

```html
Subject: ✅ Vimarsh 2025 Registration Confirmed - {{REGISTRATION_ID}}

Body:
- Welcome message
- Registration ID (prominent)
- Event dates & venue
- Inline QR code image (150x150px, base64)
- Link to download ticket: [Download Your Ticket]
- WhatsApp group link
- Support contact
```

**Benefits:**
- Small email size (< 100KB)
- Fast delivery
- No attachment size limits
- Users can re-download ticket anytime

---

## 5. QR CHECK-IN SYSTEM

### 5.1 Check-in Page Flow

```
Admin scans QR code
↓
QR contains: https://vimarsh.yuva.ind.in/checkin?qr=a1b2c3d4e5f6g7h8
↓
Page loads → Check admin session
↓
┌─────────────────────────────────────┐
│ If NOT logged in:                   │
│ → Redirect to /admin/login          │
│ → After login, redirect back to QR  │
└─────────────────────────────────────┘
↓
┌─────────────────────────────────────┐
│ If logged in:                       │
│ → Fetch registration by qr_hash     │
│ → Display registration details      │
│ → Show check-in button              │
└─────────────────────────────────────┘
↓
Admin clicks "Confirm Check-in"
↓
POST /api/checkin/confirm
{
  qrHash: "a1b2c3d4e5f6g7h8",
  adminId: "uuid-of-admin"
}
↓
Backend (Atomic Transaction):
BEGIN;
  -- 1. Verify payment completed
  SELECT payment_status, checked_in 
  FROM registrations 
  WHERE qr_code_hash = $1
  FOR UPDATE; -- Lock row
  
  -- 2. Check if already checked in
  IF checked_in = TRUE THEN
    ROLLBACK;
    RETURN { status: 'already_checked_in', timestamp: checked_in_at };
  END IF;
  
  -- 3. Perform check-in
  UPDATE registrations
  SET 
    checked_in = TRUE,
    checked_in_at = NOW(),
    checked_in_by = $2,
    wristband_issued = TRUE, -- First check-in
    kit_issued = TRUE
  WHERE qr_code_hash = $1;
  
  -- 4. Log action
  INSERT INTO check_in_logs (registration_id, admin_id, action)
  VALUES ((SELECT registration_id FROM registrations WHERE qr_code_hash = $1), $2, 'check_in');
COMMIT;
↓
Return: { 
  status: 'success', 
  registrationId: 'VIM2025-N-DU-00142',
  name: 'John Doe',
  college: 'Delhi University',
  timestamp: '2025-07-11T09:30:00Z'
}
```

### 5.2 Check-in UI States

**State 1: Payment Pending**
```
┌──────────────────────────────────────┐
│ ⚠️  Payment Not Completed            │
│                                      │
│ Registration ID: VIM2025-N-DU-00142  │
│ Name: John Doe                       │
│ Status: Payment Pending              │
│                                      │
│ [Contact Support]                    │
└──────────────────────────────────────┘
```

**State 2: Ready for Check-in**
```
┌──────────────────────────────────────┐
│ ✅ Valid Registration                │
│                                      │
│ ID: VIM2025-N-DU-00142               │
│ Name: John Doe                       │
│ College: Delhi University            │
│ Zone: North                          │
│                                      │
│ [✓ Confirm Check-in]                 │
└──────────────────────────────────────┘
```

**State 3: Already Checked In**
```
┌──────────────────────────────────────┐
│ ℹ️  Already Checked In               │
│                                      │
│ ID: VIM2025-N-DU-00142               │
│ Name: John Doe                       │
│ Checked in: Jul 11, 9:30 AM          │
│ By: Admin Name                       │
│ Wristband: ✓ Issued                  │
│                                      │
│ [Close]                              │
└──────────────────────────────────────┘
```

**State 4: Invalid QR**
```
┌──────────────────────────────────────┐
│ ❌ Invalid QR Code                   │
│                                      │
│ This QR code is not recognized.      │
│ Please verify and try again.         │
│                                      │
│ [Scan Another]                       │
└──────────────────────────────────────┘
```

### 5.3 Multi-Day Event Handling

**Day 1 Check-in:**
- Sets `checked_in = TRUE`
- Issues wristband and kit
- Records `checked_in_at`

**Day 2+ Check-in:**
- Verify wristband visually (not via QR)
- Optional: Scan QR to log attendance per day
- Add `daily_attendance` JSONB column:
  ```json
  {
    "2025-07-11": "09:30:00",
    "2025-07-12": "10:15:00",
    "2025-07-13": "09:45:00"
  }
  ```

---

## 6. ADMIN SYSTEM

### 6.1 Role-Based Access Control

**Roles:**

| Role | Permissions |
|------|-------------|
| **Tech Head** | • Full dashboard access<br>• View all registrations<br>• View check-in logs<br>• Export data<br>• Perform check-ins<br>• Search registrations<br>• View audit reports<br>• Manage admin users |
| **Member** | • Limited dashboard<br>• Perform check-ins<br>• Search registrations (basic)<br>• View own check-in history |

**Supabase RLS Policies:**

```sql
-- Tech Heads can see everything
CREATE POLICY tech_head_all ON registrations
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE id = auth.uid() AND role = 'tech_head' AND active = TRUE
  )
);

-- Members can only view for check-in
CREATE POLICY member_view ON registrations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE id = auth.uid() AND role = 'member' AND active = TRUE
  )
);

-- Members can update check-in status only
CREATE POLICY member_checkin ON registrations
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE id = auth.uid() AND role = 'member' AND active = TRUE
  )
)
WITH CHECK (
  -- Can only update check-in fields
  checked_in IS DISTINCT FROM OLD.checked_in OR
  checked_in_at IS DISTINCT FROM OLD.checked_in_at OR
  checked_in_by IS DISTINCT FROM OLD.checked_in_by
);
```

### 6.2 Admin Login Flow

```
Admin visits: https://vimarsh.yuva.ind.in/admin
↓
Supabase Auth Login Page
↓
Admin enters email + password
↓
Supabase Auth verifies credentials
↓
Check if user exists in admin_users table with active = TRUE
↓
If NOT admin → Show error "Unauthorized"
If admin → Create session (JWT token)
↓
Update admin_users: last_login = NOW()
↓
Redirect to dashboard based on role:
  - Tech Head → /admin/dashboard
  - Member → /admin/checkin
↓
Session persists for 24 hours (configurable)
```

**Session Management:**
```javascript
// Frontend: Store session
const { data: { session } } = await supabase.auth.getSession();
localStorage.setItem('adminSession', JSON.stringify(session));

// Auto-refresh before expiry
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED') {
    localStorage.setItem('adminSession', JSON.stringify(session));
  }
});

// Check session on every page load
if (!session || session.expires_at < Date.now()) {
  window.location.href = '/admin/login';
}
```

### 6.3 Admin Dashboard (Tech Head)

**Dashboard Sections:**

```
┌─────────────────────────────────────────────────────────────┐
│ VIMARSH 2025 ADMIN DASHBOARD                                │
│ Logged in as: admin@yuva.ind.in (Tech Head)    [Logout]     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│ │   Total  │ │  Paid    │ │ Checked  │ │ Pending  │       │
│ │   1,247  │ │  1,189   │ │   856    │ │    58    │       │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ RECENT CHECK-INS (Real-time)                            │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ 09:45 AM  VIM2025-N-DU-00142  John Doe  Delhi Univ.    │ │
│ │ 09:44 AM  VIM2025-S-LSR-00089 Jane Smith LSR College   │ │
│ │ ...                                                      │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ SEARCH REGISTRATIONS                                    │ │
│ │ [Search by ID, Name, Email, Mobile...]                  │ │
│ │                                                          │ │
│ │ Filters: [All] [Paid] [Pending] [Checked In]           │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ [📊 Export Data] [🔍 Audit Report] [👥 Manage Admins]      │
└─────────────────────────────────────────────────────────────┘
```

**Real-time Updates:**
```javascript
// Subscribe to check-in events
supabase
  .channel('checkins')
  .on('postgres_changes', 
    { event: 'UPDATE', schema: 'public', table: 'registrations', filter: 'checked_in=eq.true' },
    (payload) => {
      // Add to recent check-ins list (top)
      prependCheckIn(payload.new);
      updateStats();
    }
  )
  .subscribe();
```

### 6.4 QR Scanner Interface (Member)

```
┌─────────────────────────────────────────────────────────────┐
│ QR CHECK-IN SCANNER                                         │
│ Logged in as: member@yuva.ind.in (Member)       [Logout]    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │                                                          │ │
│ │              [Camera Viewfinder]                         │ │
│ │                                                          │ │
│ │         Point camera at QR code to scan                  │ │
│ │                                                          │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ Or enter Registration ID manually:                          │
│ [VIM2025-____________]  [Check In]                          │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ YOUR CHECK-INS TODAY: 47                                │ │
│ │ Last: VIM2025-N-DU-00142 (John Doe) - 2 mins ago       │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**QR Scanning Library:**
```javascript
// Use html5-qrcode library
const html5QrCode = new Html5Qrcode("reader");

html5QrCode.start(
  { facingMode: "environment" }, // Back camera
  { fps: 10, qrbox: 250 },
  (decodedText) => {
    // Extract QR hash from URL
    const url = new URL(decodedText);
    const qrHash = url.searchParams.get('qr');
    
    // Perform check-in
    performCheckIn(qrHash);
  }
);
```

---

## 7. AUDIT & RECONCILIATION

### 7.1 Google Sheets Sync

**Purpose:** Backup and manual reconciliation only

**Sync Trigger:** After every payment verification

**Google Apps Script Function:**
```javascript
function syncToSheets(registrationData) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Registrations');
  
  // Check if registration already exists
  const existingRow = findRowByRegistrationId(registrationData.registration_id);
  
  if (existingRow) {
    // Update existing row
    updateRow(existingRow, registrationData);
  } else {
    // Append new row
    sheet.appendRow([
      registrationData.registration_id,
      registrationData.first_name,
      registrationData.last_name,
      registrationData.email,
      registrationData.mobile,
      registrationData.college,
      registrationData.zone,
      registrationData.payment_category,
      registrationData.amount_paid / 100, // Convert paise to rupees
      registrationData.payment_status,
      registrationData.razorpay_payment_id,
      registrationData.checked_in ? 'Yes' : 'No',
      registrationData.created_at,
      registrationData.payment_verified_at
    ]);
  }
}
```

### 7.2 Razorpay Reconciliation

**Daily Reconciliation Job (Supabase Edge Function - Cron):**

```javascript
// Runs daily at 11:59 PM
export async function reconcilePayments() {
  // 1. Fetch all payments from Razorpay for today
  const razorpayPayments = await fetchRazorpayPayments(today);
  
  // 2. Fetch all registrations with payment_status = 'completed' for today
  const { data: dbPayments } = await supabase
    .from('registrations')
    .select('razorpay_payment_id, amount_paid, payment_status')
    .eq('payment_status', 'completed')
    .gte('payment_verified_at', startOfDay)
    .lte('payment_verified_at', endOfDay);
  
  // 3. Find discrepancies
  const discrepancies = [];
  
  for (const rzpPayment of razorpayPayments) {
    const dbPayment = dbPayments.find(p => p.razorpay_payment_id === rzpPayment.id);
    
    if (!dbPayment) {
      discrepancies.push({
        type: 'missing_in_db',
        razorpay_payment_id: rzpPayment.id,
        amount: rzpPayment.amount
      });
    } else if (dbPayment.amount_paid !== rzpPayment.amount) {
      discrepancies.push({
        type: 'amount_mismatch',
        razorpay_payment_id: rzpPayment.id,
        db_amount: dbPayment.amount_paid,
        razorpay_amount: rzpPayment.amount
      });
    }
  }
  
  // 4. Log discrepancies
  if (discrepancies.length > 0) {
    await supabase.from('audit_discrepancies').insert(discrepancies);
    
    // Send alert email to tech heads
    await sendAlertEmail({
      subject: `⚠️ Payment Reconciliation Alert - ${discrepancies.length} discrepancies`,
      discrepancies
    });
  }
  
  return { total: razorpayPayments.length, discrepancies: discrepancies.length };
}
```

---

## 8. ERROR HANDLING & RECOVERY

### 8.1 Payment Success but Confirmation Fails

**Scenario:** User pays, but network fails during verification

**Recovery Mechanism:**

1. **Razorpay Webhook (Backup):**
   - Webhook fires when payment captured
   - Updates Supabase independently
   - Triggers email if not already sent

2. **Manual Recovery API:**
   ```javascript
   // Admin can trigger manual verification
   POST /api/admin/verify-payment
   {
     razorpayPaymentId: "pay_xxxxx"
   }
   
   // Backend:
   // 1. Fetch payment from Razorpay
   // 2. Find registration by order_id
   // 3. Update payment status
   // 4. Send email if not sent
   ```

3. **User Self-Service:**
   - User visits: `/ticket?id={registrationId}`
   - If payment completed but email not sent, trigger email resend
   - Allow ticket download regardless of email status

### 8.2 Email Delivery Failure

**Retry Logic:**

```javascript
async function sendConfirmationEmail(registrationId, attempt = 1) {
  const MAX_ATTEMPTS = 3;
  
  try {
    await callGoogleAppsScript('sendEmail', { registrationId });
    
    // Mark as sent
    await supabase
      .from('registrations')
      .update({ email_sent: true, email_sent_at: new Date() })
      .eq('registration_id', registrationId);
      
  } catch (error) {
    if (attempt < MAX_ATTEMPTS) {
      // Exponential backoff: 5s, 25s, 125s
      await sleep(5000 * Math.pow(5, attempt - 1));
      return sendConfirmationEmail(registrationId, attempt + 1);
    } else {
      // Log failure
      await supabase.from('email_failures').insert({
        registration_id: registrationId,
        error: error.message,
        attempts: MAX_ATTEMPTS
      });
      
      // Alert admin
      await sendAlertToAdmin(`Email failed for ${registrationId}`);
    }
  }
}
```

### 8.3 Slow/Unstable Internet During Check-in

**Offline-First Check-in (Future Enhancement):**

```javascript
// Service Worker caches registration data
// Admin can download today's registrations for offline use

// Online: Real-time check-in
// Offline: Queue check-ins locally, sync when online

const checkInQueue = [];

async function performCheckIn(qrHash) {
  if (navigator.onLine) {
    return await checkInOnline(qrHash);
  } else {
    return checkInOffline(qrHash);
  }
}

function checkInOffline(qrHash) {
  // Find in cached data
  const registration = cachedRegistrations.find(r => r.qr_code_hash === qrHash);
  
  if (!registration) {
    return { error: 'Registration not found in offline cache' };
  }
  
  // Add to queue
  checkInQueue.push({
    qrHash,
    timestamp: new Date(),
    adminId: currentAdmin.id
  });
  
  // Mark locally
  registration.checked_in = true;
  
  return { success: true, offline: true };
}

// Sync when online
window.addEventListener('online', async () => {
  for (const item of checkInQueue) {
    await checkInOnline(item.qrHash);
  }
  checkInQueue.length = 0;
});
```

---

## 9. API ENDPOINTS

### 9.1 Public APIs (Supabase Edge Functions)

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/api/registration/initiate` | POST | Create registration & Razorpay order | None |
| `/api/payment/verify` | POST | Verify payment signature | None |
| `/api/ticket/generate` | GET | Generate ticket PDF | None (requires valid registration ID) |
| `/api/ticket/resend-email` | POST | Resend confirmation email | None (rate-limited) |

### 9.2 Admin APIs

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/api/admin/login` | POST | Admin login | Supabase Auth |
| `/api/admin/dashboard/stats` | GET | Dashboard statistics | Tech Head |
| `/api/admin/registrations` | GET | List registrations (paginated) | Tech Head/Member |
| `/api/admin/search` | GET | Search registrations | Tech Head/Member |
| `/api/admin/checkin/confirm` | POST | Perform check-in | Tech Head/Member |
| `/api/admin/checkin/logs` | GET | View check-in logs | Tech Head |
| `/api/admin/export` | GET | Export data (CSV) | Tech Head |
| `/api/admin/verify-payment` | POST | Manual payment verification | Tech Head |

### 9.3 Webhook Endpoints

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/api/webhook/razorpay` | POST | Razorpay payment webhook | Signature verification |
| `/api/webhook/sync-sheets` | POST | Trigger Google Sheets sync | Internal only |

---

## 10. DEPLOYMENT ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND                             │
│  vimarsh.yuva.ind.in (Static hosting - Vercel/Netlify)      │
│  - registration.html                                         │
│  - ticket.html                                               │
│  - admin/dashboard.html                                      │
│  - admin/checkin.html                                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                    SUPABASE (Backend)                        │
│  - PostgreSQL Database (Primary data store)                 │
│  - Supabase Auth (Admin authentication)                     │
│  - Edge Functions (API endpoints)                           │
│  - Realtime (Live updates)                                  │
│  - Row Level Security (RBAC)                                │
└──────────────┬──────────────────────┬────────────────────────┘
               │                      │
               ↓                      ↓
┌──────────────────────┐   ┌─────────────────────────────────┐
│   RAZORPAY API       │   │  GOOGLE APPS SCRIPT             │
│  - Create orders     │   │  - Send emails                  │
│  - Verify payments   │   │  - Generate PDFs                │
│  - Webhooks          │   │  - Sync to Google Sheets        │
└──────────────────────┘   └─────────────────────────────────┘
                                       │
                                       ↓
                           ┌───────────────────────┐
                           │   GOOGLE SHEETS       │
                           │  (Audit mirror only)  │
                           └───────────────────────┘
```

---

## 11. IMPLEMENTATION CHECKLIST

### Phase 1: Database Setup
- [ ] Create Supabase project
- [ ] Run schema SQL (registrations, admin_users, check_in_logs, college_zone_mapping)
- [ ] Populate college_zone_mapping table
- [ ] Create RLS policies
- [ ] Create database functions (generate_registration_id)
- [ ] Set up indexes

### Phase 2: Backend APIs
- [ ] Create Supabase Edge Functions
- [ ] Implement registration/initiate endpoint
- [ ] Implement payment/verify endpoint
- [ ] Implement Razorpay webhook handler
- [ ] Implement admin authentication
- [ ] Implement check-in endpoints
- [ ] Set up Google Apps Script for emails & PDFs

### Phase 3: Frontend
- [ ] Update registration.html with new flow
- [ ] Add debouncing and duplicate prevention
- [ ] Create ticket.html (retrieval page)
- [ ] Build admin dashboard (Tech Head)
- [ ] Build QR scanner interface (Member)
- [ ] Implement real-time updates

### Phase 4: Testing
- [ ] Test registration flow end-to-end
- [ ] Test payment verification (success/failure)
- [ ] Test duplicate prevention
- [ ] Test check-in flow (all states)
- [ ] Test admin roles and permissions
- [ ] Test email delivery and retries
- [ ] Test PDF generation
- [ ] Load testing (concurrent registrations)

### Phase 5: Deployment
- [ ] Deploy Supabase Edge Functions
- [ ] Deploy Google Apps Script
- [ ] Configure Razorpay webhooks
- [ ] Deploy frontend to production
- [ ] Set up monitoring and alerts
- [ ] Create admin user accounts
- [ ] Run reconciliation job

---

**END OF PHASE 3 ARCHITECTURE**

This blueprint is ready for direct implementation. All flows, schemas, and logic are defined.
