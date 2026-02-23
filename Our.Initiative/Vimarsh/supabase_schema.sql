-- ============================================================================
-- VIMARSH 2026 EVENT REGISTRATION SYSTEM - SUPABASE DATABASE SCHEMA
-- ============================================================================
-- Version: 1.0
-- Date: 2026-01-18
-- Prefix: VIM26_ (for safe coexistence with legacy systems)
-- Database: Supabase PostgreSQL
-- ============================================================================
-- ============================================================================
-- SECTION 1: EXTENSIONS
-- ============================================================================
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Enable pgcrypto for hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- ============================================================================
-- SECTION 2: CORE TABLES
-- ============================================================================
-- (VIM26_college_zone_mapping removed: using existing 'colleges' and 'zones' tables)
-- ----------------------------------------------------------------------------
-- Table: VIM26_admin_users
-- Purpose: Admin user management with role-based access control
-- Links to: auth.users (Supabase Auth)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS VIM26_admin_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('tech_head', 'member', 'super_admin')),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ,
    created_by UUID REFERENCES VIM26_admin_users(id),
    -- Ensure email matches auth.users email
    CONSTRAINT email_format CHECK (
        email ~* '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$'
    )
);
-- Indexes for admin_users
CREATE INDEX IF NOT EXISTS idx_vim26_admin_email ON VIM26_admin_users(email);
CREATE INDEX IF NOT EXISTS idx_vim26_admin_role ON VIM26_admin_users(role);
CREATE INDEX IF NOT EXISTS idx_vim26_admin_active ON VIM26_admin_users(active)
WHERE active = TRUE;
-- Comment
COMMENT ON TABLE VIM26_admin_users IS 'Admin users with role-based permissions (tech_head, member, super_admin)';
COMMENT ON COLUMN VIM26_admin_users.role IS 'tech_head: full access | member: check-in only | super_admin: system admin';
-- ----------------------------------------------------------------------------
-- Table: VIM26_registrations
-- Purpose: Main registration table with payment and check-in tracking
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS VIM26_registrations (
    -- Primary Identity
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    registration_id TEXT UNIQUE NOT NULL,
    -- Format: VIM2026-{ZONE}-{COLLEGE}-{SEQ}
    -- Personal Information
    first_name TEXT NOT NULL,
    last_name TEXT,
    email TEXT NOT NULL,
    mobile TEXT NOT NULL,
    age_group TEXT NOT NULL CHECK (
        age_group IN (
            'below-18',
            '18-21',
            '22-25',
            '25-30',
            '30-40',
            'above-40'
        )
    ),
    blood_group TEXT NOT NULL,
    -- Academic Information (References existing project tables)
    college_id INTEGER REFERENCES colleges(id),
    zone_id INTEGER REFERENCES zones(id),
    -- Denormalized names for faster display and historical consistency
    college_name TEXT NOT NULL,
    zone_name TEXT NOT NULL,
    state TEXT NOT NULL,
    -- Event Information
    payment_category TEXT NOT NULL CHECK (
        payment_category IN (
            'Student',
            'Teacher',
            'Research Scholar',
            'Other'
        )
    ),
    previous_vimarsh TEXT,
    how_you_know TEXT,
    -- Payment Information (Razorpay)
    razorpay_order_id TEXT UNIQUE,
    razorpay_payment_id TEXT UNIQUE,
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (
        payment_status IN ('pending', 'completed', 'failed', 'refunded')
    ),
    amount_paid INTEGER NOT NULL,
    -- in paise (₹300 = 30000)
    payment_verified_at TIMESTAMPTZ,
    payment_signature TEXT,
    -- Razorpay signature for verification
    -- QR Code & Check-in
    qr_code_hash TEXT UNIQUE NOT NULL,
    -- Deterministic hash: SHA256(registration_id + secret)
    checked_in BOOLEAN DEFAULT FALSE,
    checked_in_at TIMESTAMPTZ,
    checked_in_by UUID REFERENCES VIM26_admin_users(id),
    wristband_issued BOOLEAN DEFAULT FALSE,
    kit_issued BOOLEAN DEFAULT FALSE,
    -- Multi-day attendance tracking (optional)
    daily_attendance JSONB DEFAULT '{}',
    -- {"2026-07-11": "09:30:00", "2026-07-12": "10:15:00"}
    -- Email & Audit
    email_sent BOOLEAN DEFAULT FALSE,
    email_sent_at TIMESTAMPTZ,
    email_retry_count INTEGER DEFAULT 0,
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Constraints
    CONSTRAINT valid_email CHECK (
        email ~* '^[a-z][a-z0-9._%+-]*@[a-z0-9.-]+\.[a-z]{2,}$'
    ),
    CONSTRAINT valid_mobile CHECK (mobile ~ '^[6-9][0-9]{9}$'),
    CONSTRAINT valid_amount CHECK (amount_paid > 0),
    CONSTRAINT payment_verified_when_completed CHECK (
        (
            payment_status = 'completed'
            AND payment_verified_at IS NOT NULL
        )
        OR (payment_status != 'completed')
    ),
    CONSTRAINT checked_in_requires_payment CHECK (
        (
            checked_in = TRUE
            AND payment_status = 'completed'
        )
        OR (checked_in = FALSE)
    ),
    CONSTRAINT checked_in_timestamp CHECK (
        (
            checked_in = TRUE
            AND checked_in_at IS NOT NULL
            AND checked_in_by IS NOT NULL
        )
        OR (checked_in = FALSE)
    )
);
-- Indexes for registrations (optimized for common queries)
CREATE INDEX IF NOT EXISTS idx_vim26_reg_email ON VIM26_registrations(email);
CREATE INDEX IF NOT EXISTS idx_vim26_reg_mobile ON VIM26_registrations(mobile);
CREATE INDEX IF NOT EXISTS idx_vim26_reg_payment_status ON VIM26_registrations(payment_status);
CREATE INDEX IF NOT EXISTS idx_vim26_reg_checked_in ON VIM26_registrations(checked_in)
WHERE checked_in = TRUE;
CREATE INDEX IF NOT EXISTS idx_vim26_reg_razorpay_order ON VIM26_registrations(razorpay_order_id)
WHERE razorpay_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vim26_reg_razorpay_payment ON VIM26_registrations(razorpay_payment_id)
WHERE razorpay_payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vim26_reg_qr_hash ON VIM26_registrations(qr_code_hash);
CREATE INDEX IF NOT EXISTS idx_vim26_reg_college_id ON VIM26_registrations(college_id);
CREATE INDEX IF NOT EXISTS idx_vim26_reg_zone_id ON VIM26_registrations(zone_id);
CREATE INDEX IF NOT EXISTS idx_vim26_reg_college_name ON VIM26_registrations(college_name);
CREATE INDEX IF NOT EXISTS idx_vim26_reg_zone_name ON VIM26_registrations(zone_name);
CREATE INDEX IF NOT EXISTS idx_vim26_reg_created_at ON VIM26_registrations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vim26_reg_checked_in_at ON VIM26_registrations(checked_in_at DESC)
WHERE checked_in_at IS NOT NULL;
-- Partial indexes for performance (Supabase free tier optimization)
CREATE INDEX IF NOT EXISTS idx_vim26_reg_pending_payments ON VIM26_registrations(created_at DESC)
WHERE payment_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_vim26_reg_completed_payments ON VIM26_registrations(payment_verified_at DESC)
WHERE payment_status = 'completed';
-- Comment
COMMENT ON TABLE VIM26_registrations IS 'Main registration table with deterministic IDs, payment tracking, and atomic check-in enforcement';
COMMENT ON COLUMN VIM26_registrations.registration_id IS 'Deterministic format: VIM2026-{ZONE}-{COLLEGE_CODE}-{SEQ}';
COMMENT ON COLUMN VIM26_registrations.qr_code_hash IS 'Deterministic hash for QR code, same registration_id always produces same hash';
COMMENT ON COLUMN VIM26_registrations.daily_attendance IS 'JSON object tracking attendance per day for multi-day events';
-- ----------------------------------------------------------------------------
-- Table: VIM26_check_in_logs
-- Purpose: Immutable audit trail of all check-in attempts
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS VIM26_check_in_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    registration_id TEXT NOT NULL REFERENCES VIM26_registrations(registration_id) ON DELETE CASCADE,
    admin_id UUID NOT NULL REFERENCES VIM26_admin_users(id),
    action TEXT NOT NULL CHECK (
        action IN (
            'check_in',
            'already_checked_in',
            'payment_pending',
            'invalid_qr',
            'payment_failed'
        )
    ),
    success BOOLEAN NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    notes TEXT,
    -- Additional context
    qr_code_hash TEXT,
    payment_status_at_scan TEXT
);
-- Indexes for check_in_logs
CREATE INDEX IF NOT EXISTS idx_vim26_checkin_reg ON VIM26_check_in_logs(registration_id);
CREATE INDEX IF NOT EXISTS idx_vim26_checkin_admin ON VIM26_check_in_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_vim26_checkin_timestamp ON VIM26_check_in_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_vim26_checkin_action ON VIM26_check_in_logs(action);
CREATE INDEX IF NOT EXISTS idx_vim26_checkin_success ON VIM26_check_in_logs(success)
WHERE success = TRUE;
-- Comment
COMMENT ON TABLE VIM26_check_in_logs IS 'Immutable audit trail of all check-in attempts for compliance and debugging';
-- ----------------------------------------------------------------------------
-- Table: VIM26_email_failures
-- Purpose: Track failed email deliveries for retry and monitoring
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS VIM26_email_failures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    registration_id TEXT NOT NULL REFERENCES VIM26_registrations(registration_id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    error_message TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 1,
    last_attempt_at TIMESTAMPTZ DEFAULT NOW(),
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Indexes for email_failures
CREATE INDEX IF NOT EXISTS idx_vim26_email_fail_reg ON VIM26_email_failures(registration_id);
CREATE INDEX IF NOT EXISTS idx_vim26_email_fail_unresolved ON VIM26_email_failures(resolved)
WHERE resolved = FALSE;
-- Comment
COMMENT ON TABLE VIM26_email_failures IS 'Track failed email deliveries for retry mechanism and monitoring';
-- ----------------------------------------------------------------------------
-- Table: VIM26_audit_discrepancies
-- Purpose: Track reconciliation discrepancies between Razorpay and database
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS VIM26_audit_discrepancies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    discrepancy_type TEXT NOT NULL CHECK (
        discrepancy_type IN (
            'missing_in_db',
            'missing_in_razorpay',
            'amount_mismatch',
            'status_mismatch'
        )
    ),
    razorpay_payment_id TEXT,
    registration_id TEXT,
    db_amount INTEGER,
    razorpay_amount INTEGER,
    db_status TEXT,
    razorpay_status TEXT,
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT
);
-- Indexes for audit_discrepancies
CREATE INDEX IF NOT EXISTS idx_vim26_audit_type ON VIM26_audit_discrepancies(discrepancy_type);
CREATE INDEX IF NOT EXISTS idx_vim26_audit_unresolved ON VIM26_audit_discrepancies(resolved)
WHERE resolved = FALSE;
CREATE INDEX IF NOT EXISTS idx_vim26_audit_detected ON VIM26_audit_discrepancies(detected_at DESC);
-- Comment
COMMENT ON TABLE VIM26_audit_discrepancies IS 'Track reconciliation discrepancies for daily Razorpay audit jobs';
-- ============================================================================
-- SECTION 3: DATABASE FUNCTIONS
-- ============================================================================
-- ----------------------------------------------------------------------------
-- Function: VIM26_generate_registration_id
-- Purpose: Generate deterministic registration ID based on college
-- Format: VIM2026-{ZONE_CODE}-{COLLEGE_CODE}-{SEQUENCE}
-- Example: VIM2026-EAST-DU-00142
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION VIM26_generate_registration_id(p_college_id INTEGER) RETURNS TEXT AS $$
DECLARE v_zone_code TEXT;
v_college_code TEXT;
v_sequence INTEGER;
v_reg_id TEXT;
BEGIN -- Get zone code and college code from existing mapping
SELECT z.zone_code,
    c.college_code INTO v_zone_code,
    v_college_code
FROM colleges c
    JOIN zones z ON c.zone_id = z.id
WHERE c.id = p_college_id;
-- Raise error if college not found
IF v_college_code IS NULL THEN RAISE EXCEPTION 'College ID not found: %',
p_college_id;
END IF;
-- Get next sequence number for this college (thread-safe)
SELECT COALESCE(
        MAX(
            CAST(
                SUBSTRING(
                    registration_id
                    FROM 'VIM2026-.*-.*-(.*)'
                ) AS INTEGER
            )
        ),
        0
    ) + 1 INTO v_sequence
FROM VIM26_registrations
WHERE college_id = p_college_id;
-- Build registration ID (using the full zone_code and college_code)
v_reg_id := 'VIM2026-' || UPPER(v_zone_code) || '-' || UPPER(v_college_code) || '-' || LPAD(v_sequence::TEXT, 5, '0');
RETURN v_reg_id;
END;
$$ LANGUAGE plpgsql VOLATILE;
-- Comment
COMMENT ON FUNCTION VIM26_generate_registration_id IS 'Generate deterministic registration ID using existing colleges and zones tables';
-- ----------------------------------------------------------------------------
-- Function: VIM26_generate_qr_hash
-- Purpose: Generate deterministic QR code hash from registration ID
-- Uses: SHA256 with secret salt for security
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION VIM26_generate_qr_hash(p_registration_id TEXT) RETURNS TEXT AS $$
DECLARE v_secret TEXT := 'VIMARSH_2026_QR_SECRET_KEY';
-- Change in production
v_payload TEXT;
v_hash TEXT;
BEGIN v_payload := p_registration_id || ':' || v_secret;
v_hash := encode(digest(v_payload, 'sha256'), 'hex');
-- Return first 16 characters for shorter QR codes
RETURN substring(
    v_hash
    FROM 1 FOR 16
);
END;
$$ LANGUAGE plpgsql IMMUTABLE;
-- Comment
COMMENT ON FUNCTION VIM26_generate_qr_hash IS 'Generate deterministic QR hash, same registration_id always produces same hash';
-- ----------------------------------------------------------------------------
-- Function: VIM26_validate_registration_update
-- Purpose: Enforce column-level security on registrations based on user role
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION VIM26_validate_registration_update() RETURNS TRIGGER AS $$
DECLARE v_role TEXT;
BEGIN -- 1. Technical Bypass: Allow Tech Head and Super Admin all changes
SELECT role INTO v_role
FROM VIM26_admin_users
WHERE id = auth.uid()
    AND active = TRUE;
IF v_role IN ('tech_head', 'super_admin') THEN RETURN NEW;
END IF;
-- 2. Staff Bypass: Allow Members (Check-in Staff) to update specific fields
IF v_role = 'member' THEN -- Ensure core data is not modified
IF (
    NEW.registration_id IS DISTINCT
    FROM OLD.registration_id
        OR NEW.email IS DISTINCT
    FROM OLD.email
        OR NEW.payment_status IS DISTINCT
    FROM OLD.payment_status
) THEN RAISE EXCEPTION 'Staff cannot modify core registration or payment data';
END IF;
RETURN NEW;
END IF;
-- 3. Public/Webhook Update: Allow only payment-related updates for non-completed records
IF OLD.payment_status = 'completed' THEN RAISE EXCEPTION 'Cannot modify a completed registration';
END IF;
-- Ensure core personal data is not modified by public/anon
IF (
    NEW.registration_id IS DISTINCT
    FROM OLD.registration_id
        OR NEW.first_name IS DISTINCT
    FROM OLD.first_name
        OR NEW.email IS DISTINCT
    FROM OLD.email
        OR NEW.checked_in IS DISTINCT
    FROM OLD.checked_in
) THEN RAISE EXCEPTION 'Unauthorized column modification';
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Comment
COMMENT ON FUNCTION VIM26_validate_registration_update IS 'Enforce role-based column-level security for VIM26_registrations';
CREATE OR REPLACE FUNCTION VIM26_update_timestamp() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Comment
COMMENT ON FUNCTION VIM26_update_timestamp IS 'Trigger function to auto-update updated_at timestamp';
-- ----------------------------------------------------------------------------
-- Function: VIM26_prevent_duplicate_email_payment
-- Purpose: Prevent duplicate registrations with completed payments
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION VIM26_prevent_duplicate_email_payment() RETURNS TRIGGER AS $$
DECLARE v_existing_count INTEGER;
BEGIN -- Check if email already has a completed payment
SELECT COUNT(*) INTO v_existing_count
FROM VIM26_registrations
WHERE email = NEW.email
    AND payment_status = 'completed'
    AND id != COALESCE(
        NEW.id,
        '00000000-0000-0000-0000-000000000000'::UUID
    );
IF v_existing_count > 0 THEN RAISE EXCEPTION 'Email % already registered with completed payment',
NEW.email;
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Comment
COMMENT ON FUNCTION VIM26_prevent_duplicate_email_payment IS 'Prevent duplicate registrations for same email with completed payment';
-- ----------------------------------------------------------------------------
-- Function: VIM26_atomic_check_in
-- Purpose: Perform atomic check-in with row-level locking
-- Returns: JSON with status and details
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION VIM26_atomic_check_in(
        p_qr_hash TEXT,
        p_admin_id UUID,
        p_ip_address INET DEFAULT NULL,
        p_user_agent TEXT DEFAULT NULL
    ) RETURNS JSON AS $$
DECLARE v_registration RECORD;
v_result JSON;
v_action TEXT;
v_success BOOLEAN;
BEGIN -- Lock and fetch registration
SELECT * INTO v_registration
FROM VIM26_registrations
WHERE qr_code_hash = p_qr_hash FOR
UPDATE;
-- Row-level lock prevents race conditions
-- Check if registration exists
IF v_registration IS NULL THEN v_action := 'invalid_qr';
v_success := FALSE;
v_result := json_build_object(
    'status',
    'error',
    'action',
    v_action,
    'message',
    'Invalid QR code - registration not found'
);
-- Log attempt
INSERT INTO VIM26_check_in_logs (
        registration_id,
        admin_id,
        action,
        success,
        ip_address,
        user_agent,
        qr_code_hash
    )
VALUES (
        NULL,
        p_admin_id,
        v_action,
        v_success,
        p_ip_address,
        p_user_agent,
        p_qr_hash
    );
RETURN v_result;
END IF;
-- Check payment status
IF v_registration.payment_status != 'completed' THEN v_action := 'payment_' || v_registration.payment_status;
v_success := FALSE;
v_result := json_build_object(
    'status',
    'error',
    'action',
    v_action,
    'message',
    'Payment not completed - status: ' || v_registration.payment_status,
    'registration_id',
    v_registration.registration_id,
    'name',
    v_registration.first_name || ' ' || COALESCE(v_registration.last_name, ''),
    'payment_status',
    v_registration.payment_status
);
-- Log attempt
INSERT INTO VIM26_check_in_logs (
        registration_id,
        admin_id,
        action,
        success,
        ip_address,
        user_agent,
        qr_code_hash,
        payment_status_at_scan
    )
VALUES (
        v_registration.registration_id,
        p_admin_id,
        v_action,
        v_success,
        p_ip_address,
        p_user_agent,
        p_qr_hash,
        v_registration.payment_status
    );
RETURN v_result;
END IF;
-- Check if already checked in
IF v_registration.checked_in = TRUE THEN v_action := 'already_checked_in';
v_success := FALSE;
v_result := json_build_object(
    'status',
    'already_checked_in',
    'action',
    v_action,
    'message',
    'Already checked in',
    'registration_id',
    v_registration.registration_id,
    'name',
    v_registration.first_name || ' ' || COALESCE(v_registration.last_name, ''),
    'college',
    v_registration.college_name,
    'zone',
    v_registration.zone_name,
    'checked_in_at',
    v_registration.checked_in_at,
    'wristband_issued',
    v_registration.wristband_issued,
    'kit_issued',
    v_registration.kit_issued
);
-- Log attempt
INSERT INTO VIM26_check_in_logs (
        registration_id,
        admin_id,
        action,
        success,
        ip_address,
        user_agent,
        qr_code_hash
    )
VALUES (
        v_registration.registration_id,
        p_admin_id,
        v_action,
        v_success,
        p_ip_address,
        p_user_agent,
        p_qr_hash
    );
RETURN v_result;
END IF;
-- Perform check-in (atomic update)
UPDATE VIM26_registrations
SET checked_in = TRUE,
    checked_in_at = NOW(),
    checked_in_by = p_admin_id,
    wristband_issued = TRUE,
    kit_issued = TRUE,
    updated_at = NOW()
WHERE id = v_registration.id;
v_action := 'check_in';
v_success := TRUE;
v_result := json_build_object(
    'status',
    'success',
    'action',
    v_action,
    'message',
    'Check-in successful',
    'registration_id',
    v_registration.registration_id,
    'name',
    v_registration.first_name || ' ' || COALESCE(v_registration.last_name, ''),
    'college',
    v_registration.college_name,
    'zone',
    v_registration.zone_name,
    'payment_category',
    v_registration.payment_category,
    'checked_in_at',
    NOW(),
    'wristband_issued',
    TRUE,
    'kit_issued',
    TRUE
);
-- Log successful check-in
INSERT INTO VIM26_check_in_logs (
        registration_id,
        admin_id,
        action,
        success,
        ip_address,
        user_agent,
        qr_code_hash
    )
VALUES (
        v_registration.registration_id,
        p_admin_id,
        v_action,
        v_success,
        p_ip_address,
        p_user_agent,
        p_qr_hash
    );
RETURN v_result;
END;
$$ LANGUAGE plpgsql;
-- Comment
COMMENT ON FUNCTION VIM26_atomic_check_in IS 'Atomic check-in with row locking, prevents race conditions and duplicate check-ins';
-- ============================================================================
-- SECTION 4: TRIGGERS
-- ============================================================================
-- Trigger: Auto-update updated_at on registrations
DROP TRIGGER IF EXISTS trigger_vim26_reg_updated_at ON VIM26_registrations;
CREATE TRIGGER trigger_vim26_reg_updated_at BEFORE
UPDATE ON VIM26_registrations FOR EACH ROW EXECUTE FUNCTION VIM26_update_timestamp();
-- Trigger: Enforce registration security (Column-level validation)
DROP TRIGGER IF EXISTS trigger_vim26_reg_security ON VIM26_registrations;
CREATE TRIGGER trigger_vim26_reg_security BEFORE
UPDATE ON VIM26_registrations FOR EACH ROW EXECUTE FUNCTION VIM26_validate_registration_update();
-- Trigger: Prevent duplicate email with completed payment
DROP TRIGGER IF EXISTS trigger_vim26_prevent_duplicate ON VIM26_registrations;
CREATE TRIGGER trigger_vim26_prevent_duplicate BEFORE
INSERT
    OR
UPDATE ON VIM26_registrations FOR EACH ROW EXECUTE FUNCTION VIM26_prevent_duplicate_email_payment();
-- ============================================================================
-- SECTION 5: ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
-- Enable RLS on all tables
ALTER TABLE VIM26_admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE VIM26_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE VIM26_check_in_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE VIM26_email_failures ENABLE ROW LEVEL SECURITY;
ALTER TABLE VIM26_audit_discrepancies ENABLE ROW LEVEL SECURITY;
-- ----------------------------------------------------------------------------
-- RLS Policies: colleges / zones (External)
-- ----------------------------------------------------------------------------
-- Public read access to zones/colleges is assumed to be handled by the legacy system
-- But VIM26 specific policies can be added here if needed to allow the registration form to fetch them.
-- ----------------------------------------------------------------------------
-- RLS Policies: VIM26_admin_users
-- ----------------------------------------------------------------------------
-- Users can view their own profile
DROP POLICY IF EXISTS vim26_admin_view_self ON VIM26_admin_users;
CREATE POLICY vim26_admin_view_self ON VIM26_admin_users FOR
SELECT TO authenticated USING (id = auth.uid());
-- Tech Heads can view all admins
DROP POLICY IF EXISTS vim26_admin_tech_head_view ON VIM26_admin_users;
CREATE POLICY vim26_admin_tech_head_view ON VIM26_admin_users FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM VIM26_admin_users
            WHERE id = auth.uid()
                AND role IN ('tech_head', 'super_admin')
                AND active = TRUE
        )
    );
-- Only Super Admins can modify admin users
DROP POLICY IF EXISTS vim26_admin_super_modify ON VIM26_admin_users;
CREATE POLICY vim26_admin_super_modify ON VIM26_admin_users FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1
        FROM VIM26_admin_users
        WHERE id = auth.uid()
            AND role = 'super_admin'
            AND active = TRUE
    )
);
-- ----------------------------------------------------------------------------
-- RLS Policies: VIM26_registrations
-- ----------------------------------------------------------------------------
-- Public insert (for new registrations)
DROP POLICY IF EXISTS vim26_reg_public_insert ON VIM26_registrations;
CREATE POLICY vim26_reg_public_insert ON VIM26_registrations FOR
INSERT TO anon,
    authenticated WITH CHECK (TRUE);
-- Public update (for payment verification)
DROP POLICY IF EXISTS vim26_reg_public_update_payment ON VIM26_registrations;
CREATE POLICY vim26_reg_public_update_payment ON VIM26_registrations FOR
UPDATE TO anon,
    authenticated USING (payment_status = 'pending');
-- Tech Heads: Full access to all registrations
DROP POLICY IF EXISTS vim26_reg_tech_head_all ON VIM26_registrations;
CREATE POLICY vim26_reg_tech_head_all ON VIM26_registrations FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1
        FROM VIM26_admin_users
        WHERE id = auth.uid()
            AND role IN ('tech_head', 'super_admin')
            AND active = TRUE
    )
);
-- Members: Read access for check-in
DROP POLICY IF EXISTS vim26_reg_member_read ON VIM26_registrations;
CREATE POLICY vim26_reg_member_read ON VIM26_registrations FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM VIM26_admin_users
            WHERE id = auth.uid()
                AND role = 'member'
                AND active = TRUE
        )
    );
-- Members: Update check-in fields only
DROP POLICY IF EXISTS vim26_reg_member_checkin ON VIM26_registrations;
CREATE POLICY vim26_reg_member_checkin ON VIM26_registrations FOR
UPDATE TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM VIM26_admin_users
            WHERE id = auth.uid()
                AND role = 'member'
                AND active = TRUE
        )
    );
-- ----------------------------------------------------------------------------
-- RLS Policies: VIM26_check_in_logs
-- ----------------------------------------------------------------------------
-- Admins can insert their own logs
DROP POLICY IF EXISTS vim26_checkin_log_insert ON VIM26_check_in_logs;
CREATE POLICY vim26_checkin_log_insert ON VIM26_check_in_logs FOR
INSERT TO authenticated WITH CHECK (
        admin_id = auth.uid()
        AND EXISTS (
            SELECT 1
            FROM VIM26_admin_users
            WHERE id = auth.uid()
                AND active = TRUE
        )
    );
-- Tech Heads can view all logs
DROP POLICY IF EXISTS vim26_checkin_log_tech_head_view ON VIM26_check_in_logs;
CREATE POLICY vim26_checkin_log_tech_head_view ON VIM26_check_in_logs FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM VIM26_admin_users
            WHERE id = auth.uid()
                AND role IN ('tech_head', 'super_admin')
                AND active = TRUE
        )
    );
-- Members can view their own logs
DROP POLICY IF EXISTS vim26_checkin_log_member_view ON VIM26_check_in_logs;
CREATE POLICY vim26_checkin_log_member_view ON VIM26_check_in_logs FOR
SELECT TO authenticated USING (
        admin_id = auth.uid()
        AND EXISTS (
            SELECT 1
            FROM VIM26_admin_users
            WHERE id = auth.uid()
                AND role = 'member'
                AND active = TRUE
        )
    );
-- ----------------------------------------------------------------------------
-- RLS Policies: VIM26_email_failures
-- ----------------------------------------------------------------------------
-- Only Tech Heads and Super Admins can access
DROP POLICY IF EXISTS vim26_email_fail_admin_only ON VIM26_email_failures;
CREATE POLICY vim26_email_fail_admin_only ON VIM26_email_failures FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1
        FROM VIM26_admin_users
        WHERE id = auth.uid()
            AND role IN ('tech_head', 'super_admin')
            AND active = TRUE
    )
);
-- ----------------------------------------------------------------------------
-- RLS Policies: VIM26_audit_discrepancies
-- ----------------------------------------------------------------------------
-- Only Tech Heads and Super Admins can access
DROP POLICY IF EXISTS vim26_audit_admin_only ON VIM26_audit_discrepancies;
CREATE POLICY vim26_audit_admin_only ON VIM26_audit_discrepancies FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1
        FROM VIM26_admin_users
        WHERE id = auth.uid()
            AND role IN ('tech_head', 'super_admin')
            AND active = TRUE
    )
);
-- ============================================================================
-- SECTION 6: REALTIME SUBSCRIPTIONS
-- ============================================================================
-- Enable realtime for critical tables
ALTER PUBLICATION supabase_realtime
ADD TABLE VIM26_registrations;
ALTER PUBLICATION supabase_realtime
ADD TABLE VIM26_check_in_logs;
-- ============================================================================
-- SECTION 7: PERFORMANCE OPTIMIZATION
-- ============================================================================
-- Analyze tables for query optimization
ANALYZE VIM26_admin_users;
ANALYZE VIM26_registrations;
ANALYZE VIM26_check_in_logs;
-- ============================================================================
-- SECTION 8: SAMPLE DATA
-- ============================================================================
-- (College data is used from existing 'colleges' table)
-- ============================================================================
-- SECTION 9: GRANT PERMISSIONS
-- ============================================================================
-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon,
    authenticated;
-- Grant access to tables
GRANT INSERT,
    SELECT,
    UPDATE ON VIM26_registrations TO anon,
    authenticated;
GRANT SELECT ON VIM26_admin_users TO authenticated;
GRANT INSERT,
    SELECT ON VIM26_check_in_logs TO authenticated;
-- Grant execute on functions
GRANT EXECUTE ON FUNCTION VIM26_generate_registration_id TO anon,
    authenticated;
GRANT EXECUTE ON FUNCTION VIM26_generate_qr_hash TO anon,
    authenticated;
GRANT EXECUTE ON FUNCTION VIM26_atomic_check_in TO authenticated;
-- ============================================================================
-- SECTION 10: VERIFICATION QUERIES
-- ============================================================================
-- Verify table creation
DO $$ BEGIN RAISE NOTICE 'Tables created:';
RAISE NOTICE '  - VIM26_admin_users';
RAISE NOTICE '  - VIM26_registrations';
RAISE NOTICE '  - VIM26_check_in_logs';
RAISE NOTICE '  - VIM26_email_failures';
RAISE NOTICE '  - VIM26_audit_discrepancies';
RAISE NOTICE '';
RAISE NOTICE 'Foreign Tables used for Registration:';
RAISE NOTICE '  - colleges';
RAISE NOTICE '  - zones';
RAISE NOTICE '';
RAISE NOTICE 'Functions created:';
RAISE NOTICE '  - VIM26_generate_registration_id';
RAISE NOTICE '  - VIM26_generate_qr_hash';
RAISE NOTICE '  - VIM26_atomic_check_in';
RAISE NOTICE '  - VIM26_update_timestamp';
RAISE NOTICE '  - VIM26_prevent_duplicate_email_payment';
RAISE NOTICE '';
RAISE NOTICE 'RLS enabled on all tables';
RAISE NOTICE 'Realtime enabled on: VIM26_registrations, VIM26_check_in_logs';
RAISE NOTICE '';
RAISE NOTICE '✅ Database schema setup complete!';
END $$;
-- ============================================================================
-- END OF SCHEMA
-- ============================================================================