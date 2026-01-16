# YUVA Events - display_on_past Implementation Summary

## 📋 What Was Done

### 1. Database Changes (Run migration-add-display-on-past.sql)

**New Column Added:**
- `display_on_past` BOOLEAN column in `event_publications` table

**Automatic Triggers Created:**
- ✅ When inserting/updating `event_publications`: Automatically sets flags based on event dates
- ✅ When updating `events.end_at`: Automatically updates publication flags
- ✅ Keeps `display_on_past` and `display_on_upcoming` mutually exclusive

**Logic:**
```
IF event.end_at < NOW():
    display_on_past = TRUE
    display_on_upcoming = FALSE
ELSE:
    display_on_past = FALSE
    display_on_upcoming = TRUE
```

### 2. JavaScript Changes (Already Updated)

**Updated Files:**
- `event.js` - PastEventsPage.fetchEvents()
- `event.js` - PastEventsPage.loadMoreEvents()

**Changes:**
```javascript
// OLD (date-based filtering)
.eq('display_on_upcoming', true)
.lt('end_at', now)

// NEW (column-based filtering)
.eq('display_on_past', true)
```

### 3. View Updated

**published_events view** now includes:
- `display_on_past` column
- `display_on_upcoming` column

---

## 🚀 How to Deploy

### Step 1: Run the SQL Migration

1. Open Supabase SQL Editor
2. Copy and paste the entire content of `migration-add-display-on-past.sql`
3. Click "Run"

This will:
- ✅ Add `display_on_past` column
- ✅ Create all triggers
- ✅ Initialize existing records with correct flags
- ✅ Update the `published_events` view

### Step 2: Verify the Migration

Run this query to check:
```sql
SELECT 
    e.id,
    e.title,
    e.end_at,
    ep.display_on_upcoming,
    ep.display_on_past,
    CASE 
        WHEN e.end_at < NOW() THEN 'Should be on PAST page'
        ELSE 'Should be on UPCOMING page'
    END as expected_location
FROM events e
LEFT JOIN event_publications ep ON e.id = ep.event_id
ORDER BY e.end_at DESC;
```

Expected results:
- Past events: `display_on_past = true`, `display_on_upcoming = false`
- Upcoming events: `display_on_past = false`, `display_on_upcoming = true`

### Step 3: Test the Website

1. Open Past Events page (`Past.html`)
2. You should see all events where `end_at < current_time`
3. Open Upcoming Events page (`Upcoming.html`)
4. You should see all events where `end_at >= current_time`

---

## 🔄 How It Works Now

### Automatic Event Migration

**When an event is created:**
```sql
INSERT INTO events (..., end_at) VALUES (..., '2026-02-01');
INSERT INTO event_publications (event_id) VALUES (1);
-- Trigger automatically sets: display_on_past = false, display_on_upcoming = true
```

**When the event date passes:**
- The flags stay as they are until:
  - Someone updates the event
  - You run the sync function manually
  - OR you set up a cron job (optional)

**Manual sync (if needed):**
```sql
SELECT sync_all_event_display_flags();
```

**When event date is updated:**
```sql
UPDATE events SET end_at = '2026-01-10' WHERE id = 1;
-- Trigger automatically updates: display_on_past = true, display_on_upcoming = false
```

---

## 📊 Benefits

### Before (Date-based filtering)
```javascript
.eq('display_on_upcoming', true)
.lt('end_at', now)  // Calculated every query
```
❌ Confusing logic (display_on_upcoming=true for past events?)
❌ Date comparison on every query
❌ Inconsistent naming

### After (Column-based filtering)
```javascript
.eq('display_on_past', true)  // Simple boolean check
```
✅ Clear, explicit column names
✅ Faster queries (indexed boolean)
✅ Consistent logic
✅ Database manages the logic automatically

---

## 🛠️ Maintenance

### If Events Don't Appear Correctly

**Option 1: Manual Sync (Quick Fix)**
```sql
SELECT sync_all_event_display_flags();
```

**Option 2: Check Individual Event**
```sql
SELECT 
    e.title,
    e.end_at,
    ep.display_on_past,
    ep.display_on_upcoming
FROM events e
JOIN event_publications ep ON e.id = ep.event_id
WHERE e.id = YOUR_EVENT_ID;
```

**Option 3: Fix Specific Event**
```sql
UPDATE event_publications
SET 
    display_on_past = (SELECT end_at < NOW() FROM events WHERE id = event_id),
    display_on_upcoming = (SELECT end_at >= NOW() FROM events WHERE id = event_id)
WHERE event_id = YOUR_EVENT_ID;
```

### Optional: Set Up Daily Sync (Cron Job)

You can set up a Supabase cron job to run daily:
```sql
-- This would run daily at midnight
SELECT sync_all_event_display_flags();
```

---

## 📝 Updated Table Structure

```sql
event_publications:
├── id
├── event_id
├── college_id
├── display_on_home       (boolean)
├── display_on_upcoming   (boolean) ← Managed by triggers
├── display_on_past       (boolean) ← NEW! Managed by triggers
├── mode
├── capacity
├── registration_url
├── long_description
├── speakers
├── published_by
├── created_at
├── updated_at
└── category_id
```

---

## ✅ Checklist

- [ ] Run `migration-add-display-on-past.sql` in Supabase
- [ ] Verify all existing events have correct flags
- [ ] Test Past Events page - should show past events
- [ ] Test Upcoming Events page - should show upcoming events
- [ ] Verify automatic migration when event date passes
- [ ] (Optional) Set up daily sync cron job

---

## 🎉 Result

Your events will now automatically appear on the correct page based on their `end_at` date, with clear, explicit column names and database-managed logic!
