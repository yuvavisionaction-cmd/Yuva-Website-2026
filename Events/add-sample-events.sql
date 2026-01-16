-- =====================================================
-- ADD SAMPLE EVENTS - ONE PAST, ONE UPCOMING
-- =====================================================
-- Step 1: Insert a PAST event (ended 5 days ago)
INSERT INTO events (
        title,
        description,
        start_at,
        end_at,
        location,
        banner_url,
        status,
        created_at,
        updated_at
    )
VALUES (
        'YUVA Leadership Summit 2026',
        'A transformative leadership summit bringing together young leaders from across India to discuss innovation, social impact, and nation-building.',
        NOW() - INTERVAL '6 days',
        -- Started 6 days ago
        NOW() - INTERVAL '5 days',
        -- Ended 5 days ago (PAST EVENT)
        'India Habitat Centre, New Delhi',
        'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200',
        'completed',
        NOW(),
        NOW()
    )
RETURNING id;
-- Note the ID returned above, then use it below
-- Or run this to get the last inserted event ID:
SELECT id,
    title
FROM events
ORDER BY created_at DESC
LIMIT 1;
-- Step 2: Create publication record for the PAST event
-- Replace PAST_EVENT_ID with the ID from Step 1
INSERT INTO event_publications (
        event_id,
        display_on_past,
        display_on_upcoming,
        display_on_home,
        mode,
        capacity,
        registration_url,
        long_description,
        created_at,
        updated_at
    )
VALUES (
        (
            SELECT id
            FROM events
            WHERE title = 'YUVA Leadership Summit 2026'
        ),
        -- Auto-get the ID
        true,
        -- display_on_past = true (will show on Past page)
        false,
        -- display_on_upcoming = false
        false,
        'offline',
        500,
        'https://example.com/register',
        'The YUVA Leadership Summit 2026 was a groundbreaking event that brought together over 500 young leaders, entrepreneurs, and changemakers. The summit featured keynote speeches, panel discussions, workshops, and networking sessions focused on innovation, sustainability, and social impact.',
        NOW(),
        NOW()
    );
-- Step 3: Insert an UPCOMING event (starts in 7 days)
INSERT INTO events (
        title,
        description,
        start_at,
        end_at,
        location,
        banner_url,
        status,
        created_at,
        updated_at
    )
VALUES (
        'YUVA Tech Innovation Workshop 2026',
        'An intensive workshop on emerging technologies, AI, and digital innovation for young entrepreneurs and students.',
        NOW() + INTERVAL '7 days',
        -- Starts in 7 days
        NOW() + INTERVAL '8 days',
        -- Ends in 8 days (UPCOMING EVENT)
        'IIT Delhi Campus, New Delhi',
        'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1200',
        'scheduled',
        NOW(),
        NOW()
    )
RETURNING id;
-- Step 4: Create publication record for the UPCOMING event
INSERT INTO event_publications (
        event_id,
        display_on_past,
        display_on_upcoming,
        display_on_home,
        mode,
        capacity,
        registration_url,
        long_description,
        created_at,
        updated_at
    )
VALUES (
        (
            SELECT id
            FROM events
            WHERE title = 'YUVA Tech Innovation Workshop 2026'
        ),
        false,
        -- display_on_past = false
        true,
        -- display_on_upcoming = true (will show on Upcoming page)
        true,
        -- Also show on home page
        'hybrid',
        300,
        'https://example.com/register-tech',
        'Join us for an exciting two-day workshop exploring the latest in technology and innovation. Learn from industry experts, participate in hands-on sessions, and network with fellow tech enthusiasts. Topics include AI, Machine Learning, Blockchain, and Sustainable Tech Solutions.',
        NOW(),
        NOW()
    );
-- Step 5: Verify both events were created correctly
SELECT e.id,
    e.title,
    e.start_at,
    e.end_at,
    e.status,
    ep.display_on_past,
    ep.display_on_upcoming,
    CASE
        WHEN e.end_at < NOW() THEN '✓ PAST EVENT - Should show on Past page'
        WHEN e.end_at >= NOW() THEN '✓ UPCOMING EVENT - Should show on Upcoming page'
    END as expected_page,
    CASE
        WHEN e.end_at < NOW()
        AND ep.display_on_past = true THEN '✓ CORRECT'
        WHEN e.end_at >= NOW()
        AND ep.display_on_upcoming = true THEN '✓ CORRECT'
        ELSE '❌ WRONG FLAGS'
    END as flag_status
FROM events e
    LEFT JOIN event_publications ep ON e.id = ep.event_id
WHERE e.title IN (
        'YUVA Leadership Summit 2026',
        'YUVA Tech Innovation Workshop 2026'
    )
ORDER BY e.end_at DESC;
-- Step 6: Check what will appear on Past Events page
SELECT id,
    title,
    end_at,
    location,
    mode,
    capacity
FROM published_events
WHERE display_on_past = true
ORDER BY end_at DESC;
-- Step 7: Check what will appear on Upcoming Events page
SELECT id,
    title,
    start_at,
    location,
    mode,
    capacity
FROM published_events
WHERE display_on_upcoming = true
ORDER BY start_at ASC;
-- =====================================================
-- SUCCESS!
-- =====================================================
-- You should now have:
-- 1. "YUVA Leadership Summit 2026" on the Past Events page
-- 2. "YUVA Tech Innovation Workshop 2026" on the Upcoming Events page
--
-- Refresh your website to see them!
-- =====================================================
-- OPTIONAL: If you want to delete these test events later:
/*
 DELETE FROM event_publications 
 WHERE event_id IN (
 SELECT id FROM events 
 WHERE title IN ('YUVA Leadership Summit 2026', 'YUVA Tech Innovation Workshop 2026')
 );
 
 DELETE FROM events 
 WHERE title IN ('YUVA Leadership Summit 2026', 'YUVA Tech Innovation Workshop 2026');
 */