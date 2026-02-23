-- =====================================================
-- TEST EVENTS WITH EVENT_PUBLICATIONS - INSERT 5 SAMPLE EVENTS
-- =====================================================

-- Run these queries in your Supabase SQL Editor to populate test events with publications

-- =====================================================
-- STEP 1: INSERT EVENTS
-- =====================================================

-- EVENT 1: UPCOMING ONLINE WORKSHOP
INSERT INTO events (title, description, start_at, end_at, location, banner_url, status, created_at, updated_at)
VALUES (
    'Digital Marketing Workshop 2025',
    'Learn latest digital marketing strategies and tools. Perfect for beginners and intermediate learners.',
    NOW() + INTERVAL '7 days',
    NOW() + INTERVAL '7 days' + INTERVAL '2 hours',
    'Online - Zoom',
    'https://images.unsplash.com/photo-1460925895917-adf4198f3c90?w=500',
    'scheduled',
    NOW(),
    NOW()
)
ON CONFLICT DO NOTHING;

-- EVENT 2: ONGOING HYBRID SEMINAR
INSERT INTO events (title, description, start_at, end_at, location, banner_url, status, created_at, updated_at)
VALUES (
    'Youth Leadership Summit 2025',
    'Interactive seminar on developing leadership skills for young professionals. Join us online or at venue.',
    NOW() - INTERVAL '2 hours',
    NOW() + INTERVAL '3 hours',
    'New Delhi Convention Center & Virtual',
    'https://images.unsplash.com/photo-1552664730-d307ca884978?w=500',
    'ongoing',
    NOW() - INTERVAL '5 days',
    NOW()
)
ON CONFLICT DO NOTHING;

-- EVENT 3: PAST COMPLETED OFFLINE EVENT
INSERT INTO events (title, description, start_at, end_at, location, banner_url, status, created_at, updated_at)
VALUES (
    'Community Cleanup Drive - Mumbai',
    'Successfully organized environmental awareness and cleanup initiative in Mumbai with 500+ volunteers.',
    NOW() - INTERVAL '30 days',
    NOW() - INTERVAL '29 days',
    'Marine Drive, Mumbai',
    'https://images.unsplash.com/photo-1559027615-cd2628902d4a?w=500',
    'completed',
    NOW() - INTERVAL '45 days',
    NOW() - INTERVAL '28 days'
)
ON CONFLICT DO NOTHING;

-- EVENT 4: CANCELLED EVENT
INSERT INTO events (title, description, start_at, end_at, location, banner_url, status, created_at, updated_at)
VALUES (
    'Tech Conference 2025 (POSTPONED)',
    'This event has been postponed due to unforeseen circumstances. New dates will be announced soon.',
    NOW() + INTERVAL '15 days',
    NOW() + INTERVAL '17 days',
    'Bangalore Tech Park',
    'https://images.unsplash.com/photo-1552664730-d307ca884978?w=500',
    'cancelled',
    NOW() - INTERVAL '20 days',
    NOW()
)
ON CONFLICT DO NOTHING;

-- EVENT 5: UPCOMING LARGE CAPACITY OFFLINE EVENT
INSERT INTO events (title, description, start_at, end_at, location, banner_url, status, created_at, updated_at)
VALUES (
    'YUVA India Annual Conference 2025',
    'Join us for the biggest youth empowerment conference of the year. Speakers, workshops, and networking opportunities.',
    NOW() + INTERVAL '60 days',
    NOW() + INTERVAL '62 days',
    'India Habitat Centre, New Delhi',
    'https://images.unsplash.com/photo-1540575467063-178f50002c4b?w=500',
    'scheduled',
    NOW() - INTERVAL '10 days',
    NOW()
)
ON CONFLICT DO NOTHING;

-- =====================================================
-- STEP 2: INSERT EVENT PUBLICATIONS WITH CAPACITY
-- =====================================================

-- Publication 1: Online Workshop - 100 capacity
INSERT INTO event_publications (event_id, mode, capacity, registration_url, display_on_upcoming, display_on_past, created_at, updated_at)
SELECT id, 'online', 100, 'https://form.example.com/workshop', true, false, NOW(), NOW()
FROM events 
WHERE title = 'Digital Marketing Workshop 2025'
ON CONFLICT DO NOTHING;

-- Publication 2: Hybrid Seminar - 250 capacity
INSERT INTO event_publications (event_id, mode, capacity, registration_url, display_on_upcoming, display_on_past, created_at, updated_at)
SELECT id, 'hybrid', 250, 'https://form.example.com/summit', true, false, NOW(), NOW()
FROM events 
WHERE title = 'Youth Leadership Summit 2025'
ON CONFLICT DO NOTHING;

-- Publication 3: Past Offline Event - 500 capacity
INSERT INTO event_publications (event_id, mode, capacity, registration_url, display_on_upcoming, display_on_past, created_at, updated_at)
SELECT id, 'offline', 500, 'https://form.example.com/cleanup', false, true, NOW(), NOW()
FROM events 
WHERE title = 'Community Cleanup Drive - Mumbai'
ON CONFLICT DO NOTHING;

-- Publication 4: Cancelled Event - 1000 capacity
INSERT INTO event_publications (event_id, mode, capacity, registration_url, display_on_upcoming, display_on_past, created_at, updated_at)
SELECT id, 'offline', 1000, 'https://form.example.com/tech', false, false, NOW(), NOW()
FROM events 
WHERE title = 'Tech Conference 2025 (POSTPONED)'
ON CONFLICT DO NOTHING;

-- Publication 5: Large Annual Conference - 5000 capacity
INSERT INTO event_publications (event_id, mode, capacity, registration_url, display_on_upcoming, display_on_past, created_at, updated_at)
SELECT id, 'offline', 5000, 'https://form.example.com/conference', true, false, NOW(), NOW()
FROM events 
WHERE title = 'YUVA India Annual Conference 2025'
ON CONFLICT DO NOTHING;

-- =====================================================
-- STEP 3: VERIFY INSERTED EVENTS & PUBLICATIONS
-- =====================================================

-- View all events with their publications
SELECT 
    e.id,
    e.title,
    TO_CHAR(e.start_at, 'DD-MM-YYYY HH24:MI') as start_datetime,
    TO_CHAR(e.end_at, 'DD-MM-YYYY HH24:MI') as end_datetime,
    e.location,
    e.status,
    ep.mode,
    ep.capacity,
    ep.display_on_upcoming,
    ep.display_on_past,
    CASE 
        WHEN e.end_at < NOW() THEN 'Past'
        WHEN e.start_at <= NOW() AND e.end_at >= NOW() THEN 'Ongoing'
        WHEN e.start_at > NOW() THEN 'Upcoming'
    END as calculated_status
FROM events e
LEFT JOIN event_publications ep ON e.id = ep.event_id
WHERE e.title IN (
    'Digital Marketing Workshop 2025',
    'Youth Leadership Summit 2025',
    'Community Cleanup Drive - Mumbai',
    'Tech Conference 2025 (POSTPONED)',
    'YUVA India Annual Conference 2025'
)
ORDER BY e.start_at DESC;

-- =====================================================
-- CAPACITY BY EVENT
-- =====================================================
/*
EVENT 1: Digital Marketing Workshop 2025 → 100 capacity (online)
EVENT 2: Youth Leadership Summit 2025 → 250 capacity (hybrid)
EVENT 3: Community Cleanup Drive - Mumbai → 500 capacity (offline)
EVENT 4: Tech Conference 2025 (POSTPONED) → 1000 capacity (offline, cancelled)
EVENT 5: YUVA India Annual Conference 2025 → 5000 capacity (offline)
*/

-- =====================================================
-- ADDITIONAL HELPER QUERIES
-- =====================================================

-- Get all events with capacity from event_publications
-- SELECT e.title, ep.mode, ep.capacity FROM events e LEFT JOIN event_publications ep ON e.id = ep.event_id;

-- Get events by mode (online, offline, hybrid)
-- SELECT e.title, ep.mode, ep.capacity FROM events e JOIN event_publications ep ON e.id = ep.event_id WHERE ep.mode = 'online';

-- Get high capacity events (over 1000)
-- SELECT e.title, ep.capacity FROM events e JOIN event_publications ep ON e.id = ep.event_id WHERE ep.capacity > 1000;

-- Get upcoming events displayed on upcoming page
-- SELECT e.title, ep.capacity FROM events e JOIN event_publications ep ON e.id = ep.event_id WHERE ep.display_on_upcoming = true AND e.start_at > NOW();

-- Count events by mode
-- SELECT mode, COUNT(*) as count FROM event_publications GROUP BY mode;

-- Delete test events (if needed)
-- DELETE FROM event_publications WHERE event_id IN (SELECT id FROM events WHERE title IN ('Digital Marketing Workshop 2025', 'Youth Leadership Summit 2025', 'Community Cleanup Drive - Mumbai', 'Tech Conference 2025 (POSTPONED)', 'YUVA India Annual Conference 2025'));
-- DELETE FROM events WHERE title IN ('Digital Marketing Workshop 2025', 'Youth Leadership Summit 2025', 'Community Cleanup Drive - Mumbai', 'Tech Conference 2025 (POSTPONED)', 'YUVA India Annual Conference 2025');
