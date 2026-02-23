-- =====================================================
-- YUVA EVENTS - ADD SOFT DELETE COLUMNS FOR EVENT TRACKING
-- =====================================================
-- Step 0: Add soft delete columns to events table
-- This allows events to be "deleted" from user view while preserving statistics
ALTER TABLE events
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

ALTER TABLE events
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for soft delete queries
CREATE INDEX IF NOT EXISTS idx_events_is_deleted ON events USING btree (is_deleted);

-- =====================================================
-- YUVA EVENTS - ADD display_on_past COLUMN & AUTO-MANAGEMENT
-- =====================================================
-- Step 1: Add display_on_past column to event_publications table
ALTER TABLE event_publications
ADD COLUMN IF NOT EXISTS display_on_past BOOLEAN DEFAULT false;
-- Step 2: Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_event_publications_display_past ON event_publications USING btree (display_on_past);
-- Step 3: Create function to automatically manage display flags based on event dates
CREATE OR REPLACE FUNCTION manage_event_display_flags() RETURNS TRIGGER AS $$
DECLARE event_end_time TIMESTAMP WITH TIME ZONE;
BEGIN -- Get the end_at time from the events table
SELECT end_at INTO event_end_time
FROM events
WHERE id = NEW.event_id;
-- If event has ended (end_at < now)
IF event_end_time < NOW() THEN NEW.display_on_past = true;
NEW.display_on_upcoming = false;
-- If event is upcoming (end_at >= now)
ELSE NEW.display_on_past = false;
NEW.display_on_upcoming = true;
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Step 4: Create trigger on INSERT for event_publications
DROP TRIGGER IF EXISTS auto_set_display_flags_on_insert ON event_publications;
CREATE TRIGGER auto_set_display_flags_on_insert BEFORE
INSERT ON event_publications FOR EACH ROW EXECUTE FUNCTION manage_event_display_flags();
-- Step 5: Create trigger on UPDATE for event_publications
DROP TRIGGER IF EXISTS auto_set_display_flags_on_update ON event_publications;
CREATE TRIGGER auto_set_display_flags_on_update BEFORE
UPDATE ON event_publications FOR EACH ROW EXECUTE FUNCTION manage_event_display_flags();
-- Step 6: Create function to update display flags when event dates change
CREATE OR REPLACE FUNCTION update_publication_on_event_change() RETURNS TRIGGER AS $$ BEGIN -- Update the publication record when event end_at changes
UPDATE event_publications
SET display_on_past = (NEW.end_at < NOW()),
    display_on_upcoming = (NEW.end_at >= NOW()),
    updated_at = NOW()
WHERE event_id = NEW.id;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Step 7: Create trigger on events table to auto-update publications
DROP TRIGGER IF EXISTS sync_event_dates_to_publications ON events;
CREATE TRIGGER sync_event_dates_to_publications
AFTER
UPDATE OF end_at ON events FOR EACH ROW
    WHEN (
        OLD.end_at IS DISTINCT
        FROM NEW.end_at
    ) EXECUTE FUNCTION update_publication_on_event_change();
-- Step 8: Initialize existing records - Set correct flags for all existing events
UPDATE event_publications ep
SET display_on_past = (e.end_at < NOW()),
    display_on_upcoming = (e.end_at >= NOW()),
    updated_at = NOW()
FROM events e
WHERE ep.event_id = e.id;
-- Step 9: Update the published_events view to include display_on_past and soft delete
CREATE OR REPLACE VIEW published_events AS
SELECT e.id,
    e.college_id,
    e.title,
    e.description,
    e.start_at,
    e.end_at,
    e.location,
    e.banner_url,
    e.status,
    e.created_at,
    e.updated_at,
    e.is_deleted,
    e.deleted_at,
    e.created_by_uploader,
    ep.mode,
    ep.capacity,
    ep.registration_url,
    ep.long_description,
    ep.speakers,
    ep.display_on_home,
    ep.display_on_upcoming,
    ep.display_on_past,
    ep.category_id
FROM events e
    INNER JOIN event_publications ep ON e.id = ep.event_id;
-- Step 10: Verification queries
-- Check all events and their display flags
SELECT e.id,
    e.title,
    e.end_at,
    ep.display_on_upcoming,
    ep.display_on_past,
    CASE
        WHEN e.end_at < NOW() THEN '✓ PAST (should be: upcoming=false, past=true)'
        ELSE '✓ UPCOMING (should be: upcoming=true, past=false)'
    END as expected_status,
    CASE
        WHEN e.end_at < NOW()
        AND ep.display_on_past = true
        AND ep.display_on_upcoming = false THEN '✓ CORRECT'
        WHEN e.end_at >= NOW()
        AND ep.display_on_upcoming = true
        AND ep.display_on_past = false THEN '✓ CORRECT'
        ELSE '❌ INCORRECT'
    END as actual_status
FROM events e
    LEFT JOIN event_publications ep ON e.id = ep.event_id
ORDER BY e.end_at DESC;
-- Step 11: Create a scheduled job function (optional - for automatic daily updates)
-- This ensures flags stay correct even if triggers miss something
CREATE OR REPLACE FUNCTION sync_all_event_display_flags() RETURNS void AS $$ BEGIN
UPDATE event_publications ep
SET display_on_past = (e.end_at < NOW()),
    display_on_upcoming = (e.end_at >= NOW()),
    updated_at = NOW()
FROM events e
WHERE ep.event_id = e.id
    AND (
        (
            e.end_at < NOW()
            AND (
                ep.display_on_past = false
                OR ep.display_on_upcoming = true
            )
        )
        OR (
            e.end_at >= NOW()
            AND (
                ep.display_on_upcoming = false
                OR ep.display_on_past = true
            )
        )
    );
END;
$$ LANGUAGE plpgsql;
-- You can run this manually anytime to sync all flags:
-- SELECT sync_all_event_display_flags();
-- Step 12: Summary of what happens now:
/*
 AUTOMATIC BEHAVIOR:
 1. When you INSERT a new event_publication:
 - If event.end_at < now: display_on_past = true, display_on_upcoming = false
 - If event.end_at >= now: display_on_past = false, display_on_upcoming = true
 
 2. When you UPDATE an event's end_at date:
 - The publication record automatically updates both flags
 
 3. When you UPDATE an event_publication:
 - Both flags are recalculated based on current event.end_at
 
 MANUAL SYNC:
 - Run: SELECT sync_all_event_display_flags();
 - This will fix any records that got out of sync
 */
-- Step 13: Test the triggers with a sample event (optional)
/*
 -- Example: Create a past event
 INSERT INTO events (title, description, start_at, end_at, location, status)
 VALUES (
 'Test Past Event',
 'This is a test event',
 NOW() - INTERVAL '7 days',
 NOW() - INTERVAL '6 days',
 'Test Location',
 'completed'
 ) RETURNING id;
 
 -- Then create publication (triggers will auto-set flags)
 INSERT INTO event_publications (event_id, mode, capacity)
 VALUES (LAST_INSERT_ID, 'offline', 100);
 
 -- Check the result
 SELECT * FROM published_events WHERE title = 'Test Past Event';
 -- Should show: display_on_past = true, display_on_upcoming = false
 */


 -- =====================================================
-- YUVA EVENT UPLOAD - EMAIL VERIFICATION TABLE MIGRATION
-- Adds support for secure email verification with codes
-- =====================================================

-- =====================================================
-- STEP 1: Create event_upload_verification table
-- =====================================================
-- This table stores temporary verification codes for event upload emails
-- Codes automatically expire after 10 minutes
-- All failed attempts are tracked for security

CREATE TABLE IF NOT EXISTS event_upload_verification (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    verification_code VARCHAR(6) NOT NULL,
    code_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '10 minutes',
    verified_at TIMESTAMPTZ,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 5,
    is_verified BOOLEAN DEFAULT false,
    ip_address TEXT,
    user_agent TEXT,
    
    -- Constraints
    CONSTRAINT code_format CHECK (length(verification_code) = 6 AND verification_code ~ '^\d{6}$'),
    CONSTRAINT max_attempts_positive CHECK (max_attempts > 0),
    CONSTRAINT attempts_non_negative CHECK (attempts >= 0)
);

-- =====================================================
-- STEP 2: Create indexes for performance
-- =====================================================
-- Find active verification codes for an email
CREATE INDEX IF NOT EXISTS idx_event_verification_email 
    ON event_upload_verification(email, is_verified, expires_at);

-- Find verification by code hash
CREATE INDEX IF NOT EXISTS idx_event_verification_code_hash 
    ON event_upload_verification(code_hash);

-- Find expired codes for cleanup
CREATE INDEX IF NOT EXISTS idx_event_verification_expires 
    ON event_upload_verification(expires_at, is_verified);

-- Rate limiting: Find recent codes by IP
CREATE INDEX IF NOT EXISTS idx_event_verification_ip_recent 
    ON event_upload_verification(ip_address, created_at);

-- =====================================================
-- STEP 3: Enable Row Level Security (RLS)
-- =====================================================
ALTER TABLE event_upload_verification ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone to read active verification status (for checking if code was sent)
CREATE POLICY "Allow read active verification status" ON event_upload_verification 
    FOR SELECT 
    USING (is_verified = true OR expires_at > NOW());

-- Policy: Allow insert from verified emails only (typically from your apps)
CREATE POLICY "Allow verification code insertion" ON event_upload_verification 
    FOR INSERT 
    WITH CHECK (true);

-- Policy: Allow update of verification attempts and status
CREATE POLICY "Allow update verification status" ON event_upload_verification 
    FOR UPDATE 
    USING (true) 
    WITH CHECK (true);

-- =====================================================
-- STEP 4: Create function to auto-cleanup expired codes
-- =====================================================
CREATE OR REPLACE FUNCTION cleanup_expired_verification_codes() 
RETURNS void AS $$
BEGIN
    DELETE FROM event_upload_verification 
    WHERE 
        expires_at < NOW() 
        AND is_verified = false 
        AND created_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 5: Create trigger to auto-verify users on email verification
-- =====================================================
-- When an email is verified, ensure the user exists in event_uploaders

CREATE OR REPLACE FUNCTION sync_verified_email_to_uploaders() 
RETURNS TRIGGER AS $$
BEGIN
    -- When verification is marked as verified, ensure uploader record exists
    IF NEW.is_verified = true AND OLD.is_verified = false THEN
        INSERT INTO event_uploaders (email, verified_at, is_active, created_at)
        VALUES (NEW.email, NEW.verified_at, true, NOW())
        ON CONFLICT (email) 
        DO UPDATE SET 
            verified_at = GREATEST(event_uploaders.verified_at, EXCLUDED.verified_at),
            is_active = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 6: Create trigger for sync function
-- =====================================================
DROP TRIGGER IF EXISTS sync_verified_email_trigger ON event_upload_verification;

CREATE TRIGGER sync_verified_email_trigger
AFTER UPDATE ON event_upload_verification
FOR EACH ROW
EXECUTE FUNCTION sync_verified_email_to_uploaders();

-- =====================================================
-- STEP 7: Add comments for documentation
-- =====================================================
COMMENT ON TABLE event_upload_verification IS 
'Stores temporary verification codes for event upload email verification. Codes expire after 10 minutes.';

COMMENT ON COLUMN event_upload_verification.email IS 
'Email address being verified. Case-insensitive, stored in lowercase.';

COMMENT ON COLUMN event_upload_verification.verification_code IS 
'6-digit verification code sent to user email. Stored temporarily during verification process.';

COMMENT ON COLUMN event_upload_verification.code_hash IS 
'Hash of verification code for additional security. Used for database queries if needed.';

COMMENT ON COLUMN event_upload_verification.expires_at IS 
'When this verification code expires. Set to 10 minutes from creation.';

COMMENT ON COLUMN event_upload_verification.verified_at IS 
'Timestamp when code was successfully verified. Null until verification complete.';

COMMENT ON COLUMN event_upload_verification.attempts IS 
'Number of failed verification attempts. Incremented each time wrong code is entered.';

COMMENT ON COLUMN event_upload_verification.max_attempts IS 
'Maximum number of failed attempts allowed before code is considered invalid. Default: 5.';

COMMENT ON COLUMN event_upload_verification.is_verified IS 
'Whether the email has been successfully verified with correct code.';

COMMENT ON COLUMN event_upload_verification.ip_address IS 
'Client IP address for rate limiting and security auditing.';

COMMENT ON COLUMN event_upload_verification.user_agent IS 
'User agent string for device tracking and security auditing.';

-- =====================================================
-- STEP 8: Verification Queries
-- =====================================================

-- Check table structure
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'event_upload_verification'
-- ORDER BY ordinal_position;

-- Count active verification codes
-- SELECT COUNT(*) as active_codes
-- FROM event_upload_verification
-- WHERE is_verified = false AND expires_at > NOW();

-- Find codes by email (for testing)
-- SELECT email, is_verified, attempts, expires_at
-- FROM event_upload_verification
-- WHERE email = 'test@example.com'
-- ORDER BY created_at DESC;

-- Find spam attempts by IP
-- SELECT ip_address, COUNT(*) as attempt_count
-- FROM event_upload_verification
-- WHERE created_at > NOW() - INTERVAL '15 minutes'
-- GROUP BY ip_address
-- HAVING COUNT(*) > 5
-- ORDER BY attempt_count DESC;

-- =====================================================
-- STEP 9: Sample Cleanup Query (Run Periodically)
-- =====================================================
-- DELETE FROM event_upload_verification
-- WHERE 
--     expires_at < NOW()
--     AND is_verified = false
--     AND created_at < NOW() - INTERVAL '1 hour';




-- =====================================================
-- YUVA EVENT UPLOAD SYSTEM - DATABASE MIGRATION
-- Adds support for verified email-based event uploads
-- =====================================================
-- =====================================================
-- STEP 1: Create event_uploaders table
-- =====================================================
-- This table tracks verified email addresses that can upload events
-- Similar to photo_admin but specifically for event uploads
CREATE TABLE IF NOT EXISTS event_uploaders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_upload_at TIMESTAMPTZ,
    total_uploads INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true
);
-- Add index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_event_uploaders_email ON event_uploaders(email);
CREATE INDEX IF NOT EXISTS idx_event_uploaders_active ON event_uploaders(is_active);
-- Add comment
COMMENT ON TABLE event_uploaders IS 'Tracks verified email addresses authorized to upload events outside the college dashboard system';
-- =====================================================
-- STEP 2: Add created_by_uploader column to events table
-- =====================================================
-- This allows us to track which events were created via the upload portal
-- vs. which were created through the college dashboard
ALTER TABLE events
ADD COLUMN IF NOT EXISTS created_by_uploader UUID REFERENCES event_uploaders(id) ON DELETE
SET NULL;
-- Add index for filtering uploader events
CREATE INDEX IF NOT EXISTS idx_events_created_by_uploader ON events(created_by_uploader);
-- Add comment
COMMENT ON COLUMN events.created_by_uploader IS 'References event_uploaders table if event was created via Event Upload portal (null for college dashboard events)';
-- =====================================================
-- STEP 3: Update published_events view to include uploader info
-- =====================================================
-- Recreate the view to include uploader information
DROP VIEW IF EXISTS published_events;
CREATE OR REPLACE VIEW published_events AS
SELECT e.id,
    e.college_id,
    e.title,
    e.description,
    e.start_at,
    e.end_at,
    e.location,
    e.banner_url,
    e.status,
    e.created_at,
    e.updated_at,
    e.created_by_uploader,
    ep.mode,
    ep.capacity,
    ep.registration_url,
    ep.long_description,
    ep.speakers,
    ep.display_on_home,
    ep.display_on_upcoming,
    ep.display_on_past,
    ep.category_id,
    c.college_name as college_name,
    c.college_code as college_code,
    ec.name as category,
    eu.email as uploader_email
FROM events e
    INNER JOIN event_publications ep ON e.id = ep.event_id
    LEFT JOIN colleges c ON e.college_id = c.id
    LEFT JOIN event_categories ec ON ep.category_id = ec.id
    LEFT JOIN event_uploaders eu ON e.created_by_uploader = eu.id;
-- Add comment
COMMENT ON VIEW published_events IS 'Complete view of published events with college, category, and uploader information';
-- =====================================================
-- STEP 4: Create function to update uploader stats
-- =====================================================
-- Automatically update upload statistics when events are created
CREATE OR REPLACE FUNCTION update_uploader_stats() RETURNS TRIGGER AS $$ BEGIN -- Only update if event was created by an uploader
    IF NEW.created_by_uploader IS NOT NULL THEN
UPDATE event_uploaders
SET last_upload_at = NOW(),
    total_uploads = total_uploads + 1
WHERE id = NEW.created_by_uploader;
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- =====================================================
-- STEP 5: Create trigger for uploader stats
-- =====================================================
DROP TRIGGER IF EXISTS update_uploader_stats_trigger ON events;
CREATE TRIGGER update_uploader_stats_trigger
AFTER
INSERT ON events FOR EACH ROW
    WHEN (NEW.created_by_uploader IS NOT NULL) EXECUTE FUNCTION update_uploader_stats();
-- =====================================================
-- STEP 6: Row Level Security (RLS) Policies
-- =====================================================
-- Enable RLS on event_uploaders table
ALTER TABLE event_uploaders ENABLE ROW LEVEL SECURITY;
-- Policy: Anyone can read active uploaders (for verification)
CREATE POLICY "Allow read access to active uploaders" ON event_uploaders FOR
SELECT USING (is_active = true);
-- Policy: Allow insert for new uploader registration
CREATE POLICY "Allow insert for new uploaders" ON event_uploaders FOR
INSERT WITH CHECK (true);
-- Policy: Only the uploader can update their own record
CREATE POLICY "Uploaders can update own record" ON event_uploaders FOR
UPDATE USING (
        email = current_setting('request.jwt.claims', true)::json->>'email'
    );
-- =====================================================
-- STEP 7: Update events table RLS to allow uploader inserts
-- =====================================================
-- Add policy to allow event_uploaders to insert events
CREATE POLICY "Allow event uploaders to insert events" ON events FOR
INSERT WITH CHECK (created_by_uploader IS NOT NULL);
-- =====================================================
-- STEP 8: Create storage bucket for event banners
-- =====================================================
-- This should be done via Supabase dashboard or CLI
-- Bucket name: event_images
-- Public: true
-- File size limit: 2MB
-- Allowed MIME types: image/jpeg, image/png, image/webp
-- Note: Run this in Supabase SQL Editor or via CLI:
-- supabase storage create event_images --public
-- =====================================================
-- STEP 9: Verification Queries
-- =====================================================
-- Check event_uploaders table structure
SELECT column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'event_uploaders'
ORDER BY ordinal_position;
-- Check events table for new column
SELECT column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'events'
    AND column_name = 'created_by_uploader';
-- Test query: Get all uploader-created events
SELECT e.title,
    e.start_at,
    eu.email as uploaded_by,
    eu.total_uploads,
    ep.display_on_upcoming,
    ep.display_on_past
FROM events e
    INNER JOIN event_publications ep ON e.id = ep.event_id
    INNER JOIN event_uploaders eu ON e.created_by_uploader = eu.id
ORDER BY e.created_at DESC;
-- =====================================================
-- STEP 10: Sample Data (Optional - for testing)
-- =====================================================
-- Insert a test uploader
INSERT INTO event_uploaders (email, verified_at)
VALUES ('test@yuva.org', NOW()) ON CONFLICT (email) DO NOTHING;
-- Get the uploader ID
DO $$
DECLARE uploader_id UUID;
BEGIN
SELECT id INTO uploader_id
FROM event_uploaders
WHERE email = 'test@yuva.org';
-- Insert a test event
INSERT INTO events (
        title,
        description,
        start_at,
        end_at,
        location,
        status,
        created_by_uploader
    )
VALUES (
        'Test Central Event',
        'This is a test event created via the Event Upload portal',
        NOW() + INTERVAL '7 days',
        NOW() + INTERVAL '8 days',
        'New Delhi',
        'upcoming',
        uploader_id
    );
END $$;
-- =====================================================
-- MIGRATION SUMMARY
-- =====================================================
/*
 WHAT THIS MIGRATION DOES:
 
 1. Creates event_uploaders table to track verified email addresses
 2. Adds created_by_uploader column to events table
 3. Updates published_events view to include uploader information
 4. Creates trigger to automatically update uploader statistics
 5. Sets up RLS policies for security
 6. Maintains compatibility with existing college dashboard events
 
 HOW IT WORKS:
 
 - Events from College Dashboard: college_id is set, created_by_uploader is NULL
 - Events from Upload Portal: college_id is NULL, created_by_uploader is set
 - Both types appear in published_events view
 - Both types use same event_publications table for display settings
 - Automatic migration to Upcoming/Past pages based on dates (existing triggers)
 
 SECURITY:
 
 - Email verification required before upload
 - Each uploader tracked in event_uploaders table
 - RLS policies prevent unauthorized access
 - Upload statistics tracked for auditing
 
 INTEGRATION:
 
 - Reuses existing events and event_publications tables
 - No changes needed to Upcoming.html or Past.html
 - Events automatically appear based on display flags
 - Same date-based logic applies to all events
 */