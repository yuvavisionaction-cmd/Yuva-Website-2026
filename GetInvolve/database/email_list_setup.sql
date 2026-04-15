-- ===== EMAIL MANAGEMENT SYSTEM =====
-- This file contains tables for email list management and broadcast tracking

-- ===== 1. EMAIL_LIST TABLE =====
-- Store all email addresses for broadcasting
CREATE TABLE IF NOT EXISTS email_list (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    email_lower VARCHAR(255) UNIQUE NOT NULL,
    email_type VARCHAR(50) DEFAULT 'student', -- student|teacher|alumni|volunteer
    name VARCHAR(255),
    college_id INTEGER REFERENCES colleges(id) ON DELETE SET NULL,
    zone_id INTEGER REFERENCES zones(id),
    is_active BOOLEAN DEFAULT true,
    subscription_status VARCHAR(30) DEFAULT 'subscribed', -- subscribed|unsubscribed|bounced
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_email_list_email_lower ON email_list(email_lower);
CREATE INDEX IF NOT EXISTS idx_email_list_email_type ON email_list(email_type);
CREATE INDEX IF NOT EXISTS idx_email_list_is_active ON email_list(is_active);
CREATE INDEX IF NOT EXISTS idx_email_list_subscription ON email_list(subscription_status);

-- Add trigger to normalize email to lowercase
CREATE OR REPLACE FUNCTION normalize_email_list_email()
RETURNS TRIGGER AS $$
BEGIN
    NEW.email_lower := lower(trim(NEW.email));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_normalize_email_list_email_ins ON email_list;
DROP TRIGGER IF EXISTS trg_normalize_email_list_email_upd ON email_list;

CREATE TRIGGER trg_normalize_email_list_email_ins
BEFORE INSERT ON email_list
FOR EACH ROW EXECUTE FUNCTION normalize_email_list_email();

CREATE TRIGGER trg_normalize_email_list_email_upd
BEFORE UPDATE OF email ON email_list
FOR EACH ROW EXECUTE FUNCTION normalize_email_list_email();

-- ===== 2. EMAIL_BROADCASTS TABLE =====
-- Track email broadcasts and their performance
CREATE TABLE IF NOT EXISTS email_broadcasts (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    message_html TEXT,
    audience_type VARCHAR(50) NOT NULL, -- all|students|teachers|alumni|volunteers|custom
    recipient_count INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    status VARCHAR(30) DEFAULT 'draft', -- draft|scheduled|sending|sent|failed|cancelled
    scheduled_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_by INTEGER REFERENCES admin_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_broadcasts_status ON email_broadcasts(status);
CREATE INDEX IF NOT EXISTS idx_broadcasts_created_by ON email_broadcasts(created_by);
CREATE INDEX IF NOT EXISTS idx_broadcasts_created_at ON email_broadcasts(created_at DESC);

-- ===== 3. EMAIL_BROADCAST_RECIPIENTS TABLE =====
-- Track which emails were sent in each broadcast
CREATE TABLE IF NOT EXISTS email_broadcast_recipients (
    id SERIAL PRIMARY KEY,
    broadcast_id INTEGER REFERENCES email_broadcasts(id) ON DELETE CASCADE,
    email_id INTEGER REFERENCES email_list(id) ON DELETE CASCADE,
    recipient_email VARCHAR(255) NOT NULL,
    status VARCHAR(30) DEFAULT 'pending', -- pending|sent|failed|bounced|opened|clicked
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_broadcast_id ON email_broadcast_recipients(broadcast_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_email_id ON email_broadcast_recipients(email_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_status ON email_broadcast_recipients(status);
CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_sent_at ON email_broadcast_recipients(sent_at);

-- ===== 4. ROW LEVEL SECURITY =====
ALTER TABLE email_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_broadcast_recipients ENABLE ROW LEVEL SECURITY;

-- Allow super admins to read all emails
CREATE POLICY "Super admins read all emails" ON email_list
    FOR SELECT USING (true);

-- Allow super admins to manage broadcasts
CREATE POLICY "Super admins manage broadcasts" ON email_broadcasts
    FOR ALL USING (true);

-- Allow super admins to view broadcast recipients
CREATE POLICY "Super admins view recipients" ON email_broadcast_recipients
    FOR SELECT USING (true);

-- ===== 5. INITIAL DATA (OPTIONAL) =====
-- You can uncomment this if you want to add sample email
-- INSERT INTO email_list (email, email_lower, email_type, name, is_active, subscription_status, verified)
-- VALUES ('test@example.com', 'test@example.com', 'student', 'Test User', true, 'subscribed', true)
-- ON CONFLICT (email_lower) DO NOTHING;
