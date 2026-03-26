-- Tenure certificate table setup for Unit Registration + Advanced Admin
-- Run in Supabase SQL Editor

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.yuva_tenure_certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    registration_id BIGINT NOT NULL UNIQUE,
    member_name TEXT,
    email TEXT,
    college_id BIGINT,
    college_name TEXT,
    zone_id BIGINT,
    role TEXT,
    academic_session TEXT,
    approval_date TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'issued', 'revoked')),
    certificate_id TEXT UNIQUE,
    tenure_completed_at TIMESTAMPTZ,
    issued_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    revoke_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_yuva_tenure_status
    ON public.yuva_tenure_certificates(status);

CREATE INDEX IF NOT EXISTS idx_yuva_tenure_college_id
    ON public.yuva_tenure_certificates(college_id);

CREATE INDEX IF NOT EXISTS idx_yuva_tenure_registration_id
    ON public.yuva_tenure_certificates(registration_id);

CREATE INDEX IF NOT EXISTS idx_yuva_tenure_issued_at
    ON public.yuva_tenure_certificates(issued_at DESC);

-- Optional helper to backfill rows for existing approved registrations as pending
INSERT INTO public.yuva_tenure_certificates (registration_id, member_name, email, college_id, zone_id, role, academic_session, status)
SELECT
    r.id,
    r.applicant_name,
    r.email,
    r.college_id,
    r.zone_id,
    r.applying_for,
    r.academic_session,
    'pending'
FROM public.registrations r
WHERE r.status = 'approved'
ON CONFLICT (registration_id) DO NOTHING;

-- Optional: sync approval_date from registrations.approved_at when the column exists.
UPDATE public.yuva_tenure_certificates t
SET approval_date = COALESCE(t.approval_date, r.approved_at, r.updated_at, r.created_at)
FROM public.registrations r
WHERE r.id = t.registration_id
    AND t.approval_date IS NULL;
