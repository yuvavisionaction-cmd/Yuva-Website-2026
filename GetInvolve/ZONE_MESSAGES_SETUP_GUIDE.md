# Zone Convener Messages System - Setup Guide

## Overview
The Contact Super Admin feature has been refactored to save messages in a Supabase database table and display them in the Advanced Admin dashboard.

## Setup Steps

### 1. Create Database Table
Run the SQL script in your Supabase SQL Editor:
- File: `database/zone_convener_messages.sql`
- This creates the `zone_convener_messages` table with proper indexes and RLS policies

### 2. Deploy Updated Backend
1. Open Google Apps Script Editor
2. Copy the updated `code.gs` file
3. Deploy new version:
   - Click **Deploy** → **Manage deployments**
   - Edit active deployment → **New version**
   - Description: "Added database storage for zone messages"
   - Click **Deploy**

### 3. Test the System

#### As Zone Convener:
1. Login to Unit Registration Dashboard
2. Select a zone
3. Click **Contact Super Admin** button
4. Fill in:
   - Subject (required)
   - Category (Technical Issue, Policy Question, Resource Request, Other)
   - Message (required)
5. Submit
6. Message is saved to database AND email notification sent to all Super Admins

#### As Super Admin:
1. Login and go to Advanced Admin page
2. Click **Zone Messages** in sidebar
3. View all messages with filters:
   - All Status / Unread / Read / Resolved
4. Actions available:
   - Mark as Read (for unread messages)
   - Mark as Resolved (for read messages)
   - Reopen (for resolved messages)
   - Reply via Email (opens email client)

## Database Schema

### Table: `zone_convener_messages`
```sql
- id (serial, primary key)
- sender_name (varchar 100)
- sender_email (varchar 100)
- sender_role (varchar 50)
- zone_id (integer, FK to zones)
- zone_name (varchar 100)
- subject (varchar 255)
- category (varchar 50: technical, policy, resources, other)
- message (text)
- status (varchar 20: unread, read, resolved)
- priority (varchar 20: low, normal, high)
- admin_notes (text)
- resolved_by (integer, FK to admin_users)
- created_at (timestamp)
- updated_at (timestamp)
```

## Features

### Zone Convener Side:
- Send messages from dashboard
- Automatic zone information capture
- Email and database storage
- Form validation

### Super Admin Side:
- View all messages in one place
- Filter by status (unread/read/resolved)
- Color-coded status indicators
- Category badges
- Mark messages as read/resolved
- Reply via email
- Message timestamps

### Email Notifications:
- Super Admins receive email when new message arrives
- Branded YUVA email template
- Includes all sender details
- Reply-to functionality
- Link to dashboard to view message

## Color Coding

### Status Colors:
- **Unread**: Orange (#FF9933)
- **Read**: Blue (#000080)
- **Resolved**: Green (#138808)

### Category Colors:
- **Technical Issue**: Orange (#E67300)
- **Policy Question**: Blue (#000080)
- **Resource Request**: Saffron (#FF9933)
- **Other**: Gray (#64748B)

## API Endpoints

### Backend (Google Apps Script):
```
POST ${GAS_WEB_APP_URL}?action=notify&method=contactSuperAdmin
Parameters:
  - senderName
  - senderEmail
  - senderRole
  - zoneName
  - zoneId
  - subject
  - category
  - message
```

### Frontend (Supabase Direct):
```javascript
// Load messages
supabaseClient
  .from('zone_convener_messages')
  .select('*')
  .order('created_at', { ascending: false })

// Update status
supabaseClient
  .from('zone_convener_messages')
  .update({ status: 'read' })
  .eq('id', messageId)
```

## Troubleshooting

### Messages not saving:
1. Check if table exists in Supabase
2. Verify RLS policies are enabled
3. Check browser console for errors
4. Ensure Google Apps Script is deployed with latest version

### Super Admin can't see messages:
1. Verify user has `super_admin` role in `admin_users` table
2. Check RLS policy allows super_admin access
3. Refresh the page

### Email not sending:
1. Verify Gmail permissions in Google Apps Script
2. Check if super admin emails exist in database
3. Email failure doesn't block message saving (by design)

## Future Enhancements

Possible additions:
- [ ] Admin notes field (reply without email)
- [ ] Priority levels (low, normal, high)
- [ ] Attachment support
- [ ] Message threading
- [ ] Push notifications
- [ ] Search/filter by zone or sender
- [ ] Export messages to CSV
- [ ] Message analytics dashboard

## Files Modified

1. `database/zone_convener_messages.sql` - New table schema
2. `code.gs` - Backend handler updated
3. `unit.js` - Frontend zone_id added
4. `AdvancedAdmin.html` - Messages view added
5. `AdvancedAdmin.js` - Message loading functions added

## Notes

- Messages are stored permanently in database
- Email notifications are optional (won't fail if email error)
- Super Admins can view message history indefinitely
- Zone Conveners cannot view their sent messages (could be added)
- RLS policies ensure proper access control
