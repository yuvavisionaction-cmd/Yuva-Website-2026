-- ============================================================================
-- VIMARSH PARTICIPATION CERTIFICATES - SUPABASE DATABASE SCHEMA
-- ============================================================================
-- Version: 1.0
-- Date: 2026-03-25
-- Name: VIM_CERT_ (Generic, year-agnostic certificate system)
-- Database: Supabase PostgreSQL
-- ============================================================================

-- ============================================================================
-- TABLE: VIM_CERT_vimarsh_certificates
-- PURPOSE: Store participation certificates for all Vimarsh events
-- SOURCE: VIM26_registrations (linked via email)
-- SUPPORTS: Multiple years, generic certificate generation
-- ============================================================================

CREATE TABLE IF NOT EXISTS VIM_CERT_vimarsh_certificates (
    -- Primary Identity
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    certificate_id TEXT UNIQUE NOT NULL,
    -- Format: VM-YYYY-XXXXX (auto-generated, year-agnostic)
    year INTEGER NOT NULL,
    -- Event year (allows future years: 2025, 2026, etc.)
    
    -- Participant Information (from registration)
    registration_id TEXT,
    -- Original Vimarsh registration ID (e.g., VIM2026-...)
    first_name TEXT NOT NULL,
    last_name TEXT,
    email TEXT NOT NULL,
    mobile TEXT NOT NULL,
    college_name TEXT NOT NULL,
    college_id INTEGER,
    zone TEXT NOT NULL,
    state TEXT NOT NULL,
    age_group TEXT,
    category TEXT NOT NULL,
    -- (Student/Teacher/Research Scholar/Other)
    
    -- Certificate Details
    event_start_date DATE,
    -- Event start date (no default - set per year)
    issued_date TIMESTAMPTZ,
    certificate_template_version TEXT DEFAULT '1.0',
    
    -- Signature Details
    signature_director_name TEXT,
    signature_coordinator_name TEXT,
    
    -- Data Quality & Tracking
    has_qr_code BOOLEAN DEFAULT FALSE,
    qr_code_url TEXT,
    
    -- Certificate Status Management
    status TEXT NOT NULL DEFAULT 'issued' CHECK (
        status IN ('draft', 'issued', 'revoked', 'expired')
    ),
    revoke_reason TEXT,
    revoked_at TIMESTAMPTZ,
    revoked_by UUID,
    
    -- Download Tracking
    downloaded BOOLEAN DEFAULT FALSE,
    download_count INTEGER DEFAULT 0,
    first_download_at TIMESTAMPTZ,
    last_download_at TIMESTAMPTZ,
    
    -- Email Tracking
    email_sent BOOLEAN DEFAULT FALSE,
    email_sent_at TIMESTAMPTZ,
    email_retry_count INTEGER DEFAULT 0,
    
    -- Verification
    is_verified BOOLEAN DEFAULT TRUE,
    verification_code TEXT UNIQUE,
    -- Can be used to verify certificate authenticity
    
    -- Audit & Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    
    -- Data Integrity Constraints
    CONSTRAINT valid_email CHECK (
        email ~* '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$'
    ),
    CONSTRAINT valid_mobile CHECK (
        mobile ~ '^[6-9][0-9]{9}$'
    ),
    CONSTRAINT valid_certificate_id CHECK (
        certificate_id ~ '^VM-[0-9]{4}-[A-Z0-9]{5}$'
    ),
    CONSTRAINT revoke_requires_reason CHECK (
        (status = 'revoked' AND revoke_reason IS NOT NULL AND revoked_at IS NOT NULL)
        OR (status != 'revoked')
    )
);

-- ============================================================================
-- INDEXES (for optimized querying)
-- ============================================================================

-- Primary lookup indexes
CREATE INDEX IF NOT EXISTS idx_vimcert_certificate_id 
    ON VIM_CERT_vimarsh_certificates(certificate_id);

CREATE INDEX IF NOT EXISTS idx_vimcert_email 
    ON VIM_CERT_vimarsh_certificates(email);

CREATE INDEX IF NOT EXISTS idx_vimcert_college_id 
    ON VIM_CERT_vimarsh_certificates(college_id);

-- Status and filtering indexes
CREATE INDEX IF NOT EXISTS idx_vimcert_status 
    ON VIM_CERT_vimarsh_certificates(status) 
    WHERE status IN ('draft', 'issued');

CREATE INDEX IF NOT EXISTS idx_vimcert_downloaded 
    ON VIM_CERT_vimarsh_certificates(downloaded);

CREATE INDEX IF NOT EXISTS idx_vimcert_verified 
    ON VIM_CERT_vimarsh_certificates(is_verified);

-- Temporal indexes
CREATE INDEX IF NOT EXISTS idx_vimcert_issued_date 
    ON VIM_CERT_vimarsh_certificates(issued_date);

CREATE INDEX IF NOT EXISTS idx_vimcert_year 
    ON VIM_CERT_vimarsh_certificates(year);

-- Search indexes
CREATE INDEX IF NOT EXISTS idx_vimcert_first_name 
    ON VIM_CERT_vimarsh_certificates(first_name);

CREATE INDEX IF NOT EXISTS idx_vimcert_zone 
    ON VIM_CERT_vimarsh_certificates(zone);

-- ============================================================================
-- TABLE: VIM_CERT_audit_log
-- PURPOSE: Track all certificate operations for compliance
-- ============================================================================

CREATE TABLE IF NOT EXISTS VIM_CERT_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    certificate_id TEXT NOT NULL REFERENCES VIM_CERT_vimarsh_certificates(certificate_id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    -- (created, issued, downloaded, revoked, verified)
    action_by UUID NOT NULL,
    action_details JSONB,
    ip_address TEXT,
    user_agent TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Index for audit queries
CREATE INDEX IF NOT EXISTS idx_vimcert_audit_cert_id 
    ON VIM_CERT_audit_log(certificate_id);

CREATE INDEX IF NOT EXISTS idx_vimcert_audit_timestamp 
    ON VIM_CERT_audit_log(timestamp);

-- ============================================================================
-- TABLE: VIM_CERT_batch_generation
-- PURPOSE: Track bulk certificate generation batches for all years
-- ============================================================================

CREATE TABLE IF NOT EXISTS VIM_CERT_batch_generation (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_name TEXT NOT NULL,
    total_count INTEGER NOT NULL,
    success_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in-progress', 'completed', 'failed')),
    
    -- Filter criteria used for generation
    filters JSONB,
    -- {"college_id": [1, 2, 3], "category": "Student", "zone": "North Delhi"}
    
    -- Error tracking
    error_log JSONB DEFAULT '[]',
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_by UUID NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vimcert_batch_status 
    ON VIM_CERT_batch_generation(status);

CREATE INDEX IF NOT EXISTS idx_vimcert_batch_created_by 
    ON VIM_CERT_batch_generation(created_by);

-- ============================================================================
-- COMMENTS (for database documentation)
-- ============================================================================

COMMENT ON TABLE VIM_CERT_vimarsh_certificates IS 
'Stores participation certificates for all Vimarsh events (year-agnostic) with status tracking, download history, and verification details';

COMMENT ON COLUMN VIM_CERT_vimarsh_certificates.certificate_id IS 
'Format: VM-YYYY-XXXXX - Unique identifier for each certificate, year-flexible';

COMMENT ON COLUMN VIM_CERT_vimarsh_certificates.year IS 
'Event year (2025, 2026, etc.) - allows certificate system to scale across multiple years';

COMMENT ON COLUMN VIM_CERT_vimarsh_certificates.status IS 
'draft: Created but not issued | issued: Ready for download | revoked: Cancelled | expired: Outdated';

COMMENT ON COLUMN VIM_CERT_vimarsh_certificates.verification_code IS 
'Can be shared with recipients for certificate verification without exposing sensitive data';

COMMENT ON TABLE VIM_CERT_audit_log IS 
'Complete audit trail of all certificate operations for compliance and troubleshooting';

COMMENT ON TABLE VIM_CERT_batch_generation IS 
'Tracks bulk certificate generation operations for monitoring and error recovery across all years';

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
