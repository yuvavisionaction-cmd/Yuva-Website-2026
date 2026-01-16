-- =====================================================
-- DEBUG: Why Past Events Are Not Showing
-- =====================================================
-- Run these queries ONE BY ONE to find the issue
-- Query 1: Check if your event exists and has passed
SELECT id,
    title,
    start_at,
    end_at,
    status,
    CASE
        WHEN end_at < NOW() THEN '✓ DATE HAS PASSED - Should show on Past page'
        ELSE '❌ DATE IS IN FUTURE - Will show on Upcoming page'
    END as date_status,
    NOW() as current_time
FROM events
ORDER BY end_at DESC
LIMIT 10;
-- Query 2: Check if event has a publication record
SELECT e.id as event_id,
    e.title,
    e.end_at,
    ep.id as publication_id,
    ep.display_on_past,
    ep.display_on_upcoming,
    CASE
        WHEN ep.id IS NULL THEN '❌ NO PUBLICATION RECORD - Need to create one'
        WHEN ep.display_on_past IS NULL THEN '❌ display_on_past column missing - Re-run migration'
        WHEN ep.display_on_past = false
        AND e.end_at < NOW() THEN '❌ WRONG FLAG - Should be true'
        WHEN ep.display_on_past = true THEN '✓ CORRECT - Should show on Past page'
        ELSE '⚠️ Check manually'
    END as status
FROM events e
    LEFT JOIN event_publications ep ON e.id = ep.event_id
WHERE e.end_at < NOW()
ORDER BY e.end_at DESC;
-- Query 3: Check what the published_events view returns
SELECT id,
    title,
    end_at,
    display_on_past,
    display_on_upcoming,
    CASE
        WHEN display_on_past = true THEN '✓ Will show on Past page'
        WHEN display_on_upcoming = true THEN '✓ Will show on Upcoming page'
        ELSE '❌ Will not show anywhere'
    END as visibility
FROM published_events
WHERE end_at < NOW()
ORDER BY end_at DESC;
-- Query 4: Check if display_on_past column exists
SELECT column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'event_publications'
    AND column_name IN ('display_on_past', 'display_on_upcoming');
-- =====================================================
-- FIXES BASED ON QUERY RESULTS
-- =====================================================
-- FIX 1: If event has NO publication record, create one
-- Replace YOUR_EVENT_ID with the actual event ID from Query 1
INSERT INTO event_publications (
        event_id,
        display_on_past,
        display_on_upcoming,
        mode,
        capacity,
        created_at,
        updated_at
    )
VALUES (
        YOUR_EVENT_ID,
        -- Replace this
        true,
        -- Since date has passed
        false,
        'offline',
        100,
        NOW(),
        NOW()
    ) ON CONFLICT (event_id) DO NOTHING;
-- FIX 2: If publication exists but flags are wrong, update them
UPDATE event_publications ep
SET display_on_past = true,
    display_on_upcoming = false,
    updated_at = NOW()
FROM events e
WHERE ep.event_id = e.id
    AND e.end_at < NOW()
    AND (
        ep.display_on_past = false
        OR ep.display_on_upcoming = true
    );
-- FIX 3: Run the sync function to fix all events
SELECT sync_all_event_display_flags();
-- FIX 4: Verify the fix worked
SELECT e.id,
    e.title,
    e.end_at,
    ep.display_on_past,
    ep.display_on_upcoming,
    CASE
        WHEN ep.display_on_past = true
        AND ep.display_on_upcoming = false THEN '✓ FIXED!'
        ELSE '❌ Still wrong'
    END as status
FROM events e
    JOIN event_publications ep ON e.id = ep.event_id
WHERE e.end_at < NOW()
ORDER BY e.end_at DESC;
-- =====================================================
-- FINAL CHECK: What JavaScript will fetch
-- =====================================================
-- This is exactly what your Past Events page queries
SELECT *
FROM published_events
WHERE display_on_past = true
ORDER BY end_at DESC
LIMIT 12;
-- If this returns results, your Past page should show them!
-- If not, check browser console for JavaScript errors.