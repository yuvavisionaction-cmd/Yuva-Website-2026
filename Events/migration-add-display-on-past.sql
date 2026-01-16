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
-- Step 9: Update the published_events view to include display_on_past
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