-- =====================================================
-- YUVA DONATION SYSTEM - SUPABASE DATABASE SCHEMA
-- =====================================================
-- This script creates the necessary tables and policies
-- for the donation management system
-- =====================================================
-- Create donations table
CREATE TABLE IF NOT EXISTS public.donations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    -- Donor Information
    first_name TEXT NOT NULL,
    surname TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    -- Donation Details
    amount DECIMAL(10, 2) NOT NULL,
    donation_type TEXT NOT NULL CHECK (donation_type IN ('one-time', 'recurring')),
    -- Payment Information
    payment_id TEXT NOT NULL,
    order_id TEXT,
    signature TEXT,
    subscription_id TEXT,
    payment_status TEXT DEFAULT 'completed' CHECK (
        payment_status IN ('pending', 'completed', 'failed', 'refunded')
    ),
    -- Tax Exemption Details
    wants_80g BOOLEAN DEFAULT false,
    aadhaar_number TEXT,
    pan_number TEXT,
    -- Metadata
    notes TEXT,
    ip_address INET,
    user_agent TEXT,
    -- Indexes for common queries
    CONSTRAINT unique_payment_id UNIQUE (payment_id)
);
-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_donations_email ON public.donations(email);
CREATE INDEX IF NOT EXISTS idx_donations_created_at ON public.donations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_donations_payment_status ON public.donations(payment_status);
CREATE INDEX IF NOT EXISTS idx_donations_donation_type ON public.donations(donation_type);
-- Create a view for donation statistics
CREATE OR REPLACE VIEW public.donation_stats AS
SELECT COUNT(*) as total_donations,
    SUM(amount) as total_amount,
    SUM(
        CASE
            WHEN donation_type = 'one-time' THEN 1
            ELSE 0
        END
    ) as one_time_count,
    SUM(
        CASE
            WHEN donation_type = 'recurring' THEN 1
            ELSE 0
        END
    ) as recurring_count,
    SUM(
        CASE
            WHEN donation_type = 'one-time' THEN amount
            ELSE 0
        END
    ) as one_time_amount,
    SUM(
        CASE
            WHEN donation_type = 'recurring' THEN amount
            ELSE 0
        END
    ) as recurring_amount,
    AVG(amount) as average_donation,
    MAX(amount) as largest_donation,
    MIN(amount) as smallest_donation,
    COUNT(DISTINCT email) as unique_donors
FROM public.donations
WHERE payment_status = 'completed';
-- Enable Row Level Security (RLS)
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
-- Policy: Allow anyone to insert donations (for public donation form)
CREATE POLICY "Allow public to insert donations" ON public.donations FOR
INSERT TO public WITH CHECK (true);
-- Policy: Allow authenticated users to view all donations (for admin)
CREATE POLICY "Allow authenticated users to view donations" ON public.donations FOR
SELECT TO authenticated USING (true);
-- Policy: Allow users to view their own donations (by email)
CREATE POLICY "Allow users to view own donations" ON public.donations FOR
SELECT TO public USING (
        email = current_setting('request.jwt.claims', true)::json->>'email'
    );
-- Create a function to get donation statistics (public access)
CREATE OR REPLACE FUNCTION public.get_donation_stats() RETURNS TABLE (
        total_donations BIGINT,
        total_amount NUMERIC,
        one_time_count BIGINT,
        recurring_count BIGINT,
        one_time_amount NUMERIC,
        recurring_amount NUMERIC,
        average_donation NUMERIC,
        largest_donation NUMERIC,
        smallest_donation NUMERIC,
        unique_donors BIGINT
    ) LANGUAGE sql SECURITY DEFINER AS $$
SELECT COUNT(*)::BIGINT as total_donations,
    COALESCE(SUM(amount), 0) as total_amount,
    SUM(
        CASE
            WHEN donation_type = 'one-time' THEN 1
            ELSE 0
        END
    )::BIGINT as one_time_count,
    SUM(
        CASE
            WHEN donation_type = 'recurring' THEN 1
            ELSE 0
        END
    )::BIGINT as recurring_count,
    COALESCE(
        SUM(
            CASE
                WHEN donation_type = 'one-time' THEN amount
                ELSE 0
            END
        ),
        0
    ) as one_time_amount,
    COALESCE(
        SUM(
            CASE
                WHEN donation_type = 'recurring' THEN amount
                ELSE 0
            END
        ),
        0
    ) as recurring_amount,
    COALESCE(AVG(amount), 0) as average_donation,
    COALESCE(MAX(amount), 0) as largest_donation,
    COALESCE(MIN(amount), 0) as smallest_donation,
    COUNT(DISTINCT email)::BIGINT as unique_donors
FROM public.donations
WHERE payment_status = 'completed';
$$;
-- Grant execute permission on the function to public
GRANT EXECUTE ON FUNCTION public.get_donation_stats() TO public;
-- Create a function to validate PAN number format
CREATE OR REPLACE FUNCTION public.validate_pan(pan TEXT) RETURNS BOOLEAN LANGUAGE plpgsql AS $$ BEGIN RETURN pan ~ '^[A-Z]{5}[0-9]{4}[A-Z]{1}$';
END;
$$;
-- Create a function to validate Aadhaar number format
CREATE OR REPLACE FUNCTION public.validate_aadhaar(aadhaar TEXT) RETURNS BOOLEAN LANGUAGE plpgsql AS $$ BEGIN RETURN aadhaar ~ '^\d{12}$';
END;
$$;
-- Add check constraints for validation
ALTER TABLE public.donations
ADD CONSTRAINT check_pan_format CHECK (
        pan_number IS NULL
        OR validate_pan(pan_number)
    );
ALTER TABLE public.donations
ADD CONSTRAINT check_aadhaar_format CHECK (
        aadhaar_number IS NULL
        OR validate_aadhaar(aadhaar_number)
    );
-- Add constraint to ensure tax exemption fields are filled if wants_80g is true
ALTER TABLE public.donations
ADD CONSTRAINT check_80g_requirements CHECK (
        (wants_80g = false)
        OR (
            wants_80g = true
            AND aadhaar_number IS NOT NULL
            AND pan_number IS NOT NULL
        )
    );
-- Create a table for donation receipts (optional, for future use)
CREATE TABLE IF NOT EXISTS public.donation_receipts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    donation_id UUID REFERENCES public.donations(id) ON DELETE CASCADE,
    receipt_number TEXT UNIQUE NOT NULL,
    receipt_url TEXT,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    sent_via_email BOOLEAN DEFAULT false,
    email_sent_at TIMESTAMP WITH TIME ZONE
);
-- Create index for receipts
CREATE INDEX IF NOT EXISTS idx_receipts_donation_id ON public.donation_receipts(donation_id);
CREATE INDEX IF NOT EXISTS idx_receipts_receipt_number ON public.donation_receipts(receipt_number);
-- Enable RLS on receipts table
ALTER TABLE public.donation_receipts ENABLE ROW LEVEL SECURITY;
-- Policy: Allow authenticated users to view receipts
CREATE POLICY "Allow authenticated users to view receipts" ON public.donation_receipts FOR
SELECT TO authenticated USING (true);
-- Policy: Allow users to view their own receipts
CREATE POLICY "Allow users to view own receipts" ON public.donation_receipts FOR
SELECT TO public USING (
        donation_id IN (
            SELECT id
            FROM public.donations
            WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
        )
    );
-- =====================================================
-- SAMPLE DATA (Optional - Remove in production)
-- =====================================================
-- Uncomment below to insert sample data for testing
/*
 INSERT INTO public.donations (
 first_name, surname, email, phone, address,
 amount, donation_type, payment_id, order_id,
 payment_status, wants_80g
 ) VALUES 
 (
 'Test', 'User', 'test@example.com', '9876543210', 
 'Test Address, Delhi, India',
 1000.00, 'one-time', 'test_payment_123', 'test_order_123',
 'completed', false
 );
 */
-- =====================================================
-- NOTES FOR DEPLOYMENT
-- =====================================================
-- 1. Run this script in your Supabase SQL Editor
-- 2. Make sure to update the RLS policies based on your security requirements
-- 3. Consider adding email notification triggers
-- 4. Set up scheduled backups for the donations table
-- 5. Monitor the table size and add partitioning if needed
-- =====================================================